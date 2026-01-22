'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'

const CONSENT_STORAGE_KEY = 'cookie_consent'

function getStoredConsent(): 'accepted' | 'declined' | 'undecided' {
    if (typeof window === 'undefined') return 'undecided'
    try {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
        if (stored === 'accepted' || stored === 'declined') return stored
    } catch {
        // localStorage not available
    }
    return 'undecided'
}

// Internal component that identifies user - only rendered after PostHog loads
function PostHogIdentify({ posthog }: { posthog: any }) {
    const { user, isLoaded } = useUser()

    useEffect(() => {
        if (isLoaded && user && posthog) {
            const robloxAccount = user.externalAccounts.find((a: any) =>
                a.provider.includes('roblox')
            ) as any
            const discordAccount = user.externalAccounts.find((a: any) =>
                a.provider.includes('discord')
            ) as any

            posthog.identify(user.id, {
                name: user.fullName || user.username,
                username: user.username,
                email: user.primaryEmailAddress?.emailAddress,
                image: user.imageUrl,
                roblox_id: robloxAccount?.externalId,
                roblox_username: robloxAccount?.username,
                discord_id: discordAccount?.externalId,
                discord_username: discordAccount?.username,
            })
        } else if (isLoaded && !user && posthog) {
            posthog.reset()
        }
    }, [isLoaded, user, posthog])

    return null
}

// Wrapper that only renders after PostHog is loaded
function PostHogWrapper({ children, posthogInstance }: { children: ReactNode, posthogInstance: any }) {
    const [PHProvider, setPHProvider] = useState<any>(null)

    useEffect(() => {
        // Dynamically import the react provider only after we have PostHog
        import('@posthog/react').then((mod) => {
            setPHProvider(() => mod.PostHogProvider)
        })
    }, [])

    if (!PHProvider) {
        return <>{children}</>
    }

    return (
        <PHProvider client={posthogInstance}>
            <PostHogIdentify posthog={posthogInstance} />
            {children}
        </PHProvider>
    )
}

export function PostHogProvider({ children }: { children: ReactNode }) {
    const [posthogInstance, setPosthogInstance] = useState<any>(null)
    const hasInitialized = useRef(false)

    useEffect(() => {
        const initPostHog = async () => {
            if (hasInitialized.current) return

            const consent = getStoredConsent()
            hasInitialized.current = true

            // DYNAMICALLY IMPORT posthog-js - it won't load until this runs
            const posthog = (await import('posthog-js')).default

            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                defaults: '2025-11-30',
                persistence: consent === 'accepted' ? 'localStorage+cookie' : 'memory',
                autocapture: true,
                capture_pageview: true,
                capture_pageleave: true,
            })

            setPosthogInstance(posthog)
        }

        initPostHog()

        // Listen for consent changes
        const handleConsentChange = async (event: CustomEvent<'accepted' | 'declined'>) => {
            const posthog = (await import('posthog-js')).default
            
            if (event.detail === 'accepted') {
                posthog.set_config({ persistence: 'localStorage+cookie' })
                posthog.capture('cookie_consent_accepted')
            } else if (event.detail === 'declined') {
                posthog.set_config({ persistence: 'memory' })
                posthog.capture('cookie_consent_declined')
            }
        }

        window.addEventListener('cookieConsentChange', handleConsentChange as unknown as EventListener)

        return () => {
            window.removeEventListener('cookieConsentChange', handleConsentChange as unknown as EventListener)
        }
    }, [])

    // If PostHog is loaded, use the wrapper with provider
    if (posthogInstance) {
        return (
            <PostHogWrapper posthogInstance={posthogInstance}>
                {children}
            </PostHogWrapper>
        )
    }

    // NO POSTHOG AT ALL - not even imported
    return <>{children}</>
}

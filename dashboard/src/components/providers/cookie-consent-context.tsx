'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

type ConsentState = 'accepted' | 'declined' | 'undecided'

interface CookieConsentContextType {
    consentState: ConsentState
    hasConsented: boolean
    hasDeclined: boolean
    isUndecided: boolean
    acceptCookies: () => void
    declineCookies: () => void
    resetConsent: () => void
    showBanner: boolean
    setShowBanner: (show: boolean) => void
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

const CONSENT_STORAGE_KEY = 'cookie_consent'

export function CookieConsentProvider({ children }: { children: ReactNode }) {
    const [consentState, setConsentState] = useState<ConsentState>('undecided')
    const [showBanner, setShowBanner] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load consent state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
        if (stored === 'accepted' || stored === 'declined') {
            setConsentState(stored)
            setShowBanner(false)
        } else {
            setConsentState('undecided')
            setShowBanner(true)
        }
        setIsLoaded(true)
    }, [])

    const acceptCookies = useCallback(() => {
        localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted')
        setConsentState('accepted')
        setShowBanner(false)

        // Dispatch custom event so PostHog provider can react
        window.dispatchEvent(new CustomEvent('cookieConsentChange', { detail: 'accepted' }))
    }, [])

    const declineCookies = useCallback(() => {
        localStorage.setItem(CONSENT_STORAGE_KEY, 'declined')
        setConsentState('declined')
        setShowBanner(false)

        // Dispatch custom event so PostHog provider can react
        window.dispatchEvent(new CustomEvent('cookieConsentChange', { detail: 'declined' }))
    }, [])

    const resetConsent = useCallback(() => {
        localStorage.removeItem(CONSENT_STORAGE_KEY)
        setConsentState('undecided')
        setShowBanner(true)
    }, [])

    // Computed properties
    const hasConsented = consentState === 'accepted'
    const hasDeclined = consentState === 'declined'
    const isUndecided = consentState === 'undecided'

    const value = {
        consentState,
        hasConsented,
        hasDeclined,
        isUndecided,
        acceptCookies,
        declineCookies,
        resetConsent,
        showBanner: isLoaded && showBanner,
        setShowBanner,
    }

    return (
        <CookieConsentContext.Provider value={value}>
            {children}
        </CookieConsentContext.Provider>
    )
}

export function useCookieConsent() {
    const context = useContext(CookieConsentContext)
    if (context === undefined) {
        throw new Error('useCookieConsent must be used within a CookieConsentProvider')
    }
    return context
}

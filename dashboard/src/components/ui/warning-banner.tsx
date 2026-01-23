"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { usePostHog } from '@posthog/react'

export function WarningBanner() {
    const posthog = usePostHog()
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!posthog) return

        const updateState = () => {
            const enabled = posthog.isFeatureEnabled('warning-banner')
            const payload = posthog.getFeatureFlagPayload('warning-banner')

            if (enabled && payload) {
                const msg = typeof payload === 'string' 
                    ? payload 
                    : (payload as any)?.message || JSON.stringify(payload)
                setMessage(msg)
            } else {
                setMessage(null)
            }
        }

        updateState()
        // Subscribe to feature flag updates
        posthog.onFeatureFlags(updateState)
    }, [posthog])

    if (!message) return null

    return (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-500">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                <span>{message}</span>
            </div>
        </div>
    )
}
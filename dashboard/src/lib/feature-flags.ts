import PostHogClient from '@/lib/posthog'
import { cache } from 'react'

/**
 * PostHog Feature Flags for subscription features
 * These act as kill switches / gradual rollout controls
 */

// Feature flag names - create these in PostHog dashboard
export const FEATURE_FLAGS = {
    // Master switches for subscription features
    SUBSCRIPTIONS_ENABLED: 'subscriptions-enabled',        // Master switch for all subscription features
    SERVER_CREATION: 'server-creation',                    // Enable/disable server creation for everyone

    // Server features
    FORMS_LIMIT_CHECK: 'forms-limit-check',                // Enable form limit enforcement
    AUTOMATIONS_LIMIT_CHECK: 'automations-limit-check',    // Enable automation limit enforcement
    RAID_DETECTION: 'raid-detection',                      // Enable raid detection feature
    RAID_AUTO_ACTIONS: 'raid-auto-actions',                // Enable auto kick/ban for raids
    EXPORTS: 'exports',                                    // Enable CSV exports
    WHITE_LABEL_BOT: 'white-label-bot',                    // Enable white-label bot feature

    // User features
    VISION_ACCESS: 'vision-access',                        // Enable Vision app access
    CUSTOM_THEMES: 'custom-themes',                        // Enable custom dashboard themes
    PERSONAL_NOTES: 'personal-notes',                      // Enable personal player notes
    EXTENDED_HISTORY: 'extended-history',                  // Enable extended personal history

    // Pricing page
    PRICING_PAGE: 'pricing-page',                          // Show pricing page
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Check if a feature flag is enabled (server-side)
 * Uses React cache() for request deduplication
 */
export const isFeatureEnabled = cache(async (
    flag: FeatureFlag,
    userId?: string
): Promise<boolean> => {
    const posthog = PostHogClient()
    try {
        const flagKey = FEATURE_FLAGS[flag]
        const enabled = await posthog.isFeatureEnabled(flagKey, userId || 'anonymous')
        return enabled === true
    } catch (e) {
        console.error(`[Feature Flag] Error checking ${flag}:`, e)
        // Default to true for feature flags (fail open)
        // This means features work even if PostHog is down
        return true
    }
})

/**
 * Check if subscriptions system is enabled globally
 */
export async function isSubscriptionsEnabled(): Promise<boolean> {
    return isFeatureEnabled('SUBSCRIPTIONS_ENABLED')
}

/**
 * Get all subscription-related feature flags at once
 */
export const getSubscriptionFlags = cache(async (userId?: string): Promise<Record<string, boolean>> => {
    const posthog = PostHogClient()
    try {
        const allFlags = await posthog.getAllFlags(userId || 'anonymous')

        // Filter to only subscription-related flags
        const subscriptionFlags: Record<string, boolean> = {}
        for (const [key, flagName] of Object.entries(FEATURE_FLAGS)) {
            subscriptionFlags[key] = allFlags[flagName] === true
        }

        return subscriptionFlags
    } catch (e) {
        console.error('[Feature Flags] Error getting all flags:', e)
        // Return all true on error (fail open)
        return Object.fromEntries(
            Object.keys(FEATURE_FLAGS).map(key => [key, true])
        )
    }
})

import { NextResponse } from 'next/server'
import { PostHog } from 'posthog-node'

// Server-side PostHog client for feature flags
// This works WITHOUT cookies - checks flag directly with PostHog API
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
})

// Force dynamic - no caching
export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Check the maintenance flag for a generic user
        // Using a fixed ID since maintenance affects everyone
        const maintenance = await posthog.isFeatureEnabled('maintenance', 'maintenance-check')

        // Return with cache-control headers to prevent browser caching
        return NextResponse.json(
            { maintenance: maintenance === true },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        )
    } catch (error) {
        console.error('[Maintenance Check] Error:', error)
        // If there's an error, assume NOT in maintenance (fail open)
        return NextResponse.json(
            { maintenance: false },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                },
            }
        )
    }
}

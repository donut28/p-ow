import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export default function PostHogClient() {
    if (!posthogClient) {
        posthogClient = new PostHog(
            process.env.NEXT_PUBLIC_POSTHOG_KEY!,
            {
                host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                // Flush immediately to ensure data is available for the status dashboard.
                // This eliminates batching delays.
                flushAt: 1,
                flushInterval: 0
            }
        )
    }
    return posthogClient
}



import { auth, currentUser } from "@clerk/nextjs/server"

// Timeout wrapper to prevent Clerk outages from hanging all requests
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms)
    })
    try {
        const result = await Promise.race([promise, timeoutPromise])
        clearTimeout(timeoutId!)
        return result
    } catch {
        clearTimeout(timeoutId!)
        return null
    }
}

// Helper to get consistent user object, similar to what we had
// Also enforces Discord and Roblox connection if needed
export async function getSession() {
    const user = await withTimeout(currentUser(), 5000)
    if (!user) return null

    // Find discord account (cast to string to handle Clerk's strict types)
    const discordAccount = user.externalAccounts.find(a => {
        const provider = a.provider as string
        return provider === "discord" || provider === "oauth_discord"
    })

    // Find roblox account (Clerk uses oauth_custom_roblox for custom OAuth providers)
    const robloxAccount = user.externalAccounts.find(a => {
        const provider = a.provider as string
        return provider === "roblox" || provider === "oauth_roblox" || provider === "oauth_custom_roblox"
    })

    return {
        user: {
            id: user.id,
            username: user.username,
            name: (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) || user.username,
            image: user.imageUrl,
            discordId: discordAccount?.externalId,
            // Roblox data
            robloxId: robloxAccount?.externalId,
            robloxUsername: robloxAccount?.username,
            robloxAvatar: robloxAccount?.imageUrl
        }
    }
}

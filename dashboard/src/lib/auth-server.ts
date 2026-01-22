
import { SessionUser } from "@/lib/admin"

export type ConnectionVerificationResult = {
    valid: boolean
    missing: string[]
    discordUsername?: string | null
    robloxUsername?: string | null
}

/**
 * Checks if the user has verified both Discord and Roblox connections.
 * This is for server-side enforcement to prevent data leaks.
 */
export function checkConnectionRequirements(user: SessionUser | null): ConnectionVerificationResult {
    if (!user) {
        return { valid: false, missing: ["Discord", "Roblox"] }
    }

    const missing: string[] = []

    if (!user.discordId) missing.push("Discord")
    if (!user.robloxId) missing.push("Roblox")

    // Note: session user object doesn't strictly have 'discordUsername' field at top level in some types,
    // but the getSession helper populates `name` or `username`.
    // However, the `getSession` helper implementation (auth-clerk.ts) returns a specific structure.
    // Let's rely on what's available in SessionUser interface from lib/admin.ts which might need updating or we rely on getSession structure.
    // Actually, getSession returns { user: { ... } }.
    // We'll pass the usernames if available for the UI.

    return {
        valid: missing.length === 0,
        missing,
        // Using robloxUsername from session if available
        robloxUsername: user.robloxUsername,
        // Discord username isn't explicitly in SessionUser type in admin.ts but might be in the actual object.
        // We'll leave it undefined for now or rely on the UI to handle it.
        discordUsername: null
    }
}

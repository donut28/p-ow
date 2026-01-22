import { prisma } from "./db"
import { headers } from "next/headers"

export interface PublicAuthResult {
    valid: boolean
    apiKey?: any
    error?: string
    status?: number
}

/**
 * Validates the API key from the Authorization header.
 * Usage: Authorization: Bearer <key>
 */
export async function validatePublicApiKey(): Promise<PublicAuthResult> {
    const head = await headers()
    const authHeader = head.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { valid: false, error: "Missing or invalid Authorization header", status: 401 }
    }

    const key = authHeader.replace("Bearer ", "").trim()

    const apiKey = await prisma.apiKey.findUnique({
        where: { key }
    })

    if (!apiKey || !apiKey.enabled) {
        return { valid: false, error: "Invalid or disabled API key", status: 401 }
    }

    // --- RATE LIMITING & QUOTAS ---
    const now = new Date()

    // 1. Frequency Check (rateLimit in seconds)
    if (apiKey.lastUsed) {
        const secondsSinceLast = (now.getTime() - new Date(apiKey.lastUsed).getTime()) / 1000
        if (secondsSinceLast < apiKey.rateLimit) {
            return { valid: false, error: `Rate limit exceeded. Wait ${Math.ceil(apiKey.rateLimit - secondsSinceLast)}s.`, status: 429 }
        }
    }

    // 2. Daily Quota Check
    let usageCount = apiKey.usageCount
    let resetAt = new Date(apiKey.resetAt)

    // Reset usage if 24h passed
    if (now > resetAt) {
        usageCount = 0
        resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }

    if (usageCount >= apiKey.dailyLimit) {
        return { valid: false, error: "Daily request quota exceeded.", status: 429 }
    }

    // Update state
    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
            lastUsed: now,
            usageCount: usageCount + 1,
            resetAt: resetAt
        }
    }).catch(() => { })

    return { valid: true, apiKey }
}

/**
 * Finds a server by its name or custom display name.
 */
export async function findServerByName(name: string) {
    if (!name) return null

    // Search by both internal name and custom name (case-insensitive if possible, though SQLite is tricky)
    // We'll do a simple findFirst with multiple conditions
    return await prisma.server.findFirst({
        where: {
            OR: [
                { name: { equals: name } },
                { customName: { equals: name } },
                // Case-insensitive fallbacks
                { name: { contains: name } },
                { customName: { contains: name } }
            ]
        }
    })
}

/**
 * Logs an API access event for security auditing.
 */
export async function logApiAccess(apiKey: any, event: string, details?: string) {
    const head = await headers()
    const ip = head.get("x-forwarded-for") || "unknown"

    await prisma.securityLog.create({
        data: {
            event,
            ip,
            details: details || `Key: ${apiKey.name} (${apiKey.id})`
        }
    }).catch(() => { })
}

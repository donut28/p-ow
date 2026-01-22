
import { prisma } from "./db"
import { NextResponse } from "next/server"

// Configuration
const MAX_REQUESTS_PER_MINUTE = 200
const BAN_REASON = "Automated anti-scraping: excessive requests per minute."

// Memory persistence using globalThis
const globalForSecurity = globalThis as unknown as {
    ipCounters: Map<string, { count: number, resetAt: number }> | undefined;
};

const ipCounters = globalForSecurity.ipCounters ??= new Map<string, { count: number, resetAt: number }>()

/**
 * Checks if an IP is banned and tracks its request count for rate limiting.
 * Returns a response if blocked/banned, otherwise returns null to proceed.
 */
export async function checkSecurity(req: Request): Promise<NextResponse | null> {
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    if (ip === "unknown") return null // Can't track if no IP

    // 1. Check if IP is already banned in database
    const banned = await prisma.bannedIp.findUnique({
        where: { ip }
    })

    if (banned) {
        console.warn(`[SECURITY] Blocked request from banned IP: ${ip}`)
        return new NextResponse("Forbidden: Access denied.", { status: 403 })
    }

    // 2. IP Rate Limiting (Anti-Scraping)
    const now = Date.now()
    const tracker = ipCounters.get(ip)

    if (!tracker || tracker.resetAt < now) {
        // First request or counter expired
        ipCounters.set(ip, { count: 1, resetAt: now + 60000 })
    } else {
        // Increment counter
        tracker.count++

        if (tracker.count > MAX_REQUESTS_PER_MINUTE) {
            // AUTO-BAN logic
            console.error(`[SECURITY] IP ${ip} exceeded rate limit (${tracker.count}/${MAX_REQUESTS_PER_MINUTE}). AUTO-BANNING.`)

            try {
                // Save to database
                await prisma.bannedIp.upsert({
                    where: { ip },
                    update: { reason: BAN_REASON },
                    create: { ip, reason: BAN_REASON }
                })

                // Log the security event
                await prisma.securityLog.create({
                    data: {
                        event: "IP_BANNED",
                        ip,
                        details: `Rate limit hit: ${tracker.count} req/min`
                    }
                })
            } catch (e) {
                console.error("[SECURITY] Failed to save ban to DB:", e)
            }

            return new NextResponse("Forbidden: Too many requests. You have been banned.", { status: 403 })
        }
    }

    return null
}

/**
 * Clean up expired counters periodically to prevent memory leaks
 */
if (!globalForSecurity.ipCounters) {
    setInterval(() => {
        const now = Date.now()
        for (const [ip, tracker] of ipCounters.entries()) {
            if (tracker.resetAt < now) {
                ipCounters.delete(ip)
            }
        }
    }, 300000) // Every 5 minutes
}

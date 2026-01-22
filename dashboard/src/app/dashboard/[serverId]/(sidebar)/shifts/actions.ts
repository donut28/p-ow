
"use server"

import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function toggleShift(prevState: any, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user?.id) return { message: "Unauthorized" }

    const serverId = formData.get("serverId") as string
    if (!serverId) return { message: "Server ID missing" }

    // Build list of possible user IDs (same logic as mod-panel)
    const baseUserIds = [
        session.user.robloxId,
        session.user.discordId,
        session.user.id
    ].filter(Boolean) as string[]

    // Find Member record to get the stored userId (for consistency with bot)
    // Try finding by userId first, then by discordId
    let member = null
    for (const uid of baseUserIds) {
        member = await prisma.member.findUnique({
            where: { userId_serverId: { userId: uid, serverId } }
        })
        if (member) break
    }

    // If not found by userId, try by discordId field
    if (!member && session.user.discordId) {
        member = await prisma.member.findFirst({
            where: { discordId: session.user.discordId, serverId }
        })
    }

    // Use member's userId if found, otherwise fall back to Discord ID or Clerk ID
    const userId = member?.userId || session.user.discordId || session.user.id

    // Include all possible IDs for finding active shift
    const possibleUserIds = member && !baseUserIds.includes(member.userId)
        ? [...baseUserIds, member.userId]
        : baseUserIds

    // Find active shift (check all possible user IDs)
    const activeShift = await prisma.shift.findFirst({
        where: {
            userId: { in: possibleUserIds },
            serverId,
            endTime: null
        }
    })

    try {
        if (activeShift) {
            // Clock Out
            const endTime = new Date()
            const duration = Math.floor((endTime.getTime() - activeShift.startTime.getTime()) / 1000)

            await prisma.shift.update({
                where: { id: activeShift.id },
                data: {
                    endTime,
                    duration
                }
            })

            const { AutomationEngine } = await import("@/lib/automation-engine")
            AutomationEngine.trigger("SHIFT_END", {
                serverId,
                player: {
                    name: session.user.username || session.user.name || "Unknown",
                    id: userId
                }
            })

            revalidatePath("/dashboard")
            return { message: "Clocked Out Successfully", active: false }
        } else {
            // Clock In - Check if server has players first
            const server = await prisma.server.findUnique({
                where: { id: serverId },
                select: { apiUrl: true }
            })

            if (!server?.apiUrl) {
                return { message: "Server not configured properly" }
            }

            // Fetch current player count from PRC API
            const { PrcClient } = await import("@/lib/prc")
            const client = new PrcClient(server.apiUrl)

            try {
                const players = await client.getPlayers()
                if (players.length === 0) {
                    return { message: "Cannot go on duty - server has no players" }
                }
            } catch (apiError) {
                // If we can't reach the server, assume it's offline
                return { message: "Cannot go on duty - server appears to be offline" }
            }

            // Create shift - use the consistent userId
            await prisma.shift.create({
                data: {
                    userId,
                    serverId,
                    startTime: new Date()
                }
            })

            const { AutomationEngine } = await import("@/lib/automation-engine")
            AutomationEngine.trigger("SHIFT_START", {
                serverId,
                player: {
                    name: session.user.username || session.user.name || "Unknown",
                    id: userId
                }
            })

            revalidatePath("/dashboard")
            return { message: "Clocked In Successfully", active: true }
        }
    } catch (error) {
        console.error("Shift Toggle Error:", error)
        return { message: "Failed to update shift status." }
    }
}

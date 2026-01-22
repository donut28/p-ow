
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"
import { RollbackService } from "@/lib/rollback-service"
import { queueCommand } from "@/lib/cross-server-sync"

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Check admin permissions - assuming basic admin access is enough for this tool
    // Ideally we should check strict permissions
    const body = await req.json().catch(() => ({}))
    const { serverId, targetUserId, timestamp } = body

    if (!serverId || !targetUserId) {
        return new NextResponse("Missing serverId or targetUserId", { status: 400 })
    }

    const member = await prisma.member.findFirst({
        where: { serverId, userId: session.user.id }
    })

    if (!member?.isAdmin && !isSuperAdmin(session.user)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        // 1. Determine time range
        // If timestamp is provided, use it. Otherwise default to 24 hours ago.
        const startTime = timestamp ? new Date(timestamp) : new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        // We need to find logs where this user was the ACTOR.
        // In our Log model:
        // - type="command", playerId=targetUserId
        const logs = await prisma.log.findMany({
            where: {
                serverId,
                type: "command",
                playerId: targetUserId,
                createdAt: { gte: startTime }
            },
            orderBy: { createdAt: "desc" },
            // If explicit timestamp is given, allow more logs (up to 1000), otherwise restrict to 100
            take: timestamp ? 1000 : 100 
        })

        if (logs.length === 0) {
            return NextResponse.json({ success: true, reversalsQueued: 0, message: "No logs found" })
        }

        // 2. Calculate Reversals
        const service = new RollbackService()
        // Map DB logs to the format expected by service (id, command)
        const logsForService = logs.map(l => ({ id: l.id, command: l.command || "" }))
        const reversals = service.calculateReversals(logsForService)

        // 3. Queue Reversals
        for (const reversal of reversals) {
            await queueCommand(
                serverId,
                reversal.command,
                10, // High priority
                serverId,
                targetUserId
            )
        }

        // 4. Log the Rollback Action (Security Log)
        await prisma.securityLog.create({
            data: {
                event: "RAID_ROLLBACK",
                ip: "dashboard", // Internal
                userId: session.user.id,
                details: `Rolled back ${reversals.length} actions for target ${targetUserId} on server ${serverId}`
            }
        })

        return NextResponse.json({ 
            success: true, 
            reversalsQueued: reversals.length 
        })

    } catch (e: any) {
        console.error("[ROLLBACK] Error:", e)
        return NextResponse.json({ error: e.message || "Internal Error" }, { status: 500 })
    }
}

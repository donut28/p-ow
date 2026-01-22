import { prisma } from "@/lib/db"
import { fetchAndSaveLogs } from "@/lib/log-syncer"
import { processCommandQueue } from "@/lib/cross-server-sync"
import { NextResponse } from "next/server"

// Simple secret to prevent public access - in prod use a proper ENV variable
const INTERNAL_SECRET = process.env.INTERNAL_SYNC_SECRET || "REMOVED_INTERNAL_SECRET"

export async function POST(req: Request) {
    const authHeader = req.headers.get("x-internal-secret")

    if (authHeader !== INTERNAL_SECRET) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        // Option to sync a specific server or all eligible servers
        const body = await req.json().catch(() => ({}))
        const { serverId } = body

        let servers = []

        if (serverId) {
            const s = await prisma.server.findUnique({ where: { id: serverId } })
            if (s) servers.push(s)
        } else {
            // Find all servers that have an API URL configured
            servers = await prisma.server.findMany({
                where: {
                    apiUrl: { not: "" }
                }
            })
        }

        const results = []

        // Process in parallel with concurrency limit? For now Promise.all is okay for small scale
        // In large scale, mapLimit would be better.
        const promises = servers.map(async (server: any) => {
            if (!server.apiUrl) return

            // Sync logs
            const res = await fetchAndSaveLogs(server.apiUrl, server.id)

            // Tick automations (time-based)
            const { AutomationEngine } = await import("@/lib/automation-engine")
            await AutomationEngine.tick(server.id)

            return { serverId: server.id, newLogs: res.newLogsCount }
        })

        const data = await Promise.all(promises)

        // Process command queue (cross-server bans, etc.)
        // This runs separately and checks which servers have players
        await processCommandQueue().catch(() => { })

        return NextResponse.json({ success: true, results: data })
    } catch (e: any) {
        return new NextResponse(e.message, { status: 500 })
    }
}


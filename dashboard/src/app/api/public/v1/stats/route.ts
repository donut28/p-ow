import { prisma } from "@/lib/db"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { fetchServerStats } from "@/lib/server-utils"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    // 1. Validate API Key
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })

    // 2. Get Server Name from Query
    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")

    if (!serverName) {
        return NextResponse.json({ error: "Missing 'server' query parameter" }, { status: 400 })
    }

    // 3. Find Server
    const server = await findServerByName(serverName)
    if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    try {
        // 4. Fetch Stats
        const stats = await fetchServerStats(server.apiUrl)

        // 5. Log Access
        await logApiAccess(auth.apiKey, "PUBLIC_STATS_COLLECTED", `Server: ${server.name}`)

        return NextResponse.json({
            id: server.id,
            name: server.customName || server.name,
            online: stats.online,
            players: stats.players,
            maxPlayers: stats.maxPlayers,
            timestamp: new Date().toISOString()
        })
    } catch (e) {
        console.error("Public API Error:", e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

import { prisma } from "@/lib/db"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { PrcClient } from "@/lib/prc"
import { parsePrcPlayer } from "@/lib/prc-types"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    // 1. Validate API Key
    const auth = await validatePublicApiKey()
    if (!auth.valid) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

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
        // 4. Fetch Players from PRC
        const client = new PrcClient(server.apiUrl)
        const rawPlayers = await client.getPlayers()

        const players = rawPlayers.map(p => {
            const details = parsePrcPlayer(p.Player)
            return {
                name: details.name,
                id: details.id,
                team: p.Team,
                permission: p.Permission,
                vehicle: p.Vehicle,
                callsign: p.Callsign
            }
        })

        // 5. Log Access
        await logApiAccess(auth.apiKey, "PUBLIC_PLAYERS_COLLECTED", `Server: ${server.name}`)

        return NextResponse.json({
            serverId: server.id,
            serverName: server.customName || server.name,
            playerCount: players.length,
            players,
            timestamp: new Date().toISOString()
        })
    } catch (e) {
        console.error("Public API Error:", e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

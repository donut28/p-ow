import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) {
        return NextResponse.json({ error: "Missing serverId" }, { status: 400 })
    }

    const server = await prisma.server.findUnique({ where: { id: serverId } })
    if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    try {
        const client = new PrcClient(server.apiUrl)
        const serverData = await client.getServer().catch(() => null)

        return NextResponse.json({
            online: !!serverData,
            players: serverData?.CurrentPlayers ?? 0,
            maxPlayers: serverData?.MaxPlayers ?? 0
        })
    } catch (e) {
        return NextResponse.json({
            online: false,
            players: 0,
            maxPlayers: 0
        })
    }
}

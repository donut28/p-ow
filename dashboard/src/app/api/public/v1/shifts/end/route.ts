import { prisma } from "@/lib/db"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")
    const body = await req.json().catch(() => ({}))
    const { userId } = body

    if (!serverName || !userId) return NextResponse.json({ error: "Missing server or userId" }, { status: 400 })

    const server = await findServerByName(serverName)
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 })

    const activeShift = await prisma.shift.findFirst({
        where: { userId, serverId: server.id, endTime: null }
    })

    if (!activeShift) return NextResponse.json({ error: "No active shift found" }, { status: 404 })

    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - activeShift.startTime.getTime()) / 1000)

    const updated = await prisma.shift.update({
        where: { id: activeShift.id },
        data: { endTime, duration }
    })

    await logApiAccess(auth.apiKey, "PUBLIC_SHIFT_ENDED", `User: ${userId}, Server: ${server.name}, Duration: ${duration}s`)
    return NextResponse.json({ success: true, shift: updated })
}

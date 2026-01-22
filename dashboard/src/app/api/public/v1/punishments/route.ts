import { prisma } from "@/lib/db"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })

    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")
    const userId = searchParams.get("userId")

    if (!serverName) return NextResponse.json({ error: "Missing server name" }, { status: 400 })

    const server = await findServerByName(serverName)
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 })

    try {
        const where: any = { serverId: server.id }
        if (userId) where.userId = userId

        const punishments = await prisma.punishment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100
        })

        await logApiAccess(auth.apiKey, "PUBLIC_PUNISHMENTS_COLLECTED", `Server: ${server.name}`)
        return NextResponse.json(punishments)
    } catch (e) {
        console.error("Public Punishment GET Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })

    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")

    if (!serverName) return NextResponse.json({ error: "Missing server name" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { userId, moderatorId, type, reason } = body

    if (!userId || !moderatorId || !type) {
        return NextResponse.json({ error: "Missing required fields: userId, moderatorId, type" }, { status: 400 })
    }

    const server = await findServerByName(serverName)
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 })

    try {
        const punishment = await prisma.punishment.create({
            data: {
                serverId: server.id,
                userId,
                moderatorId: String(moderatorId),
                type,
                reason: reason || "No reason provided",
                resolved: false
            }
        })

        // Log access
        await logApiAccess(auth.apiKey, "PUBLIC_PUNISHMENT_CREATED", `Server: ${server.name}, User: ${userId}, Type: ${type}`)

        // Trigger Automation
        try {
            const { AutomationEngine } = await import("@/lib/automation-engine")
            AutomationEngine.trigger("PUNISHMENT_ISSUED", {
                serverId: server.id,
                player: { id: userId, name: "Unknown" },
                punishment: {
                    type,
                    reason,
                    issuer: String(moderatorId),
                    target: userId
                }
            }).catch(() => { })
        } catch (e) {
            console.error("Automation Trigger Error (Public API):", e)
        }

        return NextResponse.json(punishment)
    } catch (e) {
        console.error("Public Punishment POST Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

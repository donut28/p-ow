import { prisma } from "@/lib/db"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })

    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")

    if (!serverName) return NextResponse.json({ error: "Missing server name" }, { status: 400 })

    const server = await findServerByName(serverName)
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 })

    try {
        const members = await prisma.member.findMany({
            where: { serverId: server.id },
            include: {
                role: {
                    select: {
                        name: true,
                        color: true,
                        isDefault: true
                    }
                }
            }
        })

        await logApiAccess(auth.apiKey, "PUBLIC_MEMBER_LIST_FETCHED", `Server: ${server.name}`)
        return NextResponse.json(members)
    } catch (e) {
        console.error("Public Member List API Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

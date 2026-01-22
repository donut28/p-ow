import { prisma } from "@/lib/db"
import { validatePublicApiKey, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })

    try {
        const servers = await prisma.server.findMany({
            select: {
                id: true,
                name: true,
                customName: true,
                createdAt: true
            }
        })

        await logApiAccess(auth.apiKey, "PUBLIC_SERVER_LIST_FETCHED")
        return NextResponse.json(servers)
    } catch (e) {
        console.error("Public Server List API Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

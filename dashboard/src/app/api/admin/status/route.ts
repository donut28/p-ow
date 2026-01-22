import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { isServerAdmin } from "@/lib/admin"

// GET - Check if current user is admin for a server
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) {
        return new NextResponse("Missing serverId", { status: 400 })
    }

    const isAdmin = await isServerAdmin(session.user, serverId)

    return NextResponse.json({ isAdmin })
}


import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Revoke admin access - superadmin only
export async function DELETE(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Only superadmin can revoke access
    if (!isSuperAdmin(session.user)) {
        return NextResponse.json({ error: "Only superadmin can revoke admin access" }, { status: 403 })
    }

    try {
        const { serverId, memberId } = await req.json()

        if (!serverId || !memberId) {
            return NextResponse.json({ error: "Missing serverId or memberId" }, { status: 400 })
        }

        // Update member to remove admin flag
        await prisma.member.update({
            where: { id: memberId },
            data: { isAdmin: false }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Revoke admin error:", e)
        return NextResponse.json({ error: "Failed to revoke admin access" }, { status: 500 })
    }
}

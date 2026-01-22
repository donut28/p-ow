
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Update member's role
export async function PATCH(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { memberId, roleId } = await req.json()

        if (!memberId) {
            return NextResponse.json({ error: "Missing memberId" }, { status: 400 })
        }

        // Get the member to check server access
        const member = await prisma.member.findUnique({
            where: { id: memberId }
        })

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 })
        }

        // Check admin access
        const hasAccess = await isServerAdmin(session.user, member.serverId)
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        await prisma.member.update({
            where: { id: memberId },
            data: { roleId: roleId || null }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Member role update error:", e)
        return NextResponse.json({ error: "Failed to update member role" }, { status: 500 })
    }
}

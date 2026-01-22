
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Approve LOA
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { id } = await params

        const loa = await prisma.leaveOfAbsence.findUnique({ where: { id } })
        if (!loa) {
            return NextResponse.json({ error: "LOA not found" }, { status: 404 })
        }

        const hasAccess = await isServerAdmin(session.user, loa.serverId)
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        await prisma.leaveOfAbsence.update({
            where: { id },
            data: {
                status: "approved",
                reviewedBy: session.user.robloxId || session.user.discordId || session.user.id,
                reviewedAt: new Date()
            }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("LOA approve error:", e)
        return NextResponse.json({ error: "Failed to approve LOA" }, { status: 500 })
    }
}

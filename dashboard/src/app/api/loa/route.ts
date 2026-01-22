
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { verifyPermissionOrError } from "@/lib/auth-permissions"
import { NextResponse } from "next/server"

// Submit LOA request
export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { serverId, startDate, endDate, reason } = await req.json()

        if (!serverId || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Permission check - require canRequestLoa
        const permError = await verifyPermissionOrError(session.user, serverId, "canRequestLoa")
        if (permError) return permError

        const userId = session.user.robloxId || session.user.discordId || session.user.id

        const loa = await prisma.leaveOfAbsence.create({
            data: {
                userId,
                serverId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: "pending"
            }
        })

        return NextResponse.json({ success: true, loa })
    } catch (e) {
        return NextResponse.json({ error: "Failed to submit LOA request" }, { status: 500 })
    }
}

// Get LOAs for a server
export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const serverId = searchParams.get("serverId")

        if (!serverId) {
            return NextResponse.json({ error: "Missing serverId" }, { status: 400 })
        }

        // Permission check - require canViewOtherShifts to view all LOAs
        const permError = await verifyPermissionOrError(session.user, serverId, "canViewOtherShifts")
        if (permError) return permError

        const loas = await prisma.leaveOfAbsence.findMany({
            where: { serverId },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ loas })
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch LOAs" }, { status: 500 })
    }
}


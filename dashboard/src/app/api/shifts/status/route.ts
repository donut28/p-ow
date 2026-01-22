import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const url = new URL(req.url)
    const serverId = url.searchParams.get("serverId")

    if (!serverId) {
        return NextResponse.json({ error: "Missing serverId" }, { status: 400 })
    }

    // Look for shifts by Discord ID, Clerk ID, OR Roblox ID
    // Bot creates shifts with Roblox ID (from Member.userId which is Roblox ID)
    const possibleUserIds = [
        session.user.discordId,
        session.user.id,
        session.user.robloxId
    ].filter((id): id is string => !!id)

    const activeShift = await prisma.shift.findFirst({
        where: {
            userId: { in: possibleUserIds },
            serverId,
            endTime: null
        }
    })

    return NextResponse.json({
        active: !!activeShift,
        shift: activeShift ? {
            id: activeShift.id,
            startTime: activeShift.startTime.toISOString()
        } : null
    })
}

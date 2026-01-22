
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Update server settings
export async function PATCH(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const {
            serverId,
            customName,
            bannerUrl,
            onDutyRoleId,
            discordGuildId,
            autoSyncRoles,
            suspendedRoleId,
            terminatedRoleId,
            staffRoleId,
            permLogChannelId,
            staffRequestChannelId,
            commandLogChannelId,
            raidAlertChannelId
        } = await req.json()

        if (!serverId) {
            return NextResponse.json({ error: "Missing serverId" }, { status: 400 })
        }

        // Check admin access
        const hasAccess = await isServerAdmin(session.user, serverId)
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        const updated = await prisma.server.update({
            where: { id: serverId },
            data: {
                customName: customName || null,
                bannerUrl: bannerUrl || null,
                onDutyRoleId: onDutyRoleId || null,
                discordGuildId: discordGuildId || null,
                autoSyncRoles: autoSyncRoles ?? false,
                suspendedRoleId: suspendedRoleId || null,
                terminatedRoleId: terminatedRoleId || null,
                staffRoleId: staffRoleId || null,
                permLogChannelId: permLogChannelId || null,
                staffRequestChannelId: staffRequestChannelId || null,
                commandLogChannelId: commandLogChannelId || null,
                raidAlertChannelId: raidAlertChannelId || null
            }
        })

        return NextResponse.json({ success: true, server: updated })
    } catch (e) {
        console.error("Server update error:", e)
        return NextResponse.json({ error: "Failed to update server" }, { status: 500 })
    }
}

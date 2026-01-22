
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Sync roles between all servers
export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { serverId } = await req.json()

        const hasAccess = await isServerAdmin(session.user, serverId)
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // Get all servers
        const servers = await prisma.server.findMany()

        // Get all roles from source server
        const sourceRoles = await prisma.role.findMany({
            where: { serverId }
        })

        // Copy roles to other servers
        let synced = 0
        for (const server of servers) {
            if (server.id === serverId) continue

            for (const role of sourceRoles) {
                // Check if role with same name exists
                const existing = await prisma.role.findFirst({
                    where: { serverId: server.id, name: role.name }
                })

                const permissionData = {
                    color: role.color,
                    quotaMinutes: role.quotaMinutes,
                    canShift: role.canShift,
                    canViewOtherShifts: role.canViewOtherShifts,
                    canViewLogs: role.canViewLogs,
                    canViewPunishments: role.canViewPunishments,
                    canIssueWarnings: role.canIssueWarnings,
                    canKick: role.canKick,
                    canBan: role.canBan,
                    canBanBolo: role.canBanBolo,
                    canUseToolbox: role.canUseToolbox,
                    canManageBolos: role.canManageBolos,
                    canRequestLoa: role.canRequestLoa,
                    canViewQuota: role.canViewQuota
                }

                if (existing) {
                    await prisma.role.update({
                        where: { id: existing.id },
                        data: permissionData
                    })
                } else {
                    await prisma.role.create({
                        data: {
                            serverId: server.id,
                            name: role.name,
                            ...permissionData
                        }
                    })
                }
                synced++
            }
        }

        return NextResponse.json({ success: true, synced })
    } catch (e) {
        console.error("Role sync error:", e)
        return NextResponse.json({ error: "Failed to sync roles" }, { status: 500 })
    }
}

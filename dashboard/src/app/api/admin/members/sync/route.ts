
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

// Sync member roles between all servers
export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { serverId } = await req.json()

        // Check admin access
        const hasAccess = await isServerAdmin(session.user, serverId)
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }

        // Get all servers
        const servers = await prisma.server.findMany()

        // Get all members from source server
        const sourceMembers = await prisma.member.findMany({
            where: { serverId },
            include: { role: true }
        })

        // For each other server, sync member roles by userId
        let synced = 0
        for (const server of servers) {
            if (server.id === serverId) continue

            // Get roles from target server with matching names
            const targetRoles = await prisma.role.findMany({
                where: { serverId: server.id }
            })

            for (const sourceMember of sourceMembers) {
                if (!sourceMember.role) continue

                // Find matching role by name in target server
                const matchingRole = targetRoles.find((r: any) => r.name === sourceMember.role?.name)
                if (!matchingRole) continue

                // Upsert member in target server with matching role
                await prisma.member.upsert({
                    where: {
                        userId_serverId: {
                            userId: sourceMember.userId,
                            serverId: server.id
                        }
                    },
                    create: {
                        userId: sourceMember.userId,
                        serverId: server.id,
                        roleId: matchingRole.id,
                        isAdmin: sourceMember.isAdmin
                    },
                    update: {
                        roleId: matchingRole.id,
                        isAdmin: sourceMember.isAdmin
                    }
                })
                synced++
            }
        }

        return NextResponse.json({ success: true, synced })
    } catch (e) {
        console.error("Member sync error:", e)
        return NextResponse.json({ error: "Failed to sync members" }, { status: 500 })
    }
}

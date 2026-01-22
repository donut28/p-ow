
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { MembersListClient } from "./members-list-client"

export default async function AdminMembersPage({ params }: { params: Promise<{ serverId: string }> }) {
    const session = await getSession()
    if (!session) redirect("/login")

    const { serverId } = await params

    // Check admin access
    const hasAccess = await isServerAdmin(session.user, serverId)
    if (!hasAccess) redirect(`/dashboard/${serverId}/mod-panel`)

    // Get all roles for this server
    const roles = await prisma.role.findMany({
        where: { serverId },
        orderBy: { name: "asc" }
    })

    // Get existing member records for this server
    const existingMembers = await prisma.member.findMany({
        where: { serverId },
        include: { role: true }
    })

    // Get all servers for sync feature
    const servers = await prisma.server.findMany({
        select: { id: true, name: true, customName: true }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Members</h2>
                        <p className="text-xs text-zinc-500">All registered accounts</p>
                    </div>
                </div>
            </div>

            <MembersListClient
                serverId={serverId}
                roles={roles}
                servers={servers}
                existingMembers={existingMembers}
            />
        </div>
    )
}


import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isServerAdmin } from "@/lib/admin"
import { redirect } from "next/navigation"
import { Shield, Plus, RefreshCw } from "lucide-react"
import { RolesList } from "./roles-list"

export default async function AdminRolesPage({ params }: { params: Promise<{ serverId: string }> }) {
    const session = await getSession()
    if (!session) redirect("/login")

    const { serverId } = await params

    // Check admin access
    const hasAccess = await isServerAdmin(session.user, serverId)
    if (!hasAccess) redirect(`/dashboard/${serverId}/mod-panel`)

    // Get all roles for this server
    const roles = await prisma.role.findMany({
        where: { serverId },
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" }
    })

    // Get all servers for sync feature
    const servers = await prisma.server.findMany({
        select: { id: true, name: true, customName: true }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Roles</h2>
                        <p className="text-xs text-zinc-500">{roles.length} role(s) configured</p>
                    </div>
                </div>
            </div>

            <RolesList
                serverId={serverId}
                roles={roles}
                servers={servers}
            />
        </div>
    )
}

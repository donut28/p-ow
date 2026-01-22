
import { getSession } from "@/lib/auth-clerk"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { RaidMitigationClient } from "./raid-mitigation-client"

export default async function RaidMitigationPage({ params }: { params: Promise<{ serverId: string }> }) {
    const session = await getSession()
    if (!session) redirect("/login")

    const { serverId } = await params

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-red-400" />
                </div>
                <div>
                    <h2 className="font-bold text-white text-xl">Raid Mitigation</h2>
                    <p className="text-xs text-zinc-500">Rollback unauthorized actions and mitigate server raids</p>
                </div>
            </div>

            <RaidMitigationClient serverId={serverId} />
        </div>
    )
}

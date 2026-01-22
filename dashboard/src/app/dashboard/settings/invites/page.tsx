
import { clerkClient } from "@clerk/nextjs/server"
import { getSession } from "@/lib/auth-clerk"
import { redirect } from "next/navigation"
import { Mail, Trash2, CheckCircle, Clock } from "lucide-react"
import { InviteForm } from "./form"
import { RevokeButton } from "./revoke-button"

export default async function InvitesPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    // Fetch invitations
    const client = await clerkClient()
    const invitations = await client.invitations.getInvitationList({
        status: "pending"
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Manage Invitations</h2>
                <p className="text-zinc-400">Invite new staff members to the dashboard. They will receive an email to sign up.</p>
            </div>

            {/* Invite Form */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-indigo-400" />
                    Send New Invitation
                </h3>
                <InviteForm />
            </div>

            {/* Invitation List */}
            <div className="space-y-4">
                <h3 className="font-medium text-white">Invitation History</h3>
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
                    {invitations.data.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">No invitations found.</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {invitations.data.map((inv) => (
                                <div key={inv.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-white">{inv.emailAddress}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {inv.status === "pending" ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                                                    <Clock className="h-3 w-3" /> Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                                                    <CheckCircle className="h-3 w-3" /> Accepted
                                                </span>
                                            )}
                                            <span className="text-xs text-zinc-500">
                                                Sent: {new Date(inv.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {inv.status === "pending" && (
                                        <RevokeButton id={inv.id} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

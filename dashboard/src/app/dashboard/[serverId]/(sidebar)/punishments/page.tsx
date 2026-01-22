
import { prisma } from "@/lib/db"
import { AlertTriangle, Plus } from "lucide-react"
import { CreatePunishmentForm } from "./form"

import { getSession } from "@/lib/auth-clerk"

export default async function PunishmentsPage({ params }: { params: Promise<{ serverId: string }> }) {
    const { serverId } = await params

    // Global Punishments
    const punishments = await prisma.punishment.findMany({
        // where: { serverId: serverId }, // Removed for global
        orderBy: { createdAt: "desc" },
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Punishments</h1>
                </div>
                {/* Modal Trigger could be here, but using inline form for simplicity or client component wrapper */}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="font-medium text-white">History</h3>
                        </div>
                        <div className="p-4">
                            {punishments.length === 0 ? (
                                <div className="text-center text-zinc-500 py-8">No punishments recorded.</div>
                            ) : (
                                <div className="space-y-3">
                                    {punishments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${p.type === 'Ban' ? 'bg-red-500/10 text-red-400' :
                                                        p.type === 'Kick' ? 'bg-amber-500/10 text-amber-400' :
                                                            'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                        {p.type}
                                                    </span>
                                                    <span className="font-medium text-white">{p.userId}</span>
                                                </div>
                                                <p className="text-sm text-zinc-400 mt-1">{p.reason}</p>
                                            </div>
                                            <div className="text-right text-xs text-zinc-500">
                                                <p>{new Date(p.createdAt).toLocaleDateString()}</p>
                                                <p>{new Date(p.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm sticky top-6">
                        <h3 className="font-medium text-white mb-4">Issue Punishment</h3>
                        <CreatePunishmentForm serverId={serverId} />
                    </div>
                </div>
            </div>
        </div>
    )
}

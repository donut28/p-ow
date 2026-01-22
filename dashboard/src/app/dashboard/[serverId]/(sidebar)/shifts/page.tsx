import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth-clerk"
import { Clock, History } from "lucide-react"
import { ShiftStatus } from "./shift-status"

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
}

export default async function ShiftsPage({ params }: { params: Promise<{ serverId: string }> }) {
    const session = await getSession()
    const { serverId } = await params

    if (!session?.user?.id) return null

    // Look for shifts by Discord ID, Clerk ID, OR Roblox ID
    // Bot creates shifts with Roblox ID (from Member.userId)
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

    const shiftHistory = await prisma.shift.findMany({
        where: {
            userId: { in: possibleUserIds },
            endTime: { not: null }
        },
        orderBy: { startTime: "desc" },
        take: 20
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                    <Clock className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold text-white">My Shifts</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Active Shift Card */}
                <div className="lg:col-span-1">
                    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
                        <h3 className="font-medium text-white mb-4">Current Status</h3>
                        <ShiftStatus
                            serverId={serverId}
                            initialActive={!!activeShift}
                            initialStartTime={activeShift?.startTime.toISOString()}
                        />
                    </div>
                </div>

                {/* History */}
                <div className="lg:col-span-2">
                    <div className="rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm">
                        <div className="p-4 border-b border-white/5 flex items-center gap-2">
                            <History className="h-4 w-4 text-zinc-400" />
                            <h3 className="font-medium text-white">Recent Shifts</h3>
                        </div>
                        <div className="p-4">
                            {shiftHistory.length === 0 ? (
                                <div className="text-center text-zinc-500 py-8">No shift history found.</div>
                            ) : (
                                <div className="space-y-3">
                                    {shiftHistory.map((shift: any) => (
                                        <div key={shift.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {new Date(shift.startTime).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {new Date(shift.startTime).toLocaleTimeString()} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : '...'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-flex items-center rounded-md bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400">
                                                    {shift.duration ? formatDuration(shift.duration) : "0s"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

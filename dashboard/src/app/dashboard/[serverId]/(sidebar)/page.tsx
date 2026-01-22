
import { prisma } from "@/lib/db"

export default async function DashboardOverviewPage({ params }: { params: Promise<{ serverId: string }> }) {
    const { serverId } = await params
    const server = await prisma.server.findUnique({
        where: { id: serverId },
    })

    if (!server) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold text-white">Server Not Found</h1>
                <p className="text-zinc-500">The requested server ID does not exist.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Stats Cards */}
                {[
                    { label: "Active Players", value: "0", color: "indigo" },
                    { label: "Staff Online", value: "0", color: "emerald" },
                    { label: "Total Logs", value: "0", color: "blue" },
                    { label: "Punishments (24h)", value: "0", color: "amber" },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
                        <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                        <p className={`mt-2 text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity Section */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-medium text-white mb-4">Recent Activity</h3>
                <div className="text-sm text-zinc-500">
                    No activity logs available yet.
                </div>
            </div>
        </div>
    )
}

import { UserButton } from "@clerk/nextjs"

import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/admin"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Shield, LayoutDashboard, Users, Server as ServerIcon, FileText } from "lucide-react"
import { EnsureDiscordConnection } from "@/components/auth/ensure-discord"
import { PrcClient } from "@/lib/prc"
import { RandomGreeting } from "@/components/random-greeting"
import { DashboardFooter } from "@/components/layout/dashboard-footer"
import { WarningBanner } from "@/components/ui/warning-banner"
import PostHogClient from "@/lib/posthog"

// Helper to fetch stats SAFELY on server
async function fetchServerStats(apiUrl: string) {
    try {
        const client = new PrcClient(apiUrl)
        const info = await client.getServer()
        return { online: true, players: info.CurrentPlayers, maxPlayers: info.MaxPlayers }
    } catch (e) {
        return { online: false, players: 0, maxPlayers: 0 }
    }
}

export default async function ServerSelectorPage() {
    // ... session setup ...
    const session = await getSession()
    if (!session) redirect("/login")

    const servers = await prisma.server.findMany()

    // Parallel fetch for all stats
    const serversWithStats = await Promise.all(servers.map(async (s: any) => {
        const stats = await fetchServerStats(s.apiUrl)
        return { ...s, stats }
        return { ...s, stats }
    }))

    // Check Feature Flag
    const posthog = PostHogClient()
    const isFormsEnabled = await posthog.isFeatureEnabled('forms', session.user.id)
    await posthog.shutdown()

    return (
        <EnsureDiscordConnection>
            <div className="min-h-screen bg-[#111] font-sans text-zinc-100">
                <WarningBanner />
                <div className="p-8">
                    <div className="mx-auto max-w-7xl space-y-8">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Logo */}
                                <img
                                    src="/logo.png"
                                    alt="POW"
                                    className="h-12 w-12 rounded-xl object-contain"
                                />
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                                        <RandomGreeting username={session.user.username || session.user.name || "User"} />
                                    </h1>
                                    <p className="text-zinc-400">Welcome to your command center.</p>
                                </div>
                            </div>
                            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "h-10 w-10" } }} />
                        </div>

                        {/* Servers Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-white">My Servers & Departments</h2>
                                <div className="flex gap-2 text-zinc-400">
                                    {/* Grid/List info icons placeholder */}
                                </div>
                            </div>
                            <p className="text-zinc-500">Here are the servers and departments that you are a member of.</p>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {serversWithStats.map((server) => (
                                    <div key={server.id} className="group relative overflow-hidden rounded-2xl bg-[#1a1a1a] shadow-lg transition-all hover:bg-[#1f1f1f]">
                                        {/* Banner Image with Gradient */}
                                        <div className="h-32 w-full relative group bg-zinc-800">
                                            {server.bannerUrl ? (
                                                <img src={server.bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-zinc-800 group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-zinc-700 transition-colors duration-500"></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                                        </div>

                                        <div className="p-5">
                                            {/* Server Info */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white">{server.customName || server.name}</h3>
                                                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                                                        <span className={`inline-block h-2 w-2 rounded-full ${server.stats.online && server.stats.players > 0 ? "bg-emerald-500" : "bg-red-500"}`}></span>
                                                        {server.stats.online && server.stats.players > 0 ? "Online" : "Offline"}
                                                    </div>
                                                </div>
                                                <Shield className="h-5 w-5 text-emerald-500" />
                                            </div>

                                            {/* Quick Access */}
                                            <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 cursor-pointer">
                                                Quick Access: Press ⌘ + Enter
                                            </div>

                                            {/* Stats */}
                                            <div className="mt-4 flex items-center justify-between border-b border-white/5 pb-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Users className="h-4 w-4" />
                                                    <span>{server.stats.players ?? 0} players</span>
                                                </div>
                                                {/* Avatars placeholder */}
                                                <div className="flex -space-x-2">
                                                    <div className="h-6 w-6 rounded-full bg-zinc-700 border border-[#1a1a1a]"></div>
                                                    <div className="h-6 w-6 rounded-full bg-zinc-600 border border-[#1a1a1a]"></div>
                                                </div>
                                            </div>

                                            {/* Links */}
                                            <div className="mt-4 space-y-2">
                                                <Link href={`/dashboard/${server.id}/admin`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                                                    <LayoutDashboard className="h-4 w-4 text-sky-400" />
                                                    Admin Dashboard
                                                </Link>
                                                <Link href={`/dashboard/${server.id}/mod-panel`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                                                    <Shield className="h-4 w-4 text-emerald-400" />
                                                    Moderator Panel
                                                </Link>
                                                {isFormsEnabled && (
                                                    <Link href={`/dashboard/${server.id}/forms`} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                                                        <FileText className="h-4 w-4 text-indigo-400" />
                                                        Forms
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Server Card (Superadmin only) */}
                                {isSuperAdmin(session.user as any) && (
                                    <Link href="/dashboard/settings" className="group flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-[#111] hover:border-zinc-700 hover:bg-[#151515] transition-all">
                                        <div className="rounded-full bg-zinc-800 p-4 transition-transform group-hover:scale-110">
                                            <ServerIcon className="h-8 w-8 text-zinc-400" />
                                        </div>
                                        <p className="mt-4 font-medium text-zinc-400">Add New Server</p>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Integration Info */}
                        <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Want to integrate POW with your server?</h3>
                                    <p className="text-sm text-zinc-400 mt-1">
                                        Join our Discord and open a ticket to get your server set up with Project Overwatch.
                                    </p>
                                </div>
                                <a
                                    href="https://discord.gg/lacomm"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    Join Discord
                                </a>
                            </div>
                        </div>

                        {/* Footer with legal links */}
                        <DashboardFooter />
                    </div>
                </div>
            </div>
        </EnsureDiscordConnection>
    )
}

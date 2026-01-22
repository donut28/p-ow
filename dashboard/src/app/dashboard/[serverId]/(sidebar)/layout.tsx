
import { Sidebar } from "@/components/layout/sidebar"
import { getSession } from "@/lib/auth-clerk"
import { redirect } from "next/navigation"
import { ClerkProvider, UserButton } from "@clerk/nextjs"
import { DiscordRoleSyncProvider } from "@/components/providers/discord-role-sync-provider"
import { BottomNav } from "@/components/pwa/BottomNav"

export default async function ServerDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ serverId: string }>
}) {
    const session = await getSession()

    if (!session) redirect("/login")

    const { serverId } = await params

    // Enforce Discord AND Roblox Connection
    const missingDiscord = !session.user.discordId
    const missingRoblox = !session.user.robloxId

    if (missingDiscord || missingRoblox) {
        const missingConnections = []
        if (missingDiscord) missingConnections.push("Discord")
        if (missingRoblox) missingConnections.push("Roblox")

        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 p-4 text-white">
                <h1 className="mb-4 text-2xl font-bold">Account Connection Required</h1>
                <p className="mb-8 text-zinc-400">Please connect your <strong>{missingConnections.join(" and ")}</strong> account{missingConnections.length > 1 ? "s" : ""} in User Settings to continue.</p>
                {/* Clerk's UserProfile component could be opened here, or just a UserButton to let them manage account */}
                <div className="bg-zinc-900 p-6 rounded-xl border border-white/10">
                    <p className="mb-4 text-sm text-zinc-300">Click your profile below → Manage Account → Social Connections</p>
                    <UserButton afterSignOutUrl="/login" />
                </div>
            </div>
        )
    }


    return (
        <DiscordRoleSyncProvider serverId={serverId}>
            <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
                {/* Sidebar - hidden on mobile */}
                <div className="hidden md:block">
                    <Sidebar serverId={serverId} />
                </div>
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Topbar */}
                    <header className="flex h-16 items-center border-b border-white/5 bg-zinc-900/50 px-6 backdrop-blur-xl">
                        <h2 className="text-lg font-medium text-white">Dashboard Overview</h2>
                        <div className="ml-auto flex items-center gap-4">
                            <UserButton afterSignOutUrl="/login" />
                        </div>
                    </header>

                    {/* Main content with bottom padding on mobile for nav */}
                    <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {children}
                    </main>
                </div>

                {/* Mobile bottom navigation */}
                <BottomNav serverId={serverId} />
            </div>
        </DiscordRoleSyncProvider>
    )
}

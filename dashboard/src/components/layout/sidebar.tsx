
"use client" // Client component for usePathname

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ScrollText, AlertTriangle, Clock, Settings, LogOut, Mail } from "lucide-react"
import clsx from "clsx"
import { SignOutButton } from "@clerk/nextjs"

const navigation = [
    { name: "Overview", href: "", icon: LayoutDashboard },
    { name: "Live Logs", href: "/logs", icon: ScrollText },
    { name: "Punishments", href: "/punishments", icon: AlertTriangle },
    { name: "Shifts", href: "/shifts", icon: Clock },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Invites", href: "/settings/invites", icon: Mail },
]

export function Sidebar({ serverId }: { serverId: string }) {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col border-r border-white/5 bg-zinc-950">
            <div className="flex h-16 items-center px-6">
                <h1 className="text-xl font-bold text-white">Overwatch</h1>
            </div>

            <div className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const href = `/dashboard/${serverId}${item.href}`
                    const isActive = pathname === href || (item.href === "" && pathname === `/dashboard/${serverId}`)

                    return (
                        <Link
                            key={item.name}
                            href={href}
                            className={clsx(
                                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-indigo-500/10 text-indigo-400"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={clsx("h-5 w-5", isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-white")} />
                            {item.name}
                        </Link>
                    )
                })}
            </div>

            <div className="border-t border-white/5 p-4">
                <SignOutButton>
                    <button
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </SignOutButton>
            </div>
        </div>
    )
}

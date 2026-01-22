"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Users, Clock, Settings, Search } from "lucide-react"

interface BottomNavProps {
    serverId: string
}

/**
 * Bottom navigation bar for mobile PWA
 * Only shows in standalone (PWA) mode on mobile
 */
export function BottomNav({ serverId }: BottomNavProps) {
    const pathname = usePathname()

    const navItems = [
        {
            href: `/dashboard/${serverId}`,
            icon: LayoutDashboard,
            label: "Dashboard",
            match: (p: string) => p === `/dashboard/${serverId}`
        },
        {
            href: `/dashboard/${serverId}/mod-panel`,
            icon: Users,
            label: "Players",
            match: (p: string) => p.includes("/mod-panel") || p.includes("/user/")
        },
        {
            href: `/dashboard/${serverId}/shifts`,
            icon: Clock,
            label: "Shifts",
            match: (p: string) => p.includes("/shifts")
        },
        {
            href: `/dashboard/${serverId}/logs`,
            icon: Search,
            label: "Logs",
            match: (p: string) => p.includes("/logs")
        },
        {
            href: `/dashboard/${serverId}/settings`,
            icon: Settings,
            label: "Settings",
            match: (p: string) => p.includes("/settings") || p.includes("/admin")
        }
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#2a2a2a] pb-safe md:hidden">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const isActive = item.match(pathname)
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? "text-indigo-400"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

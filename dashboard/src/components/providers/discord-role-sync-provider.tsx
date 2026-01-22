"use client"

import { useDiscordRoleSync } from "@/hooks/use-discord-role-sync"

interface DiscordRoleSyncProviderProps {
    serverId: string
    children: React.ReactNode
}

export function DiscordRoleSyncProvider({ serverId, children }: DiscordRoleSyncProviderProps) {
    // This hook runs once on mount to sync Discord roles
    useDiscordRoleSync({ serverId })

    return <>{children}</>
}

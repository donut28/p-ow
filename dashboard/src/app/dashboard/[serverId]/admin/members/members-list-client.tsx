
"use client"

import { useState, useEffect, useRef } from "react"
import { RefreshCw, User, Shield, Loader2, Search } from "lucide-react"

interface Role {
    id: string
    name: string
    color: string
}

interface ClerkUser {
    id: string
    username: string | null
    name: string | null
    image: string
    discordId?: string
    discordUsername?: string
    robloxId?: string
    robloxUsername?: string
}

interface ExistingMember {
    id: string
    userId: string
    isAdmin: boolean
    role: Role | null
}

interface Server {
    id: string
    name: string
    customName: string | null
}

interface MembersListClientProps {
    serverId: string
    roles: Role[]
    servers: Server[]
    existingMembers: ExistingMember[]
}

export function MembersListClient({ serverId, roles, servers, existingMembers }: MembersListClientProps) {
    const [users, setUsers] = useState<ClerkUser[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [updating, setUpdating] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [memberMap, setMemberMap] = useState<Record<string, ExistingMember>>({})
    const isMounted = useRef(true)

    // Build member map from existing members (indexed by various IDs)
    useEffect(() => {
        const map: Record<string, ExistingMember> = {}
        existingMembers.forEach(m => {
            map[m.userId] = m
        })
        setMemberMap(map)
    }, [existingMembers])

    // Fetch all Clerk users
    useEffect(() => {
        isMounted.current = true
        
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/admin/users")
                if (res.ok && isMounted.current) {
                    const data = await res.json()
                    setUsers(data.users)
                }
            } catch (e) {
                console.error("Error fetching users:", e)
            } finally {
                if (isMounted.current) {
                    setLoading(false)
                }
            }
        }
        
        fetchUsers()
        
        return () => {
            isMounted.current = false
        }
    }, [])

    // Find member record for a user (try clerk id, discord id, roblox id)
    const getMemberForUser = (user: ClerkUser): ExistingMember | null => {
        return memberMap[user.id] ||
            (user.discordId && memberMap[user.discordId]) ||
            (user.robloxId && memberMap[user.robloxId]) ||
            null
    }

    const handleRoleChange = async (user: ClerkUser, roleId: string | null) => {
        setUpdating(user.id)

        // Determine user ID to use (prefer roblox, then discord, then clerk)
        const userId = user.robloxId || user.discordId || user.id
        const member = getMemberForUser(user)

        try {
            if (member) {
                // Update existing member
                await fetch("/api/admin/members/role", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ memberId: member.id, roleId })
                })
            } else {
                // Create new member with role
                await fetch("/api/admin/members", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ serverId, userId, roleId })
                })
            }

            // Refresh member list
            const res = await fetch(`/api/admin/members?serverId=${serverId}`)
            if (res.ok) {
                const data = await res.json()
                const newMap: Record<string, ExistingMember> = {}
                data.members.forEach((m: ExistingMember) => {
                    newMap[m.userId] = m
                })
                setMemberMap(newMap)
            }
        } catch (e) {
            console.error("Error updating role:", e)
        } finally {
            setUpdating(null)
        }
    }

    const handleSyncRoles = async () => {
        setSyncing(true)
        try {
            await fetch("/api/admin/members/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId })
            })
            window.location.reload()
        } catch (e) {
            console.error("Error syncing roles:", e)
        } finally {
            setSyncing(false)
        }
    }

    // Filter users by search
    const filteredUsers = users.filter(u => {
        const searchLower = search.toLowerCase()
        return (
            u.username?.toLowerCase().includes(searchLower) ||
            u.name?.toLowerCase().includes(searchLower) ||
            u.discordUsername?.toLowerCase().includes(searchLower) ||
            u.robloxUsername?.toLowerCase().includes(searchLower)
        )
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Search and Sync */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search members..."
                        className="w-full bg-[#222] border border-[#333] rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                </div>
                {servers.length > 1 && (
                    <button
                        onClick={handleSyncRoles}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                    >
                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Sync Roles
                    </button>
                )}
            </div>

            {/* Members Table */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#222] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#222]">
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">User</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Discord</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Roblox</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Role</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                    No members found
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => {
                                const member = getMemberForUser(user)
                                return (
                                    <tr key={user.id} className="border-b border-[#222] last:border-0 hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.image}
                                                    alt=""
                                                    className="h-8 w-8 rounded-full"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-white">
                                                        {user.name || user.username || "Unknown"}
                                                    </div>
                                                    {user.username && (
                                                        <div className="text-xs text-zinc-500">@{user.username}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.discordUsername ? (
                                                <span className="text-sm text-indigo-400">{user.discordUsername}</span>
                                            ) : (
                                                <span className="text-xs text-zinc-600">Not linked</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.robloxUsername ? (
                                                <span className="text-sm text-emerald-400">{user.robloxUsername}</span>
                                            ) : (
                                                <span className="text-xs text-zinc-600">Not linked</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={member?.role?.id || ""}
                                                onChange={(e) => handleRoleChange(user, e.target.value || null)}
                                                disabled={updating === user.id}
                                                className="bg-[#222] border border-[#333] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                            >
                                                <option value="">No Role</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            {member?.isAdmin && (
                                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                                    <Shield className="h-3 w-3" />
                                                    Admin
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-zinc-600 text-center">
                Showing {filteredUsers.length} of {users.length} registered accounts
            </p>
        </div>
    )
}


"use client"

import { useState, useEffect, useRef } from "react"
import { UserPlus, X, Loader2, Search, Check, User } from "lucide-react"

interface Admin {
    id: string
    userId: string
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

interface AdminAccessManagerProps {
    serverId: string
    admins: Admin[]
}

export function AdminAccessManager({ serverId, admins: initialAdmins }: AdminAccessManagerProps) {
    const [admins, setAdmins] = useState(initialAdmins)
    const [users, setUsers] = useState<ClerkUser[]>([])
    const [adminUserInfo, setAdminUserInfo] = useState<Map<string, ClerkUser>>(new Map())
    const [search, setSearch] = useState("")
    const [showDropdown, setShowDropdown] = useState(false)
    const [adding, setAdding] = useState(false)
    const [removing, setRemoving] = useState<string | null>(null)
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [loadingAdminInfo, setLoadingAdminInfo] = useState(true)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch admin user info on mount
    useEffect(() => {
        fetchAdminUserInfo()
    }, [])

    // Fetch admin user info for existing admins
    const fetchAdminUserInfo = async () => {
        setLoadingAdminInfo(true)
        try {
            // Fetch all users and match to admins
            const res = await fetch("/api/admin/users?limit=200")
            if (res.ok) {
                const data = await res.json()
                const allUsers: ClerkUser[] = data.users || []

                // Build a map of userId -> user info
                const infoMap = new Map<string, ClerkUser>()
                for (const admin of admins) {
                    const user = allUsers.find(u =>
                        u.id === admin.userId ||
                        u.discordId === admin.userId ||
                        u.robloxId === admin.userId
                    )
                    if (user) {
                        infoMap.set(admin.userId, user)
                    }
                }
                setAdminUserInfo(infoMap)
            }
        } catch (e) {
            console.error("Error fetching admin user info:", e)
        } finally {
            setLoadingAdminInfo(false)
        }
    }

    // Fetch users when search changes
    useEffect(() => {
        if (search.length >= 1) {
            fetchUsers()
        } else {
            setUsers([])
        }
    }, [search])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchUsers = async () => {
        setLoadingUsers(true)
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users)
            }
        } catch (e) {
            console.error("Error fetching users:", e)
        } finally {
            setLoadingUsers(false)
        }
    }

    const handleAddAdmin = async (user: ClerkUser) => {
        setAdding(true)
        setShowDropdown(false)
        setSearch("")

        // Use roblox ID if available, otherwise discord, otherwise clerk ID
        const userId = user.robloxId || user.discordId || user.id

        try {
            const res = await fetch("/api/admin/grant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId, userId })
            })

            if (res.ok) {
                const data = await res.json()
                setAdmins(prev => [...prev, { id: data.id, userId }])
                // Also add to adminUserInfo so their info displays immediately
                setAdminUserInfo(prev => new Map(prev).set(userId, user))
            }
        } catch (e) {
            console.error("Error adding admin:", e)
        } finally {
            setAdding(false)
        }
    }

    const handleRemove = async (memberId: string) => {
        setRemoving(memberId)

        try {
            const res = await fetch("/api/admin/revoke", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId, memberId })
            })

            if (res.ok) {
                setAdmins(prev => prev.filter(a => a.id !== memberId))
            }
        } catch (e) {
            console.error("Error removing admin:", e)
        } finally {
            setRemoving(null)
        }
    }

    // Get display name for an admin (use cached admin info or search results)
    const getAdminDisplayInfo = (admin: Admin): { name: string, avatar?: string, robloxUsername?: string } => {
        // First check the pre-fetched admin user info
        const cachedUser = adminUserInfo.get(admin.userId)
        if (cachedUser) {
            return {
                name: cachedUser.robloxUsername || cachedUser.name || cachedUser.username || admin.userId,
                avatar: cachedUser.image,
                robloxUsername: cachedUser.robloxUsername || undefined
            }
        }

        // Fallback to search results
        const user = users.find(u =>
            u.id === admin.userId ||
            u.discordId === admin.userId ||
            u.robloxId === admin.userId
        )

        if (user) {
            return {
                name: user.robloxUsername || user.name || user.username || admin.userId,
                avatar: user.image,
                robloxUsername: user.robloxUsername || undefined
            }
        }

        return { name: admin.userId }
    }

    // Filter out users who are already admins
    const filteredUsers = users.filter(u => {
        const isAlreadyAdmin = admins.some(a =>
            a.userId === u.id ||
            a.userId === u.discordId ||
            a.userId === u.robloxId
        )
        return !isAlreadyAdmin
    })

    return (
        <div className="space-y-4">
            {/* Search and Add */}
            <div className="relative" ref={dropdownRef}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search for a user to add as admin..."
                        className="w-full bg-[#222] border border-[#333] rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                    {adding && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-400" />
                    )}
                </div>

                {/* Dropdown */}
                {showDropdown && search.length >= 1 && (
                    <div className="absolute z-10 w-full mt-2 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl max-h-64 overflow-y-auto">
                        {loadingUsers ? (
                            <div className="px-4 py-3 flex items-center gap-2 text-zinc-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="px-4 py-3 text-zinc-500 text-sm">
                                No users found
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleAddAdmin(user)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <img
                                        src={user.image}
                                        alt=""
                                        className="h-8 w-8 rounded-full"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {user.name || user.username || "Unknown"}
                                        </div>
                                        <div className="text-xs text-zinc-500 flex gap-2">
                                            {user.discordUsername && (
                                                <span className="text-indigo-400">Discord: {user.discordUsername}</span>
                                            )}
                                            {user.robloxUsername && (
                                                <span className="text-emerald-400">Roblox: {user.robloxUsername}</span>
                                            )}
                                        </div>
                                    </div>
                                    <UserPlus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Admin List */}
            <div className="space-y-2">
                <p className="text-sm text-zinc-500">{admins.length} admin(s)</p>

                {loadingAdminInfo && admins.length > 0 ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading admin info...</span>
                    </div>
                ) : admins.length === 0 ? (
                    <p className="text-sm text-zinc-600 py-4 text-center">No admins added yet. Only you (superadmin) have access.</p>
                ) : (
                    <div className="space-y-2">
                        {admins.map(admin => {
                            const info = getAdminDisplayInfo(admin)
                            return (
                                <div
                                    key={admin.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[#222] border border-[#333]"
                                >
                                    <div className="flex items-center gap-3">
                                        {info.avatar ? (
                                            <img src={info.avatar} alt="" className="h-8 w-8 rounded-full" />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                                <span className="text-xs text-zinc-400">?</span>
                                            </div>
                                        )}
                                        <p className="text-sm text-white">{info.name}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(admin.id)}
                                        disabled={removing === admin.id}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                    >
                                        {removing === admin.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { Crown, Zap, Star, Check, Link2, Unlink, Loader2, ChevronRight, ArrowLeft, Server } from "lucide-react"
import Link from "next/link"

interface ServerOption {
    id: string
    name: string
    currentPlan: string
    isLinkedToMe: boolean
}

interface SubscriptionData {
    userPlan: string
    linkedServerId?: string
    servers: ServerOption[]
}

export default function SubscriptionPage() {
    const [data, setData] = useState<SubscriptionData | null>(null)
    const [loading, setLoading] = useState(true)
    const [linking, setLinking] = useState(false)
    const [selectedServer, setSelectedServer] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/subscription/link")
            .then(res => res.json())
            .then(d => {
                setData(d)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const handleLink = async (serverId: string) => {
        setLinking(true)
        setSelectedServer(serverId)

        try {
            // Default to pow-pro, user would select plan in real flow
            const res = await fetch("/api/subscription/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serverId, plan: "pow-pro" })
            })

            if (res.ok) {
                // Refresh data
                const updated = await fetch("/api/subscription/link").then(r => r.json())
                setData(updated)
            }
        } catch (e) {
            console.error("Failed to link:", e)
        } finally {
            setLinking(false)
            setSelectedServer(null)
        }
    }

    const handleUnlink = async () => {
        setLinking(true)

        try {
            const res = await fetch("/api/subscription/link", { method: "DELETE" })
            if (res.ok) {
                const updated = await fetch("/api/subscription/link").then(r => r.json())
                setData(updated)
            }
        } catch (e) {
            console.error("Failed to unlink:", e)
        } finally {
            setLinking(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    const linkedServer = data?.servers.find(s => s.isLinkedToMe)
    const hasUserPlan = data?.userPlan === "pow-pro-user"

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Header */}
            <header className="border-b border-[#222]">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Dashboard
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-2">Your Subscription</h1>
                <p className="text-zinc-400 mb-8">Manage your POW subscription and link it to a server</p>

                {/* Current Plan */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${hasUserPlan ? "bg-blue-500/10" : "bg-zinc-500/10"
                            }`}>
                            {hasUserPlan
                                ? <Zap className="h-7 w-7 text-blue-400" />
                                : <Star className="h-7 w-7 text-zinc-400" />
                            }
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">{hasUserPlan ? "POW Pro User" : "Free"}</h2>
                            <p className="text-zinc-400 text-sm">
                                {hasUserPlan
                                    ? "Personal subscription with Vision access"
                                    : "Upgrade to unlock premium features"
                                }
                            </p>
                        </div>
                        {!hasUserPlan && (
                            <Link
                                href="/pricing"
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Upgrade
                            </Link>
                        )}
                    </div>
                </div>

                {/* Linked Server */}
                {linkedServer && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 p-6 mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <Link2 className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-purple-400 font-medium">Linked Server</p>
                                    <h3 className="text-xl font-bold text-white">{linkedServer.name}</h3>
                                </div>
                            </div>
                            <button
                                onClick={handleUnlink}
                                disabled={linking}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors border border-red-500/20"
                            >
                                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                Unlink
                            </button>
                        </div>
                    </div>
                )}

                {/* Available Servers */}
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] overflow-hidden">
                    <div className="p-6 border-b border-[#222]">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Server className="h-5 w-5 text-zinc-400" />
                            {linkedServer ? "Change Linked Server" : "Link Your Subscription"}
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                            Select a server to receive your subscription benefits
                        </p>
                    </div>

                    {(data?.servers || []).length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            You're not a member of any servers yet
                        </div>
                    ) : (
                        <div className="divide-y divide-[#222]">
                            {data?.servers.map((server) => (
                                <div
                                    key={server.id}
                                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                                            {server.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{server.name}</p>
                                            <p className="text-xs text-zinc-500">
                                                Current: {server.currentPlan === "free" ? "Free" : server.currentPlan.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>

                                    {server.isLinkedToMe ? (
                                        <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                                            <Check className="h-4 w-4" />
                                            Linked
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleLink(server.id)}
                                            disabled={linking}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            {linking && selectedServer === server.id
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <Link2 className="h-4 w-4" />
                                            }
                                            Link
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

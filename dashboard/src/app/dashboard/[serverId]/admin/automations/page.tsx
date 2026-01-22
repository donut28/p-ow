"use client"

import { useState, useEffect, use } from "react"
import { Plus, Zap, Trash2, Edit2, Loader2 } from "lucide-react"
import { AutomationEditor } from "./automation-editor"
import { ConfirmModal } from "@/components/ui/confirm-modal"

interface Automation {
    id: string
    name: string
    enabled: boolean
    trigger: string
    conditions: string
    actions: string
    createdAt?: string
}

export default function AutomationsPage({ params: paramsPromise }: { params: Promise<{ serverId: string }> }) {
    const params = use(paramsPromise)
    const [automations, setAutomations] = useState<Automation[]>([])
    const [loading, setLoading] = useState(true)
    const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)

    useEffect(() => {
        fetchAutomations()
    }, [params.serverId])

    const fetchAutomations = async () => {
        try {
            const res = await fetch(`/api/admin/automations?serverId=${params.serverId}`)
            if (res.ok) {
                const data = await res.json()
                setAutomations(data)
            }
        } catch (e) {
            console.error("Failed to load automations", e)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        setConfirmId(id)
    }

    const confirmDelete = async () => {
        if (!confirmId) return
        const id = confirmId
        setConfirmId(null)

        setDeleting(id)
        try {
            const res = await fetch("/api/admin/automations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, serverId: params.serverId })
            })
            if (res.ok) {
                setAutomations(prev => prev.filter(a => a.id !== id))
            }
        } catch (e) {
            console.error("Failed to delete", e)
        } finally {
            setDeleting(null)
        }
    }

    const handleSave = (savedAutomation: Automation) => {
        // If it was an update, replace it. If new, add it.
        setAutomations(prev => {
            const index = prev.findIndex(a => a.id === savedAutomation.id)
            if (index >= 0) {
                // Determine if we should sort? For now just replace
                const newArr = [...prev]
                newArr[index] = savedAutomation
                return newArr
            } else {
                return [savedAutomation, ...prev]
            }
        })
        setCreating(false)
        setEditingAutomation(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Automations</h1>
                    <p className="text-zinc-400">Create triggers and actions to automate your server.</p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus className="h-4 w-4" />
                    New Automation
                </button>
            </div>

            {automations.length === 0 ? (
                <div className="bg-[#1a1a1a] rounded-xl border border-[#222] p-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-6 w-6 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Automations</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mb-6">
                        Set up automated workflows to handle repetitive tasks like welcome messages, logging specific events, or syncing roles.
                    </p>
                    <button
                        onClick={() => setCreating(true)}
                        className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors"
                    >
                        Create your first automation
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {automations.map(automation => {
                        const actionCount = JSON.parse(automation.actions || "[]").length
                        return (
                            <div
                                key={automation.id}
                                className="group bg-[#1a1a1a] border border-[#222] rounded-xl p-4 flex items-center justify-between hover:border-[#333] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${automation.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">{automation.name}</h3>
                                            {!automation.enabled && (
                                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-500 flex items-center gap-2 mt-0.5">
                                            <span className="bg-[#222] px-1.5 py-0.5 rounded text-xs text-zinc-400 font-mono">
                                                {automation.trigger}
                                            </span>
                                            <span>→</span>
                                            <span>{actionCount} action{actionCount !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingAutomation(automation)}
                                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(automation.id)}
                                        disabled={deleting === automation.id}
                                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        {deleting === automation.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {(creating || editingAutomation) && (
                <AutomationEditor
                    serverId={params.serverId}
                    automation={editingAutomation || undefined}
                    onClose={() => {
                        setCreating(false)
                        setEditingAutomation(null)
                    }}
                    onSave={handleSave}
                />
            )}

            <ConfirmModal
                isOpen={!!confirmId}
                onClose={() => setConfirmId(null)}
                onConfirm={confirmDelete}
                title="Delete Automation"
                description="Are you sure you want to delete this automation? This action cannot be undone and any associated automated tasks will stop immediately."
                confirmLabel="Delete Automation"
                isLoading={!!deleting}
            />
        </div>
    )
}

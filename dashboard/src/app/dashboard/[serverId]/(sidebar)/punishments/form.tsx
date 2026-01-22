
"use client"

import { useFormState } from "react-dom"
import { createPunishment } from "./actions"

export function CreatePunishmentForm({ serverId }: { serverId: string }) {
    const [state, formAction] = useFormState(createPunishment, { message: "" })

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="serverId" value={serverId} />

            <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Username</label>
                <input
                    name="username"
                    required
                    placeholder="Roblox Username"
                    className="w-full rounded bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
                <select
                    name="type"
                    className="w-full rounded bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="Warn">Warn</option>
                    <option value="Kick">Kick</option>
                    <option value="Ban">Ban</option>
                    <option value="Ban Bolo">Ban Bolo</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Reason</label>
                <textarea
                    name="reason"
                    required
                    rows={3}
                    placeholder="Reason for punishment..."
                    className="w-full rounded bg-zinc-950 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            {state?.message && (
                <p className={`text-xs ${state.success ? 'text-emerald-400' : 'text-red-400'}`}>{state.message}</p>
            )}

            <button
                type="submit"
                className="w-full rounded bg-indigo-500 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition-colors"
            >
                Execute Punishment
            </button>
        </form>
    )
}

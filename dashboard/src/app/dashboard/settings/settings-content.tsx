"use client"

import { useActionState } from "react"
import { addServer } from "./actions"
import { Server } from "lucide-react"

const initialState = {
    message: "",
}

interface SettingsContentProps {
    isSuperAdmin: boolean
}

export default function SettingsContent({ isSuperAdmin }: SettingsContentProps) {
    const [state, formAction, isPending] = useActionState(addServer, initialState)

    if (!isSuperAdmin) {
        return (
            <div className="mx-auto mt-12 max-w-xl text-center p-8 bg-zinc-900/50 rounded-xl border border-white/5">
                <p className="text-zinc-400">You do not have permission to manage global settings.</p>
            </div>
        )
    }

    return (
        <div className="mx-auto mt-12 max-w-md rounded-xl border border-white/5 bg-zinc-900/50 p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                    <Server className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-lg font-medium text-white">Add New Server</h2>
                    <p className="text-xs text-zinc-500">Enter your Private Server API Key</p>
                </div>
            </div>

            <form action={formAction} className="space-y-4">
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-400">
                        Server API Key
                    </label>
                    <input
                        type="password"
                        name="apiKey"
                        id="apiKey"
                        required
                        className="mt-1 block w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Paste key here..."
                    />
                </div>

                {state?.message && (
                    <p className="text-sm text-red-400">{state.message}</p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full justify-center rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                >
                    {isPending ? "Adding..." : "Add Server"}
                </button>
            </form>
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { toggleShift } from "./actions"
import { useActionState } from "react"
import { Calendar, Lock, AlertCircle } from "lucide-react"
import { usePermissions } from "@/components/auth/role-sync-wrapper"

export function ShiftButton({ isActive: initialActive, serverId, disabled }: { isActive: boolean, serverId: string, disabled?: boolean }) {
    const [state, formAction, isPending] = useActionState(toggleShift, null)
    const { permissions } = usePermissions()
    const [isActive, setIsActive] = useState(initialActive)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Handle action response - check for errors
    useEffect(() => {
        if (state) {
            if (state.active !== undefined) {
                // Success - update active state
                setIsActive(state.active)
                setErrorMessage(null)
            } else if (state.message && !state.message.includes("Successfully")) {
                // Error message - show it
                setErrorMessage(state.message)
            }
        }
    }, [state])

    // Clear error after 5 seconds
    useEffect(() => {
        if (errorMessage) {
            const timeout = setTimeout(() => setErrorMessage(null), 5000)
            return () => clearTimeout(timeout)
        }
    }, [errorMessage])

    // Poll for shift status every 3 seconds to sync with in-game changes
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/shifts/status?serverId=${serverId}`)
                if (res.ok) {
                    const data = await res.json()
                    setIsActive(data.active)
                }
            } catch (e) {
                // Ignore errors
            }
        }

        const pollInterval = setInterval(checkStatus, 3000)
        return () => clearInterval(pollInterval)
    }, [serverId])

    // Also update when initial prop changes
    useEffect(() => {
        setIsActive(initialActive)
    }, [initialActive])

    if (disabled) {
        return (
            <div className="w-full max-w-xs mx-auto rounded-lg px-4 py-3 bg-zinc-700 text-zinc-400 text-center flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">On LOA</span>
            </div>
        )
    }

    if (!permissions.canShift) {
        return (
            <div className="w-full max-w-xs mx-auto rounded-lg px-4 py-3 bg-zinc-800 text-zinc-500 text-center flex items-center justify-center gap-2 border border-zinc-700">
                <Lock className="h-4 w-4" />
                <span className="font-semibold">No Permission</span>
            </div>
        )
    }

    return (
        <div className="w-full">
            <form action={formAction} className="w-full flex justify-center">
                <input type="hidden" name="serverId" value={serverId} />
                <button
                    type="submit"
                    disabled={isPending}
                    className={`w-full max-w-xs rounded-lg px-4 py-3 font-semibold text-white transition-all ${isActive
                        ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isPending ? "Processing..." : isActive ? "Clock Out" : "Clock In"}
                </button>
            </form>

            {/* Error message display */}
            {errorMessage && (
                <div className="mt-3 mx-auto max-w-xs flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}
        </div>
    )
}

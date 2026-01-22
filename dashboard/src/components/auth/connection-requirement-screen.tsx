"use client"

import { UserButton } from "@clerk/nextjs"

interface ConnectionRequirementScreenProps {
    missing: string[] // "Discord" | "Roblox"
    discordUsername?: string | null
    robloxUsername?: string | null
}

export function ConnectionRequirementScreen({ missing, discordUsername, robloxUsername }: ConnectionRequirementScreenProps) {
    const isDiscordConnected = !missing.includes("Discord")
    const isRobloxConnected = !missing.includes("Roblox")

    // If for some reason we render this with no missing connections, return null
    if (missing.length === 0) return null

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 p-4 text-white font-sans">
            <div className="max-w-md w-full text-center space-y-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Account Connection Required</h1>
                    <p className="text-zinc-400">
                        To access this area, you must link your <strong>{missing.join(" and ")}</strong> account{missing.length > 1 ? "s" : ""} to your profile.
                    </p>
                </div>

                <div className="space-y-3 text-left">
                    {/* Discord Status */}
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${isDiscordConnected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-zinc-900 border border-white/10"}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDiscordConnected ? "bg-emerald-500" : "bg-zinc-700"}`}>
                            {isDiscordConnected ? (
                                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="text-xs text-zinc-400">1</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium ${isDiscordConnected ? "text-emerald-400" : "text-white"}`}>Discord</p>
                            <p className="text-xs text-zinc-500 truncate">
                                {isDiscordConnected ? `Connected as ${discordUsername}` : "Required for staff identification"}
                            </p>
                        </div>
                    </div>

                    {/* Roblox Status */}
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${isRobloxConnected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-zinc-900 border border-white/10"}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isRobloxConnected ? "bg-emerald-500" : "bg-zinc-700"}`}>
                            {isRobloxConnected ? (
                                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="text-xs text-zinc-400">2</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium ${isRobloxConnected ? "text-emerald-400" : "text-white"}`}>Roblox</p>
                            <p className="text-xs text-zinc-500 truncate">
                                {isRobloxConnected ? `Connected as ${robloxUsername}` : "Required for in-game verification"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900 p-8 rounded-xl border border-white/10 flex flex-col items-center gap-4 shadow-xl">
                    <div className="flex flex-col items-center gap-2">
                        <div className="mb-2 text-sm text-zinc-300 font-medium">Click your avatar below:</div>
                        <div className="scale-125">
                            <UserButton afterSignOutUrl="/login" />
                        </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-4 px-4">
                        Go to <strong>Manage Account</strong> &gt; <strong>Social Connections</strong> to link your accounts.
                    </div>
                </div>
            </div>
        </div>
    )
}

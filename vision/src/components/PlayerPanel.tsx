import { useState } from 'react'

interface PlayerData {
    id: number
    name: string
    displayName: string
    avatar?: string
    created?: string
    online?: boolean
    team?: string
    punishmentCount?: number
}

interface PlayerPanelProps {
    player: PlayerData | null
    isProcessing: boolean
    error: string | null
    onSearch: (username: string) => void
    onClear: () => void
}

export function PlayerPanel({ player, isProcessing, error, onSearch, onClear }: PlayerPanelProps) {
    const [searchValue, setSearchValue] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchValue.trim()) {
            onSearch(searchValue.trim())
        }
    }

    return (
        <div className="p-4 h-full flex flex-col">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search username..."
                        className="w-full bg-pow-card border border-pow-border rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
                    >
                        <SearchIcon />
                    </button>
                </div>
            </form>

            {/* Processing State */}
            {isProcessing && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-white/50 text-sm">Scanning...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !isProcessing && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
            )}

            {/* Player Info */}
            {player && !isProcessing && (
                <div className="flex-1 overflow-y-auto">
                    {/* Profile Card */}
                    <div className="bg-pow-card border border-pow-border rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-4">
                            {player.avatar ? (
                                <img src={player.avatar} alt="" className="w-14 h-14 rounded-full bg-pow-border" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-pow-border flex items-center justify-center">
                                    <UserIcon />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-white font-bold truncate">{player.displayName}</h2>
                                <p className="text-white/50 text-sm">@{player.name}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold ${player.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                                }`}>
                                {player.online ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-pow-bg rounded-lg p-2">
                                <p className="text-white/40 text-xs">Roblox ID</p>
                                <p className="text-white font-mono">{player.id}</p>
                            </div>
                            {player.team && (
                                <div className="bg-pow-bg rounded-lg p-2">
                                    <p className="text-white/40 text-xs">Team</p>
                                    <p className="text-white">{player.team}</p>
                                </div>
                            )}
                        </div>

                        {/* Punishment Warning */}
                        {player.punishmentCount && player.punishmentCount > 0 && (
                            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-center gap-2">
                                <WarningIcon />
                                <span className="text-amber-400 text-sm font-medium">
                                    {player.punishmentCount} prior punishment{player.punishmentCount > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                        <p className="text-white/40 text-xs uppercase font-bold px-1">Quick Actions</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg p-3 text-sm font-medium transition-colors">
                                Warn
                            </button>
                            <button className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg p-3 text-sm font-medium transition-colors">
                                Kick
                            </button>
                            <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg p-3 text-sm font-medium transition-colors">
                                Ban
                            </button>
                        </div>
                        <button
                            onClick={onClear}
                            className="w-full bg-pow-card hover:bg-pow-border text-white/60 rounded-lg p-2 text-sm transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!player && !isProcessing && !error && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-pow-card border border-pow-border flex items-center justify-center mx-auto mb-3">
                            <ScanIcon />
                        </div>
                        <p className="text-white/50 text-sm">Press <kbd className="bg-pow-card px-1.5 py-0.5 rounded text-white/70">Alt+V</kbd> to scan</p>
                        <p className="text-white/30 text-xs mt-1">or search manually above</p>
                    </div>
                </div>
            )}
        </div>
    )
}

function SearchIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    )
}

function UserIcon() {
    return (
        <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    )
}

function WarningIcon() {
    return (
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    )
}

function ScanIcon() {
    return (
        <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    )
}

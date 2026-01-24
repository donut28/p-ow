import { useState, useEffect, useCallback } from 'react'
import { PlayerPanel } from './components/PlayerPanel'
import { Settings } from './components/Settings'
import { LoginScreen } from './components/LoginScreen'
import { useOcr } from './hooks/useOcr'

type View = 'main' | 'settings'

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

function App() {
    const [view, setView] = useState<View>('main')
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [player, setPlayer] = useState<PlayerData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { processCapture, isProcessing } = useOcr()

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = await window.electronAPI.getAuthToken()
            setIsLoggedIn(!!token)
            setIsLoading(false)
        }
        checkAuth()
    }, [])

    // Listen for capture trigger from hotkey
    useEffect(() => {
        const cleanup = window.electronAPI.onTriggerCapture(async () => {
            setError(null)

            // Capture screen and run OCR
            const screenshot = await window.electronAPI.captureScreen()
            if (!screenshot) {
                setError('Failed to capture screen')
                return
            }

            const detectedName = await processCapture(screenshot)
            if (detectedName) {
                await lookupPlayer(detectedName)
            } else {
                setError('Could not detect player name')
            }
        })

        return cleanup
    }, [processCapture])

    // Lookup player via API
    const lookupPlayer = async (username: string) => {
        try {
            const token = await window.electronAPI.getAuthToken()
            if (!token) {
                setIsLoggedIn(false)
                return
            }

            // TODO: Replace with actual dashboard URL
            const res = await fetch(`http://localhost:3000/api/roblox/user?username=${encodeURIComponent(username)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()
                setPlayer(data)
            } else if (res.status === 401) {
                setIsLoggedIn(false)
                await window.electronAPI.clearAuthToken()
            } else {
                setError('Player not found')
            }
        } catch (e) {
            setError('Failed to lookup player')
        }
    }

    // Manual search
    const handleSearch = useCallback(async (username: string) => {
        setError(null)
        await lookupPlayer(username)
    }, [])

    const handleLogout = async () => {
        await window.electronAPI.clearAuthToken()
        setIsLoggedIn(false)
        setPlayer(null)
    }

    const handleLoginSuccess = () => {
        setIsLoggedIn(true)
    }

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-pow-bg/95 rounded-2xl">
                <div className="text-white/50">Loading...</div>
            </div>
        )
    }

    if (!isLoggedIn) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />
    }

    return (
        <div className="w-full h-screen bg-pow-bg/95 rounded-2xl border border-pow-border overflow-hidden flex flex-col">
            {/* Header - Draggable */}
            <header className="drag-region flex items-center justify-between p-3 border-b border-pow-border bg-pow-card/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        P
                    </div>
                    <span className="text-white font-semibold text-sm">POW Vision</span>
                </div>
                <div className="no-drag flex items-center gap-1">
                    <button
                        onClick={() => setView(view === 'main' ? 'settings' : 'main')}
                        className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <SettingsIcon />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-hidden">
                {view === 'settings' ? (
                    <Settings onBack={() => setView('main')} onLogout={handleLogout} />
                ) : (
                    <PlayerPanel
                        player={player}
                        isProcessing={isProcessing}
                        error={error}
                        onSearch={handleSearch}
                        onClear={() => setPlayer(null)}
                    />
                )}
            </main>

            {/* Footer */}
            <footer className="p-2 border-t border-pow-border text-center">
                <span className="text-white/30 text-xs">Press Alt+V to scan • Alt+Shift+V to toggle</span>
            </footer>
        </div>
    )
}

function SettingsIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    )
}

export default App

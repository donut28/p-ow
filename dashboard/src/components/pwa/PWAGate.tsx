"use client"

import { useState, useEffect } from "react"
import { Download, Share, Plus, MoreVertical, ChevronRight } from "lucide-react"

/**
 * PWA Gate - Forces mobile users to install the app before using it
 * Blocks the entire UI on mobile browsers until installed as PWA
 */
export function PWAGate({ children }: { children: React.ReactNode }) {
    // Start with null states to ensure server/client match
    const [isMounted, setIsMounted] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

    useEffect(() => {
        // Mark as mounted first
        setIsMounted(true)

        // Check if running as installed PWA (standalone mode)
        const standalone = window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes("android-app://")
        setIsStandalone(standalone)

        // Check if mobile device
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        setIsMobile(mobile)

        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(ios)

        // Listen for install prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        // Listen for display mode changes
        window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
            setIsStandalone(e.matches)
        })

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        }
    }, [])

    // Handle Android install
    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === "accepted") {
            setDeferredPrompt(null)
            // Refresh to check standalone mode
            window.location.reload()
        }
    }

    // Server render AND initial client render: always show children
    // This prevents hydration mismatch
    if (!isMounted) {
        return <>{children}</>
    }

    // After mount: Desktop or already installed - show normal content
    if (!isMobile || isStandalone) {
        return <>{children}</>
    }

    // Mobile browser - show install gate
    return (
        <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-6 text-center">
            {/* Logo/Icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
                <span className="text-4xl font-bold text-white">P</span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Project Overwatch</h1>
            <p className="text-zinc-400 mb-8 max-w-sm">
                Install the app for the best experience on mobile
            </p>

            {/* iOS Instructions */}
            {isIOS && (
                <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] w-full max-w-sm">
                    <h2 className="text-lg font-bold text-white mb-4">How to Install</h2>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-400 font-bold text-sm">1</span>
                            </div>
                            <div>
                                <p className="text-white font-medium">Tap the Share button</p>
                                <p className="text-zinc-500 text-sm flex items-center gap-1">
                                    Look for <Share className="w-4 h-4" /> at the bottom
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-400 font-bold text-sm">2</span>
                            </div>
                            <div>
                                <p className="text-white font-medium">Add to Home Screen</p>
                                <p className="text-zinc-500 text-sm flex items-center gap-1">
                                    Scroll down and tap <Plus className="w-4 h-4" /> Add to Home Screen
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 text-left">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-400 font-bold text-sm">3</span>
                            </div>
                            <div>
                                <p className="text-white font-medium">Open the app</p>
                                <p className="text-zinc-500 text-sm">
                                    Find POW on your home screen
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Android Install Button */}
            {!isIOS && (
                <div className="w-full max-w-sm space-y-4">
                    {deferredPrompt ? (
                        <button
                            onClick={handleInstall}
                            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            Install App
                        </button>
                    ) : (
                        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
                            <h2 className="text-lg font-bold text-white mb-4">How to Install</h2>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-left">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-indigo-400 font-bold text-sm">1</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Open browser menu</p>
                                        <p className="text-zinc-500 text-sm flex items-center gap-1">
                                            Tap <MoreVertical className="w-4 h-4" /> in the top right
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-left">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-indigo-400 font-bold text-sm">2</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Install app</p>
                                        <p className="text-zinc-500 text-sm flex items-center gap-1">
                                            Tap "Install app" or "Add to Home screen"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <p className="text-zinc-600 text-sm mt-8">
                This app requires installation for optimal mobile experience
            </p>
        </div>
    )
}

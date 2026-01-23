"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface PWAContextType {
    isSupported: boolean
    isInstalled: boolean // true if standalone
    isMobile: boolean
    isIOS: boolean
    canInstall: boolean // true if prompt is available
    install: () => Promise<void>
}

const PWAContext = createContext<PWAContextType | null>(null)

export function usePWA() {
    const context = useContext(PWAContext)
    if (!context) {
        throw new Error("usePWA must be used within a PWAProvider")
    }
    return context
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [isSupported, setIsSupported] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

    useEffect(() => {
        setIsSupported(true)

        // Check if mobile
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        setIsMobile(mobile)
        
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
        setIsIOS(ios)

        // Check standalone
        const checkStandalone = () => {
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as any).standalone === true ||
                document.referrer.includes("android-app://")
            setIsInstalled(isStandalone)
        }
        
        checkStandalone()
        window.matchMedia("(display-mode: standalone)").addEventListener("change", checkStandalone)

        // Capture install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent default to suppress browser mini-infobar (mobile) or icon auto-show (desktop)
            // We want to control the UI
            e.preventDefault()
            setDeferredPrompt(e)
            console.log("[PWA] Install prompt captured")
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        }
    }, [])

    const install = async () => {
        if (!deferredPrompt) {
            console.error("[PWA] Install failed: No deferred prompt available")
            return
        }

        try {
            console.log("[PWA] Triggering install prompt...")
            await deferredPrompt.prompt()
            
            const { outcome } = await deferredPrompt.userChoice
            console.log(`[PWA] Install prompt outcome: ${outcome}`)

            if (outcome === "accepted") {
                setDeferredPrompt(null)
            }
        } catch (error) {
            console.error("[PWA] Install error:", error)
        }
    }

    return (
        <PWAContext.Provider value={{
            isSupported,
            isInstalled,
            isMobile,
            isIOS,
            canInstall: !!deferredPrompt,
            install
        }}>
            {children}
        </PWAContext.Provider>
    )
}

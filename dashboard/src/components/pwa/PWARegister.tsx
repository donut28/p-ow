"use client"

import { useEffect } from "react"

/**
 * Registers the service worker for PWA functionality
 */
export function PWARegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[PWA] Service worker registered:", registration.scope)
                })
                .catch((error) => {
                    console.error("[PWA] Service worker registration failed:", error)
                })
        }
    }, [])

    return null
}

'use client'

import { useState, useEffect } from 'react'
import { Wrench, RefreshCw } from 'lucide-react'

// Check maintenance flag via PostHog API (no cookies needed)
async function checkMaintenanceFlag(): Promise<boolean> {
    try {
        const response = await fetch('/api/maintenance-check', {
            cache: 'no-store', // Prevent browser caching
        })
        const data = await response.json()
        return data.maintenance === true
    } catch {
        return false
    }
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
    const [isMaintenance, setIsMaintenance] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        checkMaintenanceFlag().then((maintenance) => {
            setIsMaintenance(maintenance)
            setIsChecking(false)
        })

        // Re-check every 30 seconds in case maintenance ends
        const interval = setInterval(() => {
            checkMaintenanceFlag().then(setIsMaintenance)
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    // While checking, show children (don't block)
    if (isChecking) {
        return <>{children}</>
    }

    // Maintenance mode - show maintenance page
    if (isMaintenance) {
        return (
            <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-6 text-center">
                {/* Icon */}
                <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
                    <Wrench className="h-12 w-12 text-white" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Down for Maintenance</h1>
                <p className="text-zinc-400 mb-8 max-w-md">
                    We're performing scheduled maintenance to improve Project Overwatch.
                    We'll be back shortly!
                </p>

                <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] max-w-sm w-full">
                    <div className="flex items-center justify-center gap-3 text-zinc-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Checking status...</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-4">
                        This page will automatically refresh when we're back online.
                    </p>
                </div>

                <p className="text-zinc-600 text-sm mt-8">
                    Follow our Discord for updates
                </p>
            </div>
        )
    }

    // Not in maintenance - show normal content
    return <>{children}</>
}

"use client"

import { useEffect, useState } from "react"

interface ResponsiveModPanelProps {
    desktop: React.ReactNode
    mobile: React.ReactNode
}

/**
 * Wrapper that renders different layouts for mobile vs desktop
 * Uses CSS media query check for instant rendering without flash
 */
export function ResponsiveModPanel({ desktop, mobile }: ResponsiveModPanelProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Before mount, render both with CSS visibility to prevent flash
    if (!isMounted) {
        return (
            <>
                <div className="hidden md:block h-full">{desktop}</div>
                <div className="block md:hidden h-full">{mobile}</div>
            </>
        )
    }

    return (
        <>
            <div className="hidden md:block h-full">{desktop}</div>
            <div className="block md:hidden h-full">{mobile}</div>
        </>
    )
}

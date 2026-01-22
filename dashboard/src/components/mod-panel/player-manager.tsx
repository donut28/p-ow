
"use client"

import { useState, useEffect } from "react"
import { PlayerList, ParsedPlayer } from "./player-list"
import { PlayerSearch } from "./player-search"

export function PlayerManager({ serverId }: { serverId: string }) {
    const [players, setPlayers] = useState<ParsedPlayer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const res = await fetch(`/api/players?serverId=${serverId}`)
                if (res.ok) {
                    const data = await res.json()
                    setPlayers(data)
                }
            } catch (e) {
                console.error("Player fetch error", e)
            } finally {
                setLoading(false)
            }
        }

        fetchPlayers()
        const interval = setInterval(fetchPlayers, 10000) // 10 seconds as requested
        return () => clearInterval(interval)
    }, [serverId])

    return (
        <>
            <div className="relative flex-shrink-0">
                <PlayerSearch serverId={serverId} onlinePlayers={players} />
            </div>
            <div className="flex-1 overflow-hidden mt-3">
                <PlayerList serverId={serverId} players={players} />
            </div>
        </>
    )
}

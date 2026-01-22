
import { PrcClient } from "@/lib/prc"

// Global cache for server stats (10 second TTL)
interface CachedStats {
    online: boolean
    players: number
    maxPlayers: number
    timestamp: number
}

const statsCache = new Map<string, CachedStats>()
const CACHE_TTL = 10 * 1000 // 10 seconds

export async function fetchServerStats(apiUrl: string) {
    const now = Date.now()
    const cached = statsCache.get(apiUrl)

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return { online: cached.online, players: cached.players, maxPlayers: cached.maxPlayers }
    }

    try {
        const client = new PrcClient(apiUrl)
        const info = await client.getServer()
        const stats = { online: true, players: info.CurrentPlayers, maxPlayers: info.MaxPlayers }

        // Update cache
        statsCache.set(apiUrl, { ...stats, timestamp: now })

        return stats
    } catch (e) {
        console.error("Server stats error:", e)
        const stats = { online: false, players: 0, maxPlayers: 0 }

        // Cache failures for a shorter time (5s) to avoid spamming a down server
        statsCache.set(apiUrl, { ...stats, timestamp: now - 5000 })

        return stats
    }
}

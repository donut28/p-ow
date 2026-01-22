
import { prisma } from "./db"

interface ServerConfig {
    id: string
    apiUrl: string
    name: string
    staffRoleId?: string
    staffRequestChannelId?: string
}

const configCache = new Map<string, { data: ServerConfig, expiresAt: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute

/**
 * Fetches server configuration with a 1-minute memory cache.
 * Reduces database load for repetitive lookups during sync loops.
 */
export async function getServerConfig(serverId: string): Promise<ServerConfig | null> {
    const now = Date.now()
    const cached = configCache.get(serverId)

    if (cached && cached.expiresAt > now) {
        return cached.data
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: {
            id: true,
            apiUrl: true,
            name: true,
            staffRoleId: true,
            staffRequestChannelId: true
        }
    })

    if (!server) return null

    const data: ServerConfig = {
        id: server.id,
        apiUrl: server.apiUrl,
        name: server.name,
        staffRoleId: server.staffRoleId || undefined,
        staffRequestChannelId: server.staffRequestChannelId || undefined
    }

    configCache.set(serverId, {
        data,
        expiresAt: now + CACHE_TTL
    })

    return data
}

/**
 * Clears the cache for a specific server (e.g. after settings update)
 */
export function invalidateServerCache(serverId: string) {
    configCache.delete(serverId)
}

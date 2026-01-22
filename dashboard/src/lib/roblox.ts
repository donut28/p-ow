
import { getFromCache, setToCache, getFromCacheStale, cacheRobloxUser, getRobloxUserCache } from "./roblox-cache"

const OPEN_CLOUD_BASE = "https://apis.roblox.com/cloud/v2"

export interface RobloxUser {
    id: number
    name: string
    displayName: string
    description: string
    created: string
    isBanned: boolean
    hasVerifiedBadge: boolean
    avatar: string | null
}

async function fetchLegacyUserDetails(userId: number) {
    const detailsRes = await fetch(`https://users.roblox.com/v1/users/${userId}`, {
        headers: { "User-Agent": "ProjectOverwatch/1.0" },
        next: { revalidate: 3600 } // 1 hour Next.js cache
    } as any)

    // Handle rate limit
    if (detailsRes.status === 429) {
        throw new Error("RATE_LIMITED")
    }

    return await detailsRes.json()
}

export async function getRobloxUser(username: string): Promise<RobloxUser | null> {
    // @ts-ignore - Bypass environment type issues for process
    const apiKey = (globalThis as any).process?.env?.ROBLOX_API_KEY
    const cacheKey = `roblox:user:${username.toLowerCase()}`

    // 1. Check Cache (fresh)
    const cached = getFromCache<RobloxUser>(cacheKey)
    if (cached) return cached

    try {
        // 2. Search for User ID
        const searchRes = await fetch(
            `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`,
            {
                headers: { "User-Agent": "ProjectOverwatch/1.0" },
                next: { revalidate: 3600 }
            } as any
        )

        // Handle rate limit - return stale cache if available
        if (searchRes.status === 429) {
            console.warn(`Roblox API rate limited for ${username}, trying stale cache`)
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) return stale
            return null
        }

        if (!searchRes.ok) {
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) return stale
            return null
        }

        const searchData = await searchRes.json()
        if (!searchData.data || searchData.data.length === 0) return null

        const userId = searchData.data[0].id

        // 3. Fetch Details (Open Cloud or Legacy)
        let userDetails: any
        if (apiKey) {
            const ocRes = await fetch(`${OPEN_CLOUD_BASE}/users/${userId}`, {
                headers: { "x-api-key": apiKey },
                next: { revalidate: 3600 }
            } as any)
            if (ocRes.ok) {
                const ocData = await ocRes.json()
                userDetails = {
                    id: userId,
                    name: ocData.name || searchData.data[0].name,
                    displayName: ocData.displayName || searchData.data[0].displayName,
                    description: ocData.about || "",
                    created: ocData.createTime,
                    isBanned: false,
                    hasVerifiedBadge: ocData.idVerified || false
                }
            } else {
                userDetails = await fetchLegacyUserDetails(userId)
            }
        } else {
            userDetails = await fetchLegacyUserDetails(userId)
        }

        // 4. Fetch Avatar
        let avatar: string | null = null
        if (apiKey) {
            try {
                const thumbRes = await fetch(
                    `${OPEN_CLOUD_BASE}/users/${userId}:generateThumbnail`,
                    {
                        method: "POST",
                        headers: {
                            "x-api-key": apiKey,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            size: "SIZE_420X420",
                            format: "PNG",
                            shape: "ROUND"
                        })
                    }
                )
                if (thumbRes.ok) {
                    const thumbData = await thumbRes.json()
                    avatar = thumbData.imageUri || thumbData.response?.imageUri || null
                }
            } catch (e) { }
        }

        if (!avatar) {
            try {
                const thumbRes = await fetch(
                    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`,
                    { next: { revalidate: 3600 } } as any
                )
                const thumbData = await thumbRes.json()
                avatar = thumbData.data?.[0]?.imageUrl || null
            } catch (e) { }
        }

        const result: RobloxUser = {
            id: userId,
            name: userDetails.name || "",
            displayName: userDetails.displayName || "",
            description: userDetails.description || "",
            created: userDetails.created || "",
            isBanned: userDetails.isBanned || false,
            hasVerifiedBadge: userDetails.hasVerifiedBadge || false,
            avatar
        }

        // 5. Store Cache (by both username and ID)
        cacheRobloxUser(username, userId, result)
        return result

    } catch (e: any) {
        console.error(`Error fetching Roblox user ${username}:`, e)

        // On any error, try stale cache
        if (e.message === "RATE_LIMITED") {
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) return stale
        }

        return null
    }
}

// Get Roblox user by ID (with caching)
export async function getRobloxUserById(userId: number): Promise<RobloxUser | null> {
    const idCacheKey = `roblox:user:id:${userId}`

    // Check cache first
    const cached = getFromCache<RobloxUser>(idCacheKey)
    if (cached) return cached

    try {
        const userDetails = await fetchLegacyUserDetails(userId)

        if (!userDetails || userDetails.errors) {
            const stale = getFromCacheStale<RobloxUser>(idCacheKey)
            if (stale) return stale
            return null
        }

        // Fetch avatar
        let avatar: string | null = null
        try {
            const thumbRes = await fetch(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`,
                { next: { revalidate: 3600 } } as any
            )
            const thumbData = await thumbRes.json()
            avatar = thumbData.data?.[0]?.imageUrl || null
        } catch (e) { }

        const result: RobloxUser = {
            id: userId,
            name: userDetails.name || "",
            displayName: userDetails.displayName || "",
            description: userDetails.description || "",
            created: userDetails.created || "",
            isBanned: userDetails.isBanned || false,
            hasVerifiedBadge: userDetails.hasVerifiedBadge || false,
            avatar
        }

        // Cache by both ID and username
        cacheRobloxUser(result.name, userId, result)
        return result

    } catch (e: any) {
        console.error(`Error fetching Roblox user by ID ${userId}:`, e)
        const stale = getFromCacheStale<RobloxUser>(idCacheKey)
        if (stale) return stale
        return null
    }
}

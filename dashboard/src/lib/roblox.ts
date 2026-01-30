
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
    console.log(`[Roblox] Fetching user details for ID ${userId}`)
    const detailsUrl = `https://users.roblox.com/v1/users/${userId}`
    console.log(`[Roblox] Details URL: ${detailsUrl}`)
    const detailsRes = await fetch(detailsUrl, {
        headers: { "User-Agent": "ProjectOverwatch/1.0" }
    })

    // Handle rate limit
    if (detailsRes.status === 429) {
        console.warn(`[Roblox] Rate limited while fetching user ${userId}`)
        throw new Error("RATE_LIMITED")
    }

    if (!detailsRes.ok) {
        console.error(`[Roblox] Failed to fetch user ${userId}: ${detailsRes.status} ${detailsRes.statusText}`)
        throw new Error(`Roblox API error: ${detailsRes.status}`)
    }

    console.log(`[Roblox] Successfully fetched details for user ${userId}`)
    return await detailsRes.json()
}

export async function getRobloxUser(username: string): Promise<RobloxUser | null> {
    // @ts-ignore - Bypass environment type issues for process
    const apiKey = (globalThis as any).process?.env?.ROBLOX_API_KEY
    const cacheKey = `roblox:user:${username.toLowerCase()}`

    console.log(`[Roblox] Getting user: ${username}`)

    // 1. Check Cache (fresh)
    const cached = getFromCache<RobloxUser>(cacheKey)
    if (cached) {
        console.log(`[Roblox] Cache HIT for ${username} (fresh)`)
        return cached
    }

    console.log(`[Roblox] Cache MISS for ${username}, fetching from API`)

    try {
        // 2. Look up user by username using direct API (not fuzzy search)
        const lookupUrl = `https://users.roblox.com/v1/usernames/users`
        console.log(`[Roblox] Looking up username: ${username}`)
        console.log(`[Roblox] Lookup URL: ${lookupUrl}`)

        const lookupRes = await fetch(
            lookupUrl,
            {
                method: "POST",
                headers: {
                    "User-Agent": "ProjectOverwatch/1.0",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usernames: [username],
                    excludeBannedUsers: false
                })
            }
        )
        console.log(`[Roblox] Lookup response status: ${lookupRes.status}`)

        // Handle rate limit - return stale cache if available
        if (lookupRes.status === 429) {
            console.warn(`[Roblox] Rate limited looking up ${username}, trying stale cache`)
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) {
                console.log(`[Roblox] Returning stale cache for ${username}`)
                return stale
            }
            return null
        }

        if (!lookupRes.ok) {
            try {
                const errorBody = await lookupRes.text()
                console.error(`[Roblox] Lookup failed for ${username}: ${lookupRes.status} ${lookupRes.statusText}`)
                console.error(`[Roblox] Error response body:`, errorBody)
            } catch (e) {
                console.error(`[Roblox] Lookup failed for ${username}: ${lookupRes.status} ${lookupRes.statusText}`)
            }
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) {
                console.log(`[Roblox] Returning stale cache for ${username} (lookup failed)`)
                return stale
            }
            return null
        }

        const lookupData = await lookupRes.json()
        if (!lookupData.data || lookupData.data.length === 0) {
            console.warn(`[Roblox] No results found for username: ${username}`)
            return null
        }

        // The response returns exact username match as first result
        const userResult = lookupData.data[0]
        console.log(`[Roblox] Found user: ${userResult.name} (ID: ${userResult.id})`)

        const userId = userResult.id

        // 3. Fetch Details (Open Cloud or Legacy)
        console.log(`[Roblox] Fetching details for user ${userId}`)
        let userDetails: any
        if (apiKey) {
            console.log(`[Roblox] Trying Open Cloud API for user ${userId}`)
            const ocRes = await fetch(`${OPEN_CLOUD_BASE}/users/${userId}`, {
                headers: { "x-api-key": apiKey },
                next: { revalidate: 3600 }
            } as any)
            if (ocRes.ok) {
                console.log(`[Roblox] Open Cloud API success for user ${userId}`)
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
                console.log(`[Roblox] Open Cloud API failed (${ocRes.status}), falling back to Legacy API`)
                userDetails = await fetchLegacyUserDetails(userId)
            }
        } else {
            console.log(`[Roblox] No API key configured, using Legacy API`)
            userDetails = await fetchLegacyUserDetails(userId)
        }

        // 4. Fetch Avatar
        console.log(`[Roblox] Fetching avatar for user ${userId}`)
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
                    console.log(`[Roblox] Avatar from Open Cloud: ${avatar ? 'success' : 'no URL'}`)
                } else {
                    console.log(`[Roblox] Open Cloud avatar generation failed (${thumbRes.status})`)
                }
            } catch (e) {
                console.error(`[Roblox] Error generating Open Cloud avatar:`, e)
            }
        }

        if (!avatar) {
            try {
                console.log(`[Roblox] Fetching avatar from legacy thumbnails API`)
                const thumbRes = await fetch(
                    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`,
                    { next: { revalidate: 3600 } } as any
                )
                const thumbData = await thumbRes.json()
                avatar = thumbData.data?.[0]?.imageUrl || null
                console.log(`[Roblox] Avatar from legacy API: ${avatar ? 'success' : 'no URL'}`)
            } catch (e) {
                console.error(`[Roblox] Error fetching legacy avatar:`, e)
            }
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
        console.log(`[Roblox] Caching user ${username} (ID: ${userId})`)
        cacheRobloxUser(username, userId, result)
        return result

    } catch (e: any) {
        console.error(`[Roblox] Error fetching user ${username}:`, e?.message || e)

        // On any error, try stale cache
        if (e.message === "RATE_LIMITED") {
            console.log(`[Roblox] Rate limited, attempting stale cache for ${username}`)
            const stale = getFromCacheStale<RobloxUser>(cacheKey)
            if (stale) {
                console.log(`[Roblox] Returning stale cache for ${username}`)
                return stale
            }
        }

        return null
    }
}

// Get Roblox user by ID (with caching)
export async function getRobloxUserById(userId: number): Promise<RobloxUser | null> {
    const idCacheKey = `roblox:user:id:${userId}`

    console.log(`[Roblox] Getting user by ID: ${userId}`)

    // Check cache first
    const cached = getFromCache<RobloxUser>(idCacheKey)
    if (cached) {
        console.log(`[Roblox] Cache HIT for user ID ${userId} (fresh)`)
        return cached
    }

    console.log(`[Roblox] Cache MISS for user ID ${userId}, fetching from API`)

    try {
        const userDetails = await fetchLegacyUserDetails(userId)

        if (!userDetails || userDetails.errors) {
            console.warn(`[Roblox] User not found or has errors (ID: ${userId})`)
            const stale = getFromCacheStale<RobloxUser>(idCacheKey)
            if (stale) {
                console.log(`[Roblox] Returning stale cache for user ID ${userId}`)
                return stale
            }
            return null
        }

        console.log(`[Roblox] Got details for user ID ${userId}: ${userDetails.name}`)

        // Fetch avatar
        console.log(`[Roblox] Fetching avatar for user ID ${userId}`)
        let avatar: string | null = null
        try {
            const thumbRes = await fetch(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`,
                { next: { revalidate: 3600 } } as any
            )
            const thumbData = await thumbRes.json()
            avatar = thumbData.data?.[0]?.imageUrl || null
            console.log(`[Roblox] Avatar for user ID ${userId}: ${avatar ? 'success' : 'no URL'}`)
        } catch (e) {
            console.error(`[Roblox] Error fetching avatar for user ID ${userId}:`, e)
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

        // Cache by both ID and username
        console.log(`[Roblox] Caching user ID ${userId}`)
        cacheRobloxUser(result.name, userId, result)
        return result

    } catch (e: any) {
        console.error(`[Roblox] Error fetching user by ID ${userId}:`, e?.message || e)
        const stale = getFromCacheStale<RobloxUser>(idCacheKey)
        if (stale) {
            console.log(`[Roblox] Returning stale cache for user ID ${userId}`)
            return stale
        }
        return null
    }
}

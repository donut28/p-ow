interface CachedData<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CachedData<any>>();
const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 hours (was 1 hour - more aggressive)
const STALE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days - keep stale data as fallback

export function getFromCache<T>(key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > DEFAULT_TTL) {
        // Data is stale but don't delete it - keep as fallback
        return null;
    }

    return cached.data;
}

// Get cached data even if stale (for rate limit fallback)
export function getFromCacheStale<T>(key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;

    // Only delete if REALLY old (7 days)
    if (Date.now() - cached.timestamp > STALE_TTL) {
        cache.delete(key);
        return null;
    }

    return cached.data;
}

export function setToCache<T>(key: string, data: T): void {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// Cache a Roblox user by both username and ID
export function cacheRobloxUser(username: string, userId: number, data: any): void {
    const usernameLower = username.toLowerCase();
    setToCache(`roblox:user:${usernameLower}`, data);
    setToCache(`roblox:user:id:${userId}`, data);
}

// Get Roblox user from cache by username or ID
export function getRobloxUserCache(usernameOrId: string | number): any | null {
    if (typeof usernameOrId === 'number') {
        return getFromCache(`roblox:user:id:${usernameOrId}`) ?? getFromCacheStale(`roblox:user:id:${usernameOrId}`);
    }
    const lower = usernameOrId.toLowerCase();
    return getFromCache(`roblox:user:${lower}`) ?? getFromCacheStale(`roblox:user:${lower}`);
}

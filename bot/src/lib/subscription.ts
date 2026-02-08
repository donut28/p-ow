import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export type ServerPlan = 'free' | 'pow-pro' | 'pow-max'

interface PlanLimits {
    forms: number
    automations: number
    hasRaidDetection: boolean
    hasAutoActions: boolean
    hasExports: boolean
    hasVisionAccess: boolean
    hasWhiteLabelBot: boolean
    apiRateLimit: number
}

const SERVER_LIMITS: Record<ServerPlan, PlanLimits> = {
    'free': {
        forms: 5,
        automations: 5,
        hasRaidDetection: false,
        hasAutoActions: false,
        hasExports: false,
        hasVisionAccess: false,
        hasWhiteLabelBot: false,
        apiRateLimit: 30,
    },
    'pow-pro': {
        forms: 25,
        automations: 15,
        hasRaidDetection: true,
        hasAutoActions: true,
        hasExports: true,
        hasVisionAccess: true,
        hasWhiteLabelBot: false,
        apiRateLimit: 120,
    },
    'pow-max': {
        forms: Infinity,
        automations: Infinity,
        hasRaidDetection: true,
        hasAutoActions: true,
        hasExports: true,
        hasVisionAccess: true,
        hasWhiteLabelBot: true,
        apiRateLimit: 300,
    },
}

// Cache server plans for 60 seconds
const planCache = new Map<string, { plan: ServerPlan, limits: PlanLimits, timestamp: number }>()
const CACHE_TTL = 60000

export async function getServerPlan(serverId: string): Promise<{ plan: ServerPlan } & PlanLimits> {
    // Check cache first
    const cached = planCache.get(serverId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { plan: cached.plan, ...cached.limits }
    }

    try {
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            select: { subscriptionPlan: true }
        })

        const plan = (server?.subscriptionPlan as ServerPlan) || 'free'
        const limits = SERVER_LIMITS[plan]

        // Cache result
        planCache.set(serverId, { plan, limits, timestamp: Date.now() })

        return { plan, ...limits }
    } catch (e) {
        console.error('[Subscription] Error fetching plan:', e)
        // Default to free on error
        return { plan: 'free', ...SERVER_LIMITS['free'] }
    }
}

// Check if a server has access to a premium feature
export async function hasFeature(
    serverId: string,
    feature: keyof Omit<PlanLimits, 'forms' | 'automations' | 'apiRateLimit'>
): Promise<boolean> {
    const limits = await getServerPlan(serverId)
    return limits[feature] === true
}

// Get plan display name
export function getPlanDisplayName(plan: ServerPlan): string {
    switch (plan) {
        case 'pow-pro': return 'POW Pro'
        case 'pow-max': return 'POW Max'
        default: return 'Free'
    }
}

// Clear cache for a server (call after plan changes)
export function clearPlanCache(serverId: string) {
    planCache.delete(serverId)
}

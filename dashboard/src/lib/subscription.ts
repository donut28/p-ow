import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export type ServerPlan = 'free' | 'pow-pro' | 'pow-max'
export type UserPlan = 'free' | 'pow-pro-user'

// Superadmin Clerk user IDs (can manually manage subscriptions)
const SUPERADMIN_IDS = [
    'user_36ogKIU3qHTwhGT3mrVtvUrTgbW'
]

export interface PlanLimits {
    forms: number
    automations: number
    apiRateLimit: number
    hasRaidDetection: boolean
    hasRaidAutoActions: boolean
    hasExports: boolean
    hasVision: boolean
    hasWhiteLabel: boolean
}

const SERVER_LIMITS: Record<ServerPlan, PlanLimits> = {
    'free': {
        forms: 5,
        automations: 5,
        apiRateLimit: 100,
        hasRaidDetection: false,
        hasRaidAutoActions: false,
        hasExports: false,
        hasVision: false,
        hasWhiteLabel: false
    },
    'pow-pro': {
        forms: 25,
        automations: 15,
        apiRateLimit: 5000,
        hasRaidDetection: true,
        hasRaidAutoActions: false,
        hasExports: false,
        hasVision: false,
        hasWhiteLabel: false
    },
    'pow-max': {
        forms: Infinity,
        automations: Infinity,
        apiRateLimit: Infinity,
        hasRaidDetection: true,
        hasRaidAutoActions: true,
        hasExports: true,
        hasVision: true,
        hasWhiteLabel: true
    }
}

/**
 * Check if a user is a superadmin
 */
export function isSuperAdmin(userId: string): boolean {
    return SUPERADMIN_IDS.includes(userId)
}

/**
 * Get the current user's personal plan from Clerk metadata
 */
export async function getUserPlan(userId?: string): Promise<{ plan: UserPlan, linkedServerId?: string }> {
    const { userId: currentUserId } = await auth()
    const targetUserId = userId || currentUserId

    if (!targetUserId) return { plan: 'free' }

    try {
        const clerk = await clerkClient()
        const user = await clerk.users.getUser(targetUserId)
        const metadata = user.publicMetadata as any

        return {
            plan: metadata?.subscriptionPlan === 'pow-pro-user' ? 'pow-pro-user' : 'free',
            linkedServerId: metadata?.linkedServerId || undefined
        }
    } catch {
        return { plan: 'free' }
    }
}

/**
 * Get a server's subscription plan and limits
 */
export async function getServerPlan(serverId: string): Promise<{ plan: ServerPlan } & PlanLimits> {
    const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { subscriptionPlan: true }
    })

    const plan = (server?.subscriptionPlan as ServerPlan) || 'free'
    return { plan, ...SERVER_LIMITS[plan] }
}

/**
 * Check if user can access Vision
 * Vision requires: Pro User subscription OR member of a server with Max plan
 */
export async function canAccessVision(userId: string, checkServerId?: string): Promise<boolean> {
    // Check 1: Pro User subscription
    const { plan: userPlan } = await getUserPlan(userId)
    if (userPlan === 'pow-pro-user') return true

    // Check 2: Member of any Max server
    const memberServers = await prisma.member.findMany({
        where: {
            OR: [
                { discordId: userId },
                { userId: userId }
            ]
        },
        include: { server: true }
    })

    for (const member of memberServers) {
        if (member.server.subscriptionPlan === 'pow-max') {
            return true
        }
    }

    // Check 3: Specific server if provided
    if (checkServerId) {
        const { plan } = await getServerPlan(checkServerId)
        if (plan === 'pow-max') return true
    }

    return false
}

/**
 * Check if server is at limit for a resource
 */
export async function checkLimit(
    serverId: string,
    resource: 'forms' | 'automations'
): Promise<{ allowed: boolean; current: number; max: number }> {
    const limits = await getServerPlan(serverId)
    const max = limits[resource]

    let current = 0
    if (resource === 'forms') {
        current = await prisma.form.count({ where: { serverId } })
    } else if (resource === 'automations') {
        current = await prisma.automation.count({ where: { serverId } })
    }

    return { allowed: current < max, current, max }
}

/**
 * Link a user's subscription to a server
 */
export async function linkSubscriptionToServer(
    userId: string,
    serverId: string,
    plan: 'pow-pro' | 'pow-max'
): Promise<{ success: boolean; error?: string }> {
    // First, unlink any previously linked server for this user
    await prisma.server.updateMany({
        where: { subscriberUserId: userId },
        data: {
            subscriberUserId: null,
            subscriptionPlan: null
        }
    })

    // Link the new server
    await prisma.server.update({
        where: { id: serverId },
        data: {
            subscriberUserId: userId,
            subscriptionPlan: plan
        }
    })

    // Update Clerk user metadata with linked server
    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
            linkedServerId: serverId
        }
    })

    return { success: true }
}

/**
 * Unlink a user's subscription from their server
 */
export async function unlinkSubscription(userId: string): Promise<void> {
    await prisma.server.updateMany({
        where: { subscriberUserId: userId },
        data: {
            subscriberUserId: null,
            subscriptionPlan: null
        }
    })

    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
            linkedServerId: null
        }
    })
}

/**
 * Superadmin: Grant subscription to a server (bypasses Clerk billing)
 */
export async function adminGrantServerPlan(
    adminUserId: string,
    serverId: string,
    plan: ServerPlan
): Promise<{ success: boolean; error?: string }> {
    if (!isSuperAdmin(adminUserId)) {
        return { success: false, error: 'Unauthorized' }
    }

    await prisma.server.update({
        where: { id: serverId },
        data: {
            subscriptionPlan: plan === 'free' ? null : plan,
            subscriberUserId: plan === 'free' ? null : `admin:${adminUserId}`
        }
    })

    return { success: true }
}

/**
 * Superadmin: Grant Pro User to a user (bypasses Clerk billing)
 */
export async function adminGrantUserPlan(
    adminUserId: string,
    targetUserId: string,
    plan: UserPlan
): Promise<{ success: boolean; error?: string }> {
    if (!isSuperAdmin(adminUserId)) {
        return { success: false, error: 'Unauthorized' }
    }

    const clerk = await clerkClient()
    await clerk.users.updateUserMetadata(targetUserId, {
        publicMetadata: {
            subscriptionPlan: plan === 'free' ? null : plan
        }
    })

    return { success: true }
}

/**
 * Get servers a user can link their subscription to
 */
export async function getServersForLinking(userId: string) {
    const members = await prisma.member.findMany({
        where: {
            OR: [
                { discordId: userId },
                { userId: userId }
            ]
        },
        include: { server: true }
    })

    return members.map((m: any) => ({
        id: m.server.id,
        name: m.server.customName || m.server.name,
        currentPlan: m.server.subscriptionPlan || 'free',
        isLinkedToMe: m.server.subscriberUserId === userId
    }))
}

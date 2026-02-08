import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
    linkSubscriptionToServer,
    unlinkSubscription,
    getServersForLinking,
    getUserPlan
} from "@/lib/subscription"

// Get servers available for linking
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userPlan = await getUserPlan(userId)
        const servers = await getServersForLinking(userId)

        return NextResponse.json({
            userPlan: userPlan.plan,
            linkedServerId: userPlan.linkedServerId,
            servers
        })
    } catch (error) {
        console.error("[Subscription Link] GET Error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

// Link subscription to a server
export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { serverId, plan } = await req.json()

        if (!serverId || !plan) {
            return NextResponse.json({ error: "Missing serverId or plan" }, { status: 400 })
        }

        if (!['pow-pro', 'pow-max'].includes(plan)) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
        }

        // Verify user has this subscription (via Clerk billing)
        // For now, trust the frontend - in production you'd verify with Clerk billing API
        const result = await linkSubscriptionToServer(userId, serverId, plan)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Subscription Link] POST Error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

// Unlink subscription from server
export async function DELETE() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await unlinkSubscription(userId)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[Subscription Link] DELETE Error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

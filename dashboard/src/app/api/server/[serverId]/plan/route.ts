import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getServerPlan } from "@/lib/subscription"

// Get server subscription plan and limits
export async function GET(
    req: Request,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { serverId } = await params
        const planInfo = await getServerPlan(serverId)

        return NextResponse.json(planInfo)
    } catch (error) {
        console.error("[Server Plan] Error:", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

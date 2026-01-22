import { getSession } from "@/lib/auth-clerk"
import { isServerAdmin } from "@/lib/admin"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// Schema validation could be added here (e.g. Zod) but keeping it simple for now

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) return new NextResponse("Missing serverId", { status: 400 })

    // Check permissions (must be admin)
    if (!await isServerAdmin(session.user as any, serverId)) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    const automations = await prisma.automation.findMany({
        where: { serverId },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(automations)
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { serverId, id, name, trigger, conditions, actions, enabled } = body

        if (!serverId || !name || !trigger) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Check permissions
        if (!await isServerAdmin(session.user as any, serverId)) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        if (id) {
            // Update
            const automation = await prisma.automation.update({
                where: { id },
                data: {
                    name,
                    trigger,
                    conditions: typeof conditions === 'string' ? conditions : JSON.stringify(conditions),
                    actions: typeof actions === 'string' ? actions : JSON.stringify(actions),
                    enabled
                }
            })
            return NextResponse.json(automation)
        } else {
            // Create
            const automation = await prisma.automation.create({
                data: {
                    serverId,
                    name,
                    trigger,
                    conditions: typeof conditions === 'string' ? conditions : JSON.stringify(conditions),
                    actions: typeof actions === 'string' ? actions : JSON.stringify(actions),
                    enabled: enabled ?? true
                }
            })
            return NextResponse.json(automation)
        }
    } catch (e) {
        console.error("Error saving automation:", e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { id, serverId } = body

        if (!id || !serverId) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        // Check permissions
        if (!await isServerAdmin(session.user as any, serverId)) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        await prisma.automation.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Error deleting automation:", e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

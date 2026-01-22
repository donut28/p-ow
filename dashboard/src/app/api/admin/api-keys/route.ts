import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth-clerk"
import { isSuperAdmin } from "@/lib/admin"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getSession()
    if (!isSuperAdmin(session?.user as any)) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(keys)
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!isSuperAdmin(session?.user as any)) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { name } = await req.json()
    if (!name) return new NextResponse("Name is required", { status: 400 })

    // Generate a secure key
    const rawKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const key = `pow_${rawKey}`

    const apiKey = await prisma.apiKey.create({
        data: {
            name,
            key,
            enabled: true
        }
    })

    return NextResponse.json(apiKey)
}

export async function DELETE(req: Request) {
    const session = await getSession()
    if (!isSuperAdmin(session?.user as any)) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("ID is required", { status: 400 })

    await prisma.apiKey.delete({
        where: { id }
    })

    return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
    const session = await getSession()
    if (!isSuperAdmin(session?.user as any)) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id, enabled, rateLimit, dailyLimit } = await req.json()
    if (!id) return new NextResponse("ID is required", { status: 400 })

    const data: any = {}
    if (typeof enabled === "boolean") data.enabled = enabled
    if (typeof rateLimit === "number") data.rateLimit = rateLimit
    if (typeof dailyLimit === "number") data.dailyLimit = dailyLimit

    const apiKey = await prisma.apiKey.update({
        where: { id },
        data
    })

    return NextResponse.json(apiKey)
}

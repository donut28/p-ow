
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("Missing ID", { status: 400 })

    try {
        await prisma.punishment.update({
            where: { id },
            data: { resolved: true }
        })
        return NextResponse.json({ success: true })
    } catch (e) {
        return new NextResponse("Error resolving", { status: 500 })
    }
}

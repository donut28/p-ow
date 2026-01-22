import { prisma } from "@/lib/db"
import { validatePublicApiKey, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Missing punishment ID" }, { status: 400 })

    try {
        const punishment = await prisma.punishment.update({
            where: { id },
            data: { resolved: true }
        })

        await logApiAccess(auth.apiKey, "PUBLIC_PUNISHMENT_RESOLVED", `ID: ${id}`)
        return NextResponse.json({ success: true, id: punishment.id })
    } catch (e) {
        console.error("Public Punishment Resolve API Error:", e)
        return NextResponse.json({ error: "Internal Error or Invalid ID" }, { status: 500 })
    }
}

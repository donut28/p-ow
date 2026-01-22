import { getRobloxUser } from "@/lib/roblox"
import { validatePublicApiKey, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const username = searchParams.get("username")

    if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 })

    try {
        const user = await getRobloxUser(username)
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

        await logApiAccess(auth.apiKey, "PUBLIC_ROBLOX_LOOKUP", `Username: ${username}`)
        return NextResponse.json(user)
    } catch (e) {
        console.error("Public Roblox API Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

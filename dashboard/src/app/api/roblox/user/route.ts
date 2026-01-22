// @ts-ignore
import { NextResponse } from "next/server"
import { getRobloxUser, getRobloxUserById } from "@/lib/roblox"
import { checkSecurity } from "@/lib/security"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get("username") || searchParams.get("query")

    if (!username) return new NextResponse("Missing username", { status: 400 })

    const securityBlock = await checkSecurity(req)
    if (securityBlock) return securityBlock

    try {
        let user
        // Check if input is a numeric ID
        if (/^\d+$/.test(username)) {
            user = await getRobloxUserById(parseInt(username))
        } else {
            user = await getRobloxUser(username)
        }
        
        if (!user) return new NextResponse("Not Found", { status: 404 })

        return NextResponse.json(user)
    } catch (e) {
        console.error("Roblox API Error:", e)
        return new NextResponse("Error", { status: 500 })
    }
}

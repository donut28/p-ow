
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

const GARMIN_API_URL = "https://garminapi.ciankelly.xyz"
const GARMIN_API_KEY = "REMOVED_GARMIN_KEY"

interface GarminResponse {
    success: boolean
    response?: string
    tool_calls?: {
        tool: string
        args: Record<string, any>
    }[]
    duration_ms?: number
    error?: string
}

// Tool calls that result in punishments
const PUNISHMENT_TOOLS = {
    "ban_player": "Ban",
    "kick_player": "Kick"
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { text, serverId } = body

        if (!text || !serverId) {
            return NextResponse.json({ success: false, error: "Missing text or serverId" }, { status: 400 })
        }

        // Call Garmin API
        const response = await fetch(`${GARMIN_API_URL}/api/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                auth_token: GARMIN_API_KEY
            })
        })

        const data: GarminResponse = await response.json()

        if (!data.success) {
            return NextResponse.json({ success: false, error: data.error || "Garmin request failed" })
        }

        // Check for punishment tool calls and log them
        const punishmentsCreated: string[] = []

        if (data.tool_calls && data.tool_calls.length > 0) {
            for (const toolCall of data.tool_calls) {
                const punishmentType = PUNISHMENT_TOOLS[toolCall.tool as keyof typeof PUNISHMENT_TOOLS]

                if (punishmentType) {
                    // Extract username and reason from tool args
                    const username = toolCall.args.username || toolCall.args.player || "Unknown"
                    const reason = toolCall.args.reason || `Issued by Garmin: ${text}`

                    // We need to get the Roblox user ID - for now we'll store the username
                    // and look it up. In production, Garmin might return the ID.
                    try {
                        // Try to get user ID from Roblox API
                        const robloxRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=1`)
                        let userId = username // Fallback to username if lookup fails

                        if (robloxRes.ok) {
                            const robloxData = await robloxRes.json()
                            if (robloxData.data && robloxData.data.length > 0) {
                                userId = robloxData.data[0].id.toString()
                            }
                        }

                        // Create punishment record
                        await prisma.punishment.create({
                            data: {
                                serverId,
                                userId,
                                moderatorId: session.user.robloxId || session.user.id,
                                type: punishmentType,
                                reason: `[Garmin] ${reason}`
                            }
                        })

                        punishmentsCreated.push(`${punishmentType} for ${username}`)
                    } catch (e) {
                        console.error("Failed to create punishment record:", e)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            response: data.response,
            tool_calls: data.tool_calls || [],
            duration_ms: data.duration_ms,
            punishments_logged: punishmentsCreated
        })

    } catch (error) {
        console.error("Garmin API error:", error)
        return NextResponse.json({ success: false, error: "Failed to contact Garmin" }, { status: 500 })
    }
}

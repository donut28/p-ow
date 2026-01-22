import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) {
        return new NextResponse("Missing serverId", { status: 400 })
    }

    // Get server config
    const server = await prisma.server.findUnique({
        where: { id: serverId }
    })

    if (!server || !server.discordGuildId) {
        return NextResponse.json([])
    }

    // Fetch channels from Discord via bot
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN
        if (!botToken) {
            console.error("DISCORD_BOT_TOKEN not set")
            return NextResponse.json([])
        }

        const res = await fetch(
            `https://discord.com/api/v10/guilds/${server.discordGuildId}/channels`,
            {
                headers: {
                    Authorization: `Bot ${botToken}`
                }
            }
        )

        if (!res.ok) {
            console.error("Discord API error:", res.status)
            return NextResponse.json([])
        }

        const channels = await res.json()

        // Filter to only text channels (type 0) and sort by position
        const textChannels = channels
            .filter((c: any) => c.type === 0)
            .sort((a: any, b: any) => a.position - b.position)
            .map((c: any) => ({
                id: c.id,
                name: c.name,
                parentId: c.parent_id
            }))

        return NextResponse.json(textChannels)
    } catch (error) {
        console.error("Failed to fetch Discord channels:", error)
        return NextResponse.json([])
    }
}

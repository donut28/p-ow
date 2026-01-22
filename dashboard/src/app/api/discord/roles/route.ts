import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) return new NextResponse("Missing serverId", { status: 400 })

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
        return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    try {
        // Get server's Discord Guild ID
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            select: { discordGuildId: true }
        })

        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 })
        }

        // Use server-specific guild ID or fallback to global env var
        const guildId = server.discordGuildId || process.env.GUILD_ID

        if (!guildId) {
            return NextResponse.json({ error: "Discord Guild not configured (set discordGuildId on server or GUILD_ID in env)" }, { status: 400 })
        }

        // Fetch roles from Discord API
        const rolesRes = await fetch(
            `https://discord.com/api/v10/guilds/${server.discordGuildId}/roles`,
            {
                headers: {
                    Authorization: `Bot ${botToken}`
                },
                next: { revalidate: 60 } // Cache for 1 minute
            }
        )

        if (!rolesRes.ok) {
            return NextResponse.json({ error: "Failed to fetch roles from Discord" }, { status: rolesRes.status })
        }

        const roles = await rolesRes.json()

        // Map to simpler format
        const mappedRoles = roles.map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color, // Integer color
            position: r.position
        })).sort((a: any, b: any) => b.position - a.position) // Sort by position (high to low)

        return NextResponse.json(mappedRoles)
    } catch (e) {
        console.error("Error fetching Discord roles:", e)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

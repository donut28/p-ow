import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { verifyPermissionOrError } from "@/lib/auth-permissions"
import { NextResponse } from "next/server"

// Rate limit: 1 request per 5 minutes per user
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { serverId, reason } = await req.json()

        if (!serverId) {
            return NextResponse.json({ error: "Missing serverId" }, { status: 400 })
        }

        // Permission check - require canUseToolbox
        const permError = await verifyPermissionOrError(session.user, serverId, "canUseToolbox")
        if (permError) return permError

        // Rate limit check
        const userId = session.user.id
        const lastRequest = rateLimitMap.get(userId)
        const now = Date.now()

        if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
            const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000)
            return NextResponse.json({
                error: `Rate limited. Please wait ${remainingSeconds} seconds before sending another staff request.`
            }, { status: 429 })
        }

        // Update rate limit
        rateLimitMap.set(userId, now)

        const server = await prisma.server.findUnique({
            where: { id: serverId }
        })
        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 })
        }

        // Get requester name
        const requesterName = session.user.robloxUsername || session.user.name || session.user.username || "A staff member"

        // 1. Get all online players with mod/admin perms and PM them
        const client = new PrcClient(server.apiUrl)
        const [rawPlayers, serverData] = await Promise.all([
            client.getPlayers(),
            client.getServer()
        ])

        // Find all mods/admins (permission contains "Moderator" or "Administrator")
        const staffPlayers = rawPlayers.filter(p => {
            const perm = p.Permission as any
            return perm === "Server Moderator" ||
                perm === "Server Administrator" ||
                (typeof perm === "number" && perm > 0)
        })

        // Count staff on duty from DB
        const staffOnDutyCount = await prisma.shift.count({
            where: { serverId, endTime: null }
        })

        if (staffPlayers.length > 0) {
            // Parse player names (format: "username:userId")
            const staffNames = staffPlayers.map(p => {
                const parts = p.Player.split(":")
                return parts[0]
            }).join(",")

            // PM all staff - NO reason in Roblox message (censorship)
            const pmCommand = `:pm ${staffNames} Staff request from ${requesterName}! Please get on duty. - Project Overwatch`
            await client.executeCommand(pmCommand)
        }

        // 2. Queue Discord message to staff request channel
        if (server.staffRequestChannelId) {
            const mentionRole = server.staffRoleId ? `<@&${server.staffRoleId}>` : ""

            await prisma.botQueue.create({
                data: {
                    serverId,
                    type: "MESSAGE",
                    targetId: server.staffRequestChannelId,
                    content: JSON.stringify({
                        content: mentionRole,
                        embeds: [{
                            title: "🚨 Staff Request",
                            description: `**${requesterName}** has requested staff assistance!`,
                            fields: [
                                {
                                    name: "Reason",
                                    value: reason || "No reason provided",
                                    inline: false
                                },
                                {
                                    name: "Server Status",
                                    value: `👥 **Players:** ${serverData?.CurrentPlayers || 0}/${serverData?.MaxPlayers || 0}\n🕒 **Staff On Duty:** ${staffOnDutyCount}\n🛡️ **Staff In-Game:** ${staffPlayers.length}`,
                                    inline: false
                                }
                            ],
                            color: 0xFFA500, // Orange
                            timestamp: new Date().toISOString()
                        }]
                    }),
                    status: "PENDING"
                }
            })
        }

        return NextResponse.json({
            success: true,
            staffNotified: staffPlayers.length,
            discordQueued: !!server.staffRequestChannelId
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to send staff request" }, { status: 500 })
    }
}

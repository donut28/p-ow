
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { getUserPermissions } from "@/lib/admin"
import { verifyPermissionOrError } from "@/lib/auth-permissions"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { serverId, command } = await req.json()

        if (!serverId || !command) {
            return NextResponse.json({ error: "Missing serverId or command" }, { status: 400 })
        }

        // Permission check - require canUseToolbox
        const permissions = await getUserPermissions(session.user, serverId)
        if (!permissions.canUseToolbox) {
            return new NextResponse("Forbidden: Missing Permission canUseToolbox", { status: 403 })
        }

        // Restricted commands check
        const restrictedPrefixes = [":mod", ":unmod", ":admin", ":unadmin"]
        const lowerCommand = command.toLowerCase().trim()
        const isRestricted = restrictedPrefixes.some(p => lowerCommand.startsWith(p))

        if (isRestricted && !permissions.canUseAdminCommands) {
            return NextResponse.json({
                error: "You do not have permission to use admin commands (:mod, :admin, etc.)"
            }, { status: 403 })
        }

        const server = await prisma.server.findUnique({ where: { id: serverId } })
        if (!server) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 })
        }

        const client = new PrcClient(server.apiUrl)
        await client.executeCommand(command)

        // Log to Discord if a channel is configured
        if (server.commandLogChannelId) {
            const moderatorName = session.user.robloxUsername || session.user.name || session.user.username || "Unknown"
            await prisma.botQueue.create({
                data: {
                    serverId,
                    type: "MESSAGE",
                    targetId: server.commandLogChannelId,
                    content: `**[Command Log]** \`${moderatorName}\` ran: \`${command}\``,
                    status: "PENDING"
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to execute command" }, { status: 500 })
    }
}

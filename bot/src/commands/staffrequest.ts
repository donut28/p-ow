import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { prisma } from "../client"
import { PrcClient } from "../lib/prc"
import { findMemberByDiscordId, getRobloxUsername, getClerkUserByDiscordId } from "../lib/clerk"

export async function handleStaffRequestCommand(interaction: ChatInputCommandInteraction) {
    const serverId = interaction.options.getString("server", true)
    const reason = interaction.options.getString("reason", true)
    const discordId = interaction.user.id

    // Defer immediately
    await interaction.deferReply({ ephemeral: true })

    try {
        // Get server first to verify it exists
        const server = await prisma.server.findUnique({
            where: { id: serverId }
        })

        if (!server) {
            return interaction.editReply({ content: "Server configuration not found." })
        }

        // Try to find member using Clerk lookup
        let member = await findMemberByDiscordId(prisma, discordId, serverId)

        // Get Roblox username from Clerk directly (even if member lookup fails)
        const clerkUser = await getClerkUserByDiscordId(discordId)
        let requesterName = interaction.user.username // Fallback to Discord username

        if (clerkUser?.robloxUsername) {
            requesterName = clerkUser.robloxUsername
        } else if (member) {
            requesterName = getRobloxUsername(member, interaction.user.username)
        }

        // Even users without a member record or role can request staff
        // We just need a valid server to send the request to

        const prcClient = new PrcClient(server.apiUrl)

        // 1. Get all online players with mod/admin perms and PM them
        const [rawPlayers, serverData] = await Promise.all([
            prcClient.getPlayers().catch(() => []),
            prcClient.getServer().catch(() => null)
        ])

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

        let staffNotifiedCount = 0
        if (staffPlayers.length > 0) {
            const staffNames = staffPlayers.map(p => p.Player.split(":")[0]).join(",")
            const pmCommand = `:pm ${staffNames} Staff request from ${requesterName}! Please get on duty. - Project Overwatch`
            await prcClient.executeCommand(pmCommand).catch(() => { })
            staffNotifiedCount = staffPlayers.length
        }

        // 2. Send Discord message to staff request channel
        if (server.staffRequestChannelId) {
            try {
                const channel = await interaction.client.channels.fetch(server.staffRequestChannelId)
                if (channel && channel.isTextBased()) {
                    const mentionRole = server.staffRoleId ? `<@&${server.staffRoleId}>` : ""

                    const embed = new EmbedBuilder()
                        .setTitle("🚨 Staff Request")
                        .setDescription(`**${requesterName}** has requested staff assistance!`)
                        .addFields(
                            { name: "Reason", value: reason },
                            {
                                name: "Server Status",
                                value: `👥 **Players:** ${serverData?.CurrentPlayers || 0}/${serverData?.MaxPlayers || 0}\n🕒 **Staff On Duty:** ${staffOnDutyCount}\n🛡️ **Staff In-Game:** ${staffPlayers.length}`
                            }
                        )
                        .setColor(0xFFA500)
                        .setTimestamp()

                    await (channel as any).send({
                        content: mentionRole,
                        embeds: [embed]
                    })
                }
            } catch (channelError) {
                console.error("Failed to send to staff request channel:", channelError)
            }
        }

        await interaction.editReply({
            content: `Staff request sent successfully! ${staffNotifiedCount} staff notified in-game.`
        })

    } catch (e: any) {
        console.error("Staff request command error:", e)
        await interaction.editReply({ content: `Failed to send staff request: ${e.message}` })
    }
}

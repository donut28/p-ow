import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { prisma } from "../client"

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000"

export async function handleServerCommand(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === "status") {
        const serverId = interaction.options.getString("server", true)

        const server = await prisma.server.findUnique({ where: { id: serverId } })
        if (!server) {
            return interaction.reply({ content: "Server not found", ephemeral: true })
        }

        await interaction.deferReply({ ephemeral: true })

        try {
            // Fetch server info from PRC API
            const serverRes = await fetch(`${DASHBOARD_URL}/api/internal/server-status?serverId=${serverId}`, {
                headers: { "x-internal-secret": process.env.INTERNAL_SYNC_SECRET || "REMOVED_INTERNAL_SECRET" }
            })

            let serverInfo = { players: 0, maxPlayers: 0, online: false }
            let staffInGame = 0

            if (serverRes.ok) {
                const data = await serverRes.json()
                serverInfo = data.serverInfo || serverInfo
                staffInGame = data.staffInGame || 0
            }

            // Get staff on duty (active shifts)
            const onDutyCount = await prisma.shift.count({
                where: { serverId, endTime: null }
            })

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${server.customName || server.name}`)
                .setColor(serverInfo.online && serverInfo.players > 0 ? 0x22c55e : 0xef4444)
                .addFields(
                    {
                        name: "🎮 Server Status",
                        value: serverInfo.online ? `🟢 Online` : `🔴 Offline`,
                        inline: true
                    },
                    {
                        name: "👥 Players",
                        value: `${serverInfo.players}/${serverInfo.maxPlayers}`,
                        inline: true
                    },
                    {
                        name: "🛡️ Staff In-Game",
                        value: `${staffInGame}`,
                        inline: true
                    },
                    {
                        name: "⏱️ Staff On Duty",
                        value: `${onDutyCount}`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: "Project Overwatch" })

            await interaction.editReply({ embeds: [embed] })

        } catch (e) {
            await interaction.editReply({ content: "Failed to fetch server status" })
        }
    }
}

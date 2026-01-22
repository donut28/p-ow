import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { prisma } from "../client"
import { findMemberByDiscordId } from "../lib/clerk"

export async function handleLoaCommand(interaction: ChatInputCommandInteraction) {
    if (interaction.options.getSubcommand() === "request") {
        const serverId = interaction.options.getString("server", true)
        const startDateStr = interaction.options.getString("start_date", true)
        const endDateStr = interaction.options.getString("end_date", true)
        const reason = interaction.options.getString("reason", true)
        const discordId = interaction.user.id

        // Validate dates first (quick check)
        const startDate = new Date(startDateStr)
        const endDate = new Date(endDateStr)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return interaction.reply({ content: "Invalid date format. Use YYYY-MM-DD", ephemeral: true })
        }

        if (endDate < startDate) {
            return interaction.reply({ content: "End date cannot be before start date", ephemeral: true })
        }

        // Defer ASAP before Clerk lookup
        await interaction.deferReply({ ephemeral: true })

        let targetServers = []
        if (serverId === "all") {
            const allServers = await prisma.server.findMany()
            for (const server of allServers) {
                const member = await findMemberByDiscordId(prisma, discordId, server.id)
                if (member) {
                    targetServers.push(server)
                }
            }
        } else {
            const member = await findMemberByDiscordId(prisma, discordId, serverId)
            if (member) targetServers.push(member.server)
        }

        if (targetServers.length === 0) {
            return interaction.editReply("You are not a member of any target server(s).")
        }

        // Get user's ID for the LOA record
        const member = await findMemberByDiscordId(prisma, discordId, targetServers[0].id)
        const userId = member?.userId || discordId

        // Create LOAs
        let createdCount = 0
        for (const server of targetServers) {
            await prisma.leaveOfAbsence.create({
                data: {
                    userId,
                    serverId: server.id,
                    startDate,
                    endDate,
                    reason,
                    status: "pending"
                }
            })
            createdCount++
        }

        const embed = new EmbedBuilder()
            .setTitle("LOA Request Submitted")
            .setDescription(`Successfully requested LOA for ${createdCount} server(s).`)
            .addFields(
                { name: "Start Date", value: startDate.toLocaleDateString(), inline: true },
                { name: "End Date", value: endDate.toLocaleDateString(), inline: true },
                { name: "Reason", value: reason }
            )
            .setColor(0x10b981)

        await interaction.editReply({ embeds: [embed] })
    }
}

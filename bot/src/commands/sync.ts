import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { prisma } from "../client"

export async function handleSyncCommand(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id

    await interaction.deferReply({ ephemeral: true })

    // Get all memberships for this user
    const members = await prisma.member.findMany({
        where: { userId },
        include: {
            server: true,
            role: true
        }
    })

    if (members.length === 0) {
        return interaction.editReply("You are not a member of any servers.")
    }

    if (!interaction.guild) {
        return interaction.editReply("This command must be used in a server.")
    }

    const guildMember = await interaction.guild.members.fetch(userId).catch(() => null)
    if (!guildMember) {
        return interaction.editReply("Could not find you in this Discord server.")
    }

    const addedRoles: string[] = []
    const removedRoles: string[] = []
    const errors: string[] = []

    // Collect all discordRoleIds that user SHOULD have
    const shouldHaveRoles = new Set<string>()

    for (const member of members) {
        if (member.role?.discordRoleId) {
            shouldHaveRoles.add(member.role.discordRoleId)
        }
    }

    // Get all possible panel roles (to know which to remove if not entitled)
    const allPanelRoles = await prisma.role.findMany({
        where: { discordRoleId: { not: null } }
    })
    const allPanelRoleIds = new Set<string>(
        allPanelRoles
            .map((r: any) => r.discordRoleId)
            .filter((id: string | null): id is string => id !== null)
    )

    // Role sync is now one-way (Discord -> Panel) per user request
    // We do NOT modify Discord roles here anymore.

    /* ADD/REMOVE LOGIC DISABLED
    // Add roles user should have
    for (const roleId of shouldHaveRoles) {
        if (!guildMember.roles.cache.has(roleId)) {
            try {
                await guildMember.roles.add(roleId)
                const role = interaction.guild.roles.cache.get(roleId)
                addedRoles.push(role?.name || roleId)
            } catch (e) {
                errors.push(`Failed to add role ${roleId}`)
            }
        }
    }

    // Remove panel roles user should NOT have
    for (const roleId of allPanelRoleIds) {
        if (!shouldHaveRoles.has(roleId) && guildMember.roles.cache.has(roleId)) {
            try {
                await guildMember.roles.remove(roleId)
                const role = interaction.guild.roles.cache.get(roleId)
                removedRoles.push(role?.name || roleId)
            } catch (e) {
                errors.push(`Failed to remove role ${roleId}`)
            }
        }
    }
    */

    const embed = new EmbedBuilder()
        .setTitle("Role Sync Info")
        .setDescription("Role synchronization is set to **Read-Only** (Discord -> Panel).\n\nThe bot will not modify your Discord roles. Your panel roles are automatically updated based on your Discord roles when you load the dashboard.")
        .setColor(0x3b82f6)
        .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
}

import { Client } from "discord.js"
import { PrismaClient } from "@prisma/client"

const SYNC_INTERVAL_MS = 10000 // 10 seconds

export function startAutoRoleSync(client: Client, prisma: PrismaClient) {
    console.log("Starting auto role sync service (10s interval)")

    setInterval(async () => {
        try {
            await syncAllServerRoles(client, prisma)
        } catch (e) {
            console.error("Auto role sync error:", e)
        }
    }, SYNC_INTERVAL_MS)
}

async function syncAllServerRoles(client: Client, prisma: PrismaClient) {
    // Get all servers with auto-sync enabled
    const servers = await prisma.server.findMany({
        where: {
            autoSyncRoles: true,
            discordGuildId: { not: null }
        }
    })

    for (const server of servers) {
        if (!server.discordGuildId) continue

        try {
            const guild = await client.guilds.fetch(server.discordGuildId).catch(() => null)
            if (!guild) {
                continue
            }

            // Get all members of this server from DB that have a Discord ID
            const members = await prisma.member.findMany({
                where: {
                    serverId: server.id,
                    discordId: { not: null }
                },
                include: { role: true }
            })

            // OPTIMIZATION: Batch fetch all active shifts for this server
            const activeShifts = await prisma.shift.findMany({
                where: {
                    serverId: server.id,
                    endTime: null
                }
            })
            const activeShiftUserIds = new Set(activeShifts.map((s: any) => s.userId))

            // Process each member
            for (const member of members) {
                if (!member.discordId) continue

                try {
                    const guildMember = await guild.members.fetch(member.discordId).catch(() => null)
                    if (!guildMember) continue

                    // Handle on-duty role - check against batch-fetched shifts
                    if (server.onDutyRoleId) {
                        const isOnDuty = activeShiftUserIds.has(member.discordId) || activeShiftUserIds.has(member.userId)

                        if (isOnDuty && !guildMember.roles.cache.has(server.onDutyRoleId)) {
                            await guildMember.roles.add(server.onDutyRoleId).catch((e: any) => {
                                console.warn(`[ROLE-SYNC] Failed to add role to ${member.discordId}:`, e.message || e)
                            })
                        } else if (!isOnDuty && guildMember.roles.cache.has(server.onDutyRoleId)) {
                            await guildMember.roles.remove(server.onDutyRoleId).catch((e: any) => {
                                console.warn(`[ROLE-SYNC] Failed to remove role from ${member.discordId}:`, e.message || e)
                            })
                        }
                    }
                } catch (memberError: any) {
                    // Continue with next member
                }
            }
        } catch (serverError: any) {
            console.error(`Error syncing server ${server.name}:`, serverError.message || serverError)
        }
    }
}

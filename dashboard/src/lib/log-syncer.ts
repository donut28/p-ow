import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { PrcPlayer, PrcJoinLog, PrcKillLog, PrcCommandLog, parsePrcPlayer } from "./prc-types"
import { getRobloxUser } from "@/lib/roblox"
import { RaidDetectorService, Detection } from "@/lib/raid-detector"
import { findMemberByRobloxId } from "@/lib/clerk-lookup"

async function getAutomationEngine() {
    const { AutomationEngine } = await import("@/lib/automation-engine")
    return AutomationEngine
}

function logToDbFormat(log: any, serverId: string) {
    if (log._type === "join") {
        return {
            serverId,
            type: "join",
            playerName: log.PlayerName,
            playerId: log.PlayerId,
            isJoin: log.Join !== false,
            prcTimestamp: log.timestamp
        }
    } else if (log._type === "kill") {
        return {
            serverId,
            type: "kill",
            killerName: log.KillerName,
            killerId: log.KillerId,
            victimName: log.VictimName,
            victimId: log.VictimId,
            prcTimestamp: log.timestamp
        }
    } else if (log._type === "command") {
        return {
            serverId,
            type: "command",
            playerName: log.PlayerName,
            playerId: log.PlayerId,
            command: log.Command, // Full command string e.g. ":log ban username reason"
            arguments: null, // PRC API doesn't have separate arguments field
            prcTimestamp: log.timestamp
        }
    }
    return null
}

/**
 * Handle :log shift start|end|status commands
 */
async function handleShiftCommand(log: any, serverId: string, client: PrcClient, args: string[]) {
    const subcommand = args[0]?.toLowerCase()
    const playerId = log.PlayerId
    const playerName = log.PlayerName || parsePrcPlayer(log.Player).name

    // Find member by Roblox ID
    const member = await prisma.member.findFirst({
        where: {
            serverId,
            userId: playerId
        },
        include: { role: true, server: true }
    })

    if (!member) {
        await client.executeCommand(`:pm ${playerName} [POW] You are not registered as staff. Please link your account on the dashboard.`).catch(() => { })
        return
    }

    const serverName = member.server.customName || member.server.name

    if (subcommand === "start") {
        // Check if already on shift
        const activeShift = await prisma.shift.findFirst({
            where: { userId: member.userId, serverId, endTime: null }
        })

        if (activeShift) {
            const duration = Math.floor((Date.now() - activeShift.startTime.getTime()) / 1000)
            const h = Math.floor(duration / 3600)
            const m = Math.floor((duration % 3600) / 60)
            await client.executeCommand(`:pm ${playerName} [POW] You are already on shift! (${h}h ${m}m)`).catch(() => { })
            return
        }

        // Check if server has players before allowing shift start
        try {
            const players = await client.getPlayers()
            if (players.length === 0) {
                await client.executeCommand(`:pm ${playerName} [POW] Cannot go on duty - server has no players`).catch(() => { })
                return
            }
        } catch (apiError) {
            await client.executeCommand(`:pm ${playerName} [POW] Cannot go on duty - server appears to be offline`).catch(() => { })
            return
        }

        // Start shift
        await prisma.shift.create({
            data: {
                userId: member.userId,
                serverId,
                startTime: new Date()
            }
        })

        await client.executeCommand(`:pm ${playerName} [POW] Shift started on ${serverName}. Stay safe!`).catch(() => { })

    } else if (subcommand === "end") {
        // Find active shift
        const activeShift = await prisma.shift.findFirst({
            where: { userId: member.userId, serverId, endTime: null }
        })

        if (!activeShift) {
            await client.executeCommand(`:pm ${playerName} [POW] You are not currently on shift.`).catch(() => { })
            return
        }

        // End shift
        const now = new Date()
        const duration = Math.floor((now.getTime() - activeShift.startTime.getTime()) / 1000)

        await prisma.shift.update({
            where: { id: activeShift.id },
            data: { endTime: now, duration }
        })

        const h = Math.floor(duration / 3600)
        const m = Math.floor((duration % 3600) / 60)
        const s = duration % 60

        await client.executeCommand(`:pm ${playerName} [POW] Shift ended. Duration: ${h}h ${m}m ${s}s`).catch(() => { })

    } else if (subcommand === "status") {
        // Get active shift
        const activeShift = await prisma.shift.findFirst({
            where: { userId: member.userId, serverId, endTime: null }
        })

        // Calculate week start (Monday)
        const now = new Date()
        const currentDay = now.getDay()
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
        const weekStart = new Date(now)
        weekStart.setDate(diff)
        weekStart.setHours(0, 0, 0, 0)

        // Get weekly shifts
        const weeklyShifts = await prisma.shift.findMany({
            where: {
                serverId,
                userId: member.userId,
                startTime: { gte: weekStart }
            }
        })

        // Calculate total weekly time
        let totalSeconds = 0
        for (const shift of weeklyShifts) {
            if (shift.duration) {
                totalSeconds += shift.duration
            } else if (!shift.endTime) {
                // Active shift - add current duration
                totalSeconds += Math.floor((Date.now() - shift.startTime.getTime()) / 1000)
            }
        }

        const totalH = Math.floor(totalSeconds / 3600)
        const totalM = Math.floor((totalSeconds % 3600) / 60)

        // Get quota from role (quotaMinutes is in minutes)
        const quotaMinutes = member.role?.quotaMinutes || 0
        const quotaSeconds = quotaMinutes * 60
        const quotaPercent = quotaSeconds > 0 ? Math.round((totalSeconds / quotaSeconds) * 100) : 100
        const quotaH = Math.floor(quotaMinutes / 60)
        const quotaM = quotaMinutes % 60

        if (activeShift) {
            const shiftDuration = Math.floor((Date.now() - activeShift.startTime.getTime()) / 1000)
            const shiftH = Math.floor(shiftDuration / 3600)
            const shiftM = Math.floor((shiftDuration % 3600) / 60)
            const quotaStr = quotaM > 0 ? `${quotaH}h ${quotaM}m` : `${quotaH}h`

            await client.executeCommand(`:pm ${playerName} [POW] ON DUTY (${shiftH}h ${shiftM}m) | Weekly: ${totalH}h ${totalM}m (${quotaPercent}% of ${quotaStr} quota)`).catch(() => { })
        } else {
            const quotaStr = quotaM > 0 ? `${quotaH}h ${quotaM}m` : `${quotaH}h`
            await client.executeCommand(`:pm ${playerName} [POW] OFF DUTY | Weekly: ${totalH}h ${totalM}m (${quotaPercent}% of ${quotaStr} quota)`).catch(() => { })
        }

    } else {
        await client.executeCommand(`:pm ${playerName} [POW] Usage: :log shift start/end/status`).catch(() => { })
    }
}

/**
 * Handle :shutdown command - ends all active shifts for this server
 */
async function handleShutdownCommand(log: any, serverId: string) {
    const playerName = log.PlayerName || parsePrcPlayer(log.Player).name
    const playerId = log.PlayerId

    console.log(`[SHUTDOWN] Server shutdown initiated by ${playerName} (${playerId}) on server ${serverId}`)

    // Find all active shifts for this server
    const activeShifts = await prisma.shift.findMany({
        where: {
            serverId,
            endTime: null
        },
        include: {
            server: true
        }
    })

    if (activeShifts.length === 0) {
        console.log(`[SHUTDOWN] No active shifts to end for server ${serverId}`)
        return
    }

    const now = new Date()

    // End all active shifts
    for (const shift of activeShifts) {
        const duration = Math.floor((now.getTime() - shift.startTime.getTime()) / 1000)

        await prisma.shift.update({
            where: { id: shift.id },
            data: {
                endTime: now,
                duration
            }
        })
    }

    console.log(`[SHUTDOWN] Ended ${activeShifts.length} shifts for server ${serverId}`)

    // Store shutdown event in Config for popup notification
    // Using a timestamp-based key so we can track multiple events
    const shutdownEventKey = `ssd_${serverId}`
    await prisma.config.upsert({
        where: { key: shutdownEventKey },
        update: {
            value: JSON.stringify({
                timestamp: now.toISOString(),
                initiatedBy: playerName,
                shiftsEnded: activeShifts.length,
                affectedUserIds: activeShifts.map((s: any) => s.userId)
            })
        },
        create: {
            key: shutdownEventKey,
            value: JSON.stringify({
                timestamp: now.toISOString(),
                initiatedBy: playerName,
                shiftsEnded: activeShifts.length,
                affectedUserIds: activeShifts.map((s: any) => s.userId)
            })
        }
    })
}

async function handleLogCommand(log: any, serverId: string, client: PrcClient) {
    // The PRC API returns the full command in log.Command, e.g. ":log ban username reason"
    // We need to parse that, not a separate Arguments field
    const fullCommand = log.Command || ""
    const playerName = log.PlayerName || parsePrcPlayer(log.Player).name

    // Remove the leading ":log" and get the rest as arguments
    // Handle both ":log" and ":Log" etc.
    const logMatch = fullCommand.match(/^:log\s+(.*)$/i)
    if (!logMatch) {
        console.error("[LOG-CMD] Failed to parse command:", fullCommand)
        return
    }

    const rawArgs = logMatch[1].trim()
    const parts = rawArgs.split(/\s+/)

    if (parts.length < 1) {
        await client.executeCommand(`:pm ${playerName} [POW] Usage: :log ban/warn/kick/bolo/shift [args]`).catch(() => { })
        return
    }

    const typeArg = parts[0].toLowerCase()

    // Handle shift commands separately
    if (typeArg === "shift") {
        await handleShiftCommand(log, serverId, client, parts.slice(1))
        return
    }

    // Need at least 2 parts for punishment commands
    if (parts.length < 2) {
        await client.executeCommand(`:pm ${playerName} [POW] Usage: :log ban/warn/kick/bolo [username] [reason]`).catch(() => { })
        return
    }

    const targetQuery = parts[1].toLowerCase()
    const reason = parts.slice(2).join(" ") || "No reason provided"

    const typeMap: Record<string, string> = {
        "warn": "Warn",
        "kick": "Kick",
        "ban": "Ban",
        "bolo": "Ban Bolo"
    }

    const punishmentType = typeMap[typeArg]
    if (!punishmentType) {
        await client.executeCommand(`:pm ${playerName} [POW] Invalid type: ${typeArg}. Use ban/warn/kick/bolo/shift`).catch(() => { })
        return
    }

    try {
        // First, try to find the player among currently online players
        const players = await client.getPlayers().catch(() => [])
        let matches = players.filter(p => parsePrcPlayer(p.Player).name.toLowerCase().includes(targetQuery))

        let target: { name: string; id: string } | null = null
        let wasRecentlyLeft = false

        if (matches.length === 1) {
            target = parsePrcPlayer(matches[0].Player)
        } else if (matches.length > 1) {
            const matchNames = matches.slice(0, 3).map((p: any) => parsePrcPlayer(p.Player).name).join(", ")
            await client.executeCommand(`:pm ${playerName} [Project Overwatch] Multiple matches: ${matchNames}. Be more specific.`).catch(() => { })
            return
        } else {
            // No online player found - check recently left players (last 30 minutes)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

            const recentLeaveLogs = await prisma.log.findMany({
                where: {
                    serverId,
                    type: "join",
                    isJoin: false, // Player left
                    createdAt: { gte: thirtyMinutesAgo },
                    playerName: { not: null }
                },
                orderBy: { createdAt: "desc" },
                take: 100,
                select: {
                    playerName: true,
                    playerId: true,
                    createdAt: true
                }
            })

            // Filter for matches and deduplicate by playerId (take most recent)
            const seenPlayerIds = new Set<string>()
            const recentMatches: { name: string; id: string; leftAt: Date }[] = []

            for (const leaveLog of recentLeaveLogs) {
                if (!leaveLog.playerName || !leaveLog.playerId) continue
                if (seenPlayerIds.has(leaveLog.playerId)) continue

                if (leaveLog.playerName.toLowerCase().includes(targetQuery)) {
                    seenPlayerIds.add(leaveLog.playerId)
                    recentMatches.push({
                        name: leaveLog.playerName,
                        id: leaveLog.playerId,
                        leftAt: leaveLog.createdAt
                    })
                }
            }

            if (recentMatches.length === 0) {
                await client.executeCommand(`:pm ${playerName} [Project Overwatch] No player matches "${targetQuery}" (checked online + recently left)`).catch(() => { })
                return
            }

            if (recentMatches.length > 1) {
                const matchNames = recentMatches.slice(0, 3).map((m: any) => m.name).join(", ")
                await client.executeCommand(`:pm ${playerName} [Project Overwatch] Multiple recently left matches: ${matchNames}. Be more specific.`).catch(() => { })
                return
            }

            target = { name: recentMatches[0].name, id: recentMatches[0].id }
            wasRecentlyLeft = true
        }

        if (!target) {
            await client.executeCommand(`:pm ${playerName} [Project Overwatch] No player matches "${targetQuery}"`).catch(() => { })
            return
        }

        // Use moderator's Roblox ID (not Clerk - no Clerk account required!)
        // log.PlayerId is the Roblox user ID of the mod who ran the command
        const moderatorRobloxId = String(log.PlayerId)
        const moderatorName = log.PlayerName || "Unknown"

        await prisma.punishment.create({
            data: {
                serverId,
                userId: target.id,
                moderatorId: moderatorRobloxId, // Roblox ID, NOT Clerk ID
                type: punishmentType,
                reason: `[Game Command by ${moderatorName}] ${reason}`
            }
        })

        const recentlyLeftNote = wasRecentlyLeft ? " (recently left)" : ""
        await client.executeCommand(`:pm ${playerName} [Project Overwatch] ${punishmentType} logged for ${target.name}${recentlyLeftNote}`).catch(() => { })
        console.log(`[LOG-CMD] ✓ ${moderatorName} (${moderatorRobloxId}) logged ${punishmentType} for ${target.name}${recentlyLeftNote}: ${reason}`)

        const engine = await getAutomationEngine()
        engine.trigger("PUNISHMENT_ISSUED", {
            serverId,
            player: {
                name: target.name,
                id: target.id
            },
            punishment: {
                type: punishmentType,
                reason: reason,
                issuer: moderatorName,
                target: target.name
            }
        }).catch(() => { })

    } catch (e: any) {
        console.error("[LOG-CMD] Error:", e.message || e)
        await client.executeCommand(`:pm ${playerName} [Project Overwatch] Error logging punishment. Check dashboard logs.`).catch(() => { })
    }
}


export async function fetchAndSaveLogs(apiKey: string, serverId: string) {
    const client = new PrcClient(apiKey)

    try {
        const [join, kill, command] = await Promise.all([
            client.getJoinLogs().catch(() => [] as PrcJoinLog[]),
            client.getKillLogs().catch(() => [] as PrcKillLog[]),
            client.getCommandLogs().catch(() => [] as PrcCommandLog[])
        ])

        const parsedLogs = [
            ...join.map((l: any) => {
                const p = parsePrcPlayer(l.Player)
                return { ...l, _type: "join", timestamp: l.Timestamp, PlayerName: p.name, PlayerId: p.id }
            }),
            ...kill.map((l: any) => {
                const killer = parsePrcPlayer(l.Killer)
                const victim = parsePrcPlayer(l.Killed)
                return { ...l, _type: "kill", timestamp: l.Timestamp, KillerName: killer.name, KillerId: killer.id, VictimName: victim.name, VictimId: victim.id }
            }),
            ...command.map((l: any) => {
                const p = parsePrcPlayer(l.Player)
                return { ...l, _type: "command", timestamp: l.Timestamp, PlayerName: p.name, PlayerId: p.id, Command: l.Command }
            })
        ]

        if (parsedLogs.length === 0) return { parsedLogs: [], newLogsCount: 0 }

        const timestamps = Array.from(new Set(parsedLogs.map((l: any) => l.timestamp)))
        const existingLogs = await prisma.log.findMany({
            where: { serverId, prcTimestamp: { in: timestamps } },
            select: { type: true, prcTimestamp: true }
        })

        const existingSet = new Set(existingLogs.map((l: any) => `${l.type}:${l.prcTimestamp}`))
        let newLogsCount = 0

        const AutomationEngine = await getAutomationEngine()
        const newCommandLogsForDetection: any[] = []

        for (const log of parsedLogs) {
            const dbData = logToDbFormat(log, serverId)
            if (!dbData || existingSet.has(`${dbData.type}:${dbData.prcTimestamp}`)) continue

            try {
                await prisma.log.create({ data: dbData })
                newLogsCount++

                const context = {
                    serverId,
                    player: {
                        name: (log as any).PlayerName || (log as any).KillerName || (log as any).Player || "Unknown",
                        id: (log as any).PlayerId || (log as any).KillerId || ""
                    }
                }

                if (dbData.type === "join") {
                    if (dbData.isJoin) {
                        AutomationEngine.trigger("PLAYER_JOIN", context).catch(e => console.error("[AUTOMATION] PLAYER_JOIN error:", e))
                        getRobloxUser(dbData.playerName).catch(() => { }) // Non-critical cache warming
                    } else {
                        AutomationEngine.trigger("PLAYER_LEAVE", context).catch(e => console.error("[AUTOMATION] PLAYER_LEAVE error:", e))
                    }
                } else if (dbData.type === "command") {
                    // Collect for raid detection (using the raw log structure for compatibility with detector)
                    newCommandLogsForDetection.push({
                        ...dbData,
                        playerId: (log as any).PlayerId, // Ensure string format matches detector
                        command: (log as any).Command,
                        prcTimestamp: (log as any).timestamp
                    })

                    // Check if command STARTS with ":log" (Command field contains full string like ":log ban user reason")
                    if (dbData.command?.toLowerCase().startsWith(":log ") || dbData.command?.toLowerCase() === ":log") {
                        await handleLogCommand(log, serverId, client)
                    }

                    // Check for :shutdown command - auto-end all shifts
                    if (dbData.command?.toLowerCase() === ":shutdown" || dbData.command?.toLowerCase().startsWith(":shutdown ")) {
                        await handleShutdownCommand(log, serverId)
                    }

                    AutomationEngine.trigger("COMMAND_USED", {
                        ...context,
                        details: { command: dbData.command, args: dbData.arguments }
                    }).catch(e => console.error("[AUTOMATION] COMMAND_USED error:", e))
                } else if (dbData.type === "kill") {
                    AutomationEngine.trigger("PLAYER_KILL", {
                        ...context,
                        player: { name: dbData.killerName!, id: dbData.killerId! },
                        target: { name: dbData.victimName!, id: dbData.victimId! }
                    }).catch(e => console.error("[AUTOMATION] PLAYER_KILL error:", e))
                }
            } catch (e: any) {
                console.error("[SYNC] Item Error:", e.message || e)
            }
        }

        // Run Raid Detection
        if (newCommandLogsForDetection.length > 0) {
            try {
                const server = await prisma.server.findUnique({
                    where: { id: serverId },
                    select: { raidAlertChannelId: true, staffRoleId: true, id: true, name: true, subscriptionPlan: true }
                })

                // Check if server has raid detection feature (Pro or Max only)
                const { getServerPlan } = await import("@/lib/subscription")
                const { isFeatureEnabled } = await import("@/lib/feature-flags")

                const flagEnabled = await isFeatureEnabled('RAID_DETECTION')
                const { hasRaidDetection } = await getServerPlan(serverId)

                if (flagEnabled && hasRaidDetection && server?.raidAlertChannelId) {
                    // Filter logs to only include those from users NOT registered in Clerk
                    // and not "Remote Server"
                    const logsWithMemberInfo = await Promise.all(newCommandLogsForDetection.map(async (log: any) => {
                        const playerName = log.playerName || "Unknown"
                        const playerId = log.playerId || "0"

                        if (playerName === "Remote Server" || playerId === "0") return { log, isAuthorized: true }

                        const { member } = await findMemberByRobloxId(serverId, playerId)
                        return { log, isAuthorized: !!member }
                    }))

                    const filteredLogs = logsWithMemberInfo
                        .filter((item: any) => !item.isAuthorized)
                        .map((item: any) => item.log)

                    if (filteredLogs.length > 0) {
                        const detector = new RaidDetectorService()
                        const detections = detector.scan(filteredLogs, []) // No authorized IDs needed as we pre-filtered

                        if (detections.length > 0) {
                            console.log(`[RAID DETECTOR] Found ${detections.length} potential threats from non-registered users`)

                            const staffPing = server.staffRoleId ? `<@&${server.staffRoleId}>` : "@staff"

                            // Create rich embed payload
                            const embed = {
                                title: "⚠️ RAID DETECTION ALERT",
                                description: `Suspicious activity detected on **${server.name}**\n${staffPing} Please investigate immediately.`,
                                color: 0xFF0000, // Red
                                fields: detections.map((d: any) => ({
                                    name: `${d.type}`,
                                    value: `**Roblox User:** ${d.userName} (ID: \`${d.userId}\`)\n**Details:** ${d.details}`,
                                    inline: false
                                })),
                                footer: {
                                    text: "Project Overwatch Auto-Mod"
                                },
                                timestamp: new Date().toISOString()
                            }

                            await prisma.botQueue.create({
                                data: {
                                    serverId,
                                    type: "MESSAGE",
                                    targetId: server.raidAlertChannelId,
                                    content: JSON.stringify({ embeds: [embed] })
                                }
                            })
                        }
                    }
                }
            } catch (e) {
                console.error("[RAID DETECTOR] Error:", e)
            }
        }

        return { parsedLogs, newLogsCount }
    } catch (error: any) {
        console.error("[SYNC] Fatal Error:", error.message || error)
        return { parsedLogs: [], newLogsCount: 0 }
    }
}
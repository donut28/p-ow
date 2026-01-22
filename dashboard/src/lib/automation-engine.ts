import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { getServerConfig } from "@/lib/server-config"

// Define expanded triggers
type TriggerType =
    | "PLAYER_JOIN" | "PLAYER_LEAVE"
    | "SHIFT_START" | "SHIFT_END"
    | "PUNISHMENT_ISSUED" | "WARN_ISSUED" | "KICK_ISSUED" | "BAN_ISSUED"
    | "MEMBER_ROLE_UPDATED"
    | "COMMAND_USED" | "PLAYER_KILL"
    | "PLAYER_DEATH" | "SERVER_STARTUP"
    | "BOLO_CREATED" | "BOLO_CLEARED"
    | "DISCORD_MESSAGE_RECEIVED"
    | "TIME_INTERVAL"

interface AutomationContext {
    serverId: string
    player?: {
        name: string
        id: string
        team?: string
        permission?: number
        vehicle?: string
        callsign?: string
        [key: string]: any
    }
    punishment?: {
        type: string
        reason: string
        issuer: string
        target: string
    }
    target?: {
        name: string
        id: string
    }
    details?: any
}

export class AutomationEngine {
    static async tick(serverId: string) {
        try {
            const automations = await prisma.automation.findMany({
                where: {
                    serverId,
                    trigger: "TIME_INTERVAL",
                    enabled: true
                }
            })

            const now = new Date()
            for (const automation of automations) {
                try {
                    const conditionsStr = automation.conditions || "{}"
                    let intervalMinutes = 60

                    try {
                        const parsed = JSON.parse(conditionsStr)
                        if (!Array.isArray(parsed) && parsed.intervalMinutes) {
                            intervalMinutes = parseInt(parsed.intervalMinutes) || 60
                        }
                    } catch (e) {
                        console.warn(`[AUTOMATION] Failed to parse conditions for ${automation.name}, using default interval`)
                    }

                    const lastRun = automation.lastRunAt ? new Date(automation.lastRunAt).getTime() : 0
                    const nextRun = lastRun + (intervalMinutes * 60 * 1000)

                    if (now.getTime() >= nextRun) {
                        await this.trigger("TIME_INTERVAL", { serverId }, automation)
                    }
                } catch (e) {
                    console.error(`[AUTOMATION] Error ticking automation ${automation.name}:`, e)
                }
            }
        } catch (e) {
            console.error(`[AUTOMATION] Error in engine tick for ${serverId}:`, e)
        }
    }

    static async trigger(type: TriggerType, context: AutomationContext, specificAutomation?: any) {
        try {
            // Share PRC client and server info across triggers in this cycle
            const server = await getServerConfig(context.serverId)
            if (!server) return

            const prcClient = new PrcClient(server.apiUrl)
            let serverInfo: any = null

            // Fetch enabled automations for this trigger
            const automations = specificAutomation ? [specificAutomation] : await prisma.automation.findMany({
                where: {
                    serverId: context.serverId,
                    trigger: type,
                    enabled: true
                }
            })

            for (const automation of automations) {
                // Parse conditions
                let conditionsMet = true
                if (automation.conditions && automation.conditions !== "{}" && automation.conditions !== "[]") {
                    try {
                        const conditions = JSON.parse(automation.conditions)
                        // Fetch server data if needed for conditions
                        if (JSON.stringify(conditions).includes("server.") && !serverInfo) {
                            serverInfo = await prcClient.getServer()
                        }

                        conditionsMet = await this.evaluateGroup(conditions, context, serverInfo)
                    } catch (e) {
                        console.error(`[AUTOMATION] Failed to evaluate conditions for ${automation.name}: `, e)
                        conditionsMet = false
                    }
                }

                if (!conditionsMet) {
                    continue
                }

                // Execute Actions
                const actions = JSON.parse(automation.actions)
                for (const action of actions) {
                    try {
                        // Pre-fetch server info for variables if needed
                        if (JSON.stringify(action).includes("{server_") && !serverInfo) {
                            serverInfo = await prcClient.getServer()
                        }
                        await this.executeAction(action, context, prcClient, serverInfo)
                    } catch (e) {
                        console.error(`[AUTOMATION] Failed to execute action for ${automation.name}: `, e)
                    }
                }

                // Update last run time
                await prisma.automation.update({
                    where: { id: automation.id },
                    data: { lastRunAt: new Date() }
                }).catch(e => console.error(`[AUTOMATION] Failed to update lastRunAt:`, e))
            }
        } catch (e) {
            console.error(`[AUTOMATION] Error processing trigger ${type}: `, e)
        }
    }

    private static async evaluateGroup(group: any, context: AutomationContext, serverData: any): Promise<boolean> {
        // Simple array of conditions implies AND
        if (Array.isArray(group)) {
            for (const condition of group) {
                if (!await this.evaluateCondition(condition, context, serverData)) return false
            }
            return true
        }
        return true
    }

    private static async evaluateCondition(condition: any, context: AutomationContext, serverData: any): Promise<boolean> {
        const { field, operator, value } = condition

        let actualValue: any = null

        // Resolve field
        if (field.startsWith("player.")) {
            const key = field.split(".")[1]
            actualValue = context.player ? context.player[key] : null
        } else if (field.startsWith("server.")) {
            const key = field.split(".")[1]
            if (key === "playerCount" && serverData) actualValue = serverData.CurrentPlayers
            else if (key === "maxPlayers" && serverData) actualValue = serverData.MaxPlayers
            else if (key === "joinKey" && serverData) actualValue = serverData.JoinKey
        }

        // Compare
        switch (operator) {
            case "EQUALS": return String(actualValue) == String(value)
            case "NOT_EQUALS": return String(actualValue) != String(value)
            case "GREATER_THAN": return Number(actualValue) > Number(value)
            case "LESS_THAN": return Number(actualValue) < Number(value)
            case "CONTAINS": return String(actualValue).toLowerCase().includes(String(value).toLowerCase())
        }
        return false
    }

    private static async executeAction(action: any, context: AutomationContext, prcClient: PrcClient, serverInfo: any) {
        // Replace variables
        const content = this.replaceVariables(action.content || "", context, serverInfo)
        const target = this.replaceVariables(action.target || "", context, serverInfo)

        switch (action.type) {
            case "DISCORD_MESSAGE":
                await prisma.botQueue.create({
                    data: {
                        serverId: context.serverId,
                        type: "MESSAGE",
                        targetId: target,
                        content: content,
                        status: "PENDING"
                    }
                })
                break

            case "DISCORD_DM":
                await prisma.botQueue.create({
                    data: {
                        serverId: context.serverId,
                        type: "DM",
                        targetId: target,
                        content: content,
                        status: "PENDING"
                    }
                })
                break

            case "LOG_ENTRY":
            case "SHIFT_LOG": // functionally similar for now, just a log type distinction
                await prisma.log.create({
                    data: {
                        serverId: context.serverId,
                        type: action.type === "SHIFT_LOG" ? "SHIFT" : "AUTOMATION",
                        command: content,
                        playerId: context.player?.id || "system"
                    }
                })
                break

            case "WARN_PLAYER":
                // Create a punishment record
                if (context.player?.id) {
                    await prisma.punishment.create({
                        data: {
                            serverId: context.serverId,
                            userId: context.player.id,
                            moderatorId: "AUTOMATION",
                            type: "Warn",
                            reason: content,
                            resolved: true // Auto-resolved/acknowledged
                        }
                    })
                }
                break

            case "PRC_COMMAND":
            case "KICK_PLAYER":
            case "BAN_PLAYER":
            case "ANNOUNCEMENT":
            case "TELEPORT_PLAYER":
            case "KILL_PLAYER":
                let command = content
                const pid = context.player?.id || context.player?.name || ""
                const quotedPid = pid.includes(" ") ? `"${pid}"` : pid

                // Format commands based on specific action types if content is just the value
                if (action.type === "KICK_PLAYER") command = `:kick ${quotedPid} ${content}`
                else if (action.type === "BAN_PLAYER") command = `:ban ${quotedPid} ${content}`
                else if (action.type === "ANNOUNCEMENT") command = `:m ${content}`
                else if (action.type === "TELEPORT_PLAYER") command = `:tp ${quotedPid} ${target}` // Target is destination
                else if (action.type === "KILL_PLAYER") command = `:kill ${quotedPid}`

                await prcClient.executeCommand(command)
                break

            case "HTTP_REQUEST":
                try {
                    await fetch(target, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: content
                    })
                } catch (e) {
                    console.error("[AUTOMATION] HTTP Request failed", e)
                }
                break

            case "DELAY":
                const ms = parseInt(content) || 1000
                await new Promise(resolve => setTimeout(resolve, ms))
                break
        }
    }

    private static replaceVariables(text: string, context: AutomationContext, serverData: any): string {
        let result = text

        // Player Variables
        if (context.player) {
            result = result.replace(/{player_name}/g, context.player.name)
            result = result.replace(/{player_id}/g, context.player.id)
            result = result.replace(/{player_team}/g, context.player.team || "Unknown")
            result = result.replace(/{player_vehicle}/g, context.player.vehicle || "None")
            result = result.replace(/{player_callsign}/g, context.player.callsign || "None")
            result = result.replace(/{player_permission}/g, String(context.player.permission || 0))

            // Legacy support
            result = result.replace(/%player%/g, context.player.name)
            result = result.replace(/%id%/g, context.player.id)
        }

        // Server Variables
        result = result.replace(/{server_id}/g, context.serverId)
        if (serverData) {
            result = result.replace(/{server_name}/g, serverData.Name || "Unknown Server")
            result = result.replace(/{player_count}/g, String(serverData.CurrentPlayers || 0))
            result = result.replace(/{max_players}/g, String(serverData.MaxPlayers || 0))
            result = result.replace(/{join_key}/g, serverData.JoinKey || "")
        }

        // Punishment Variables
        if (context.punishment) {
            result = result.replace(/{punishment_type}/g, context.punishment.type)
            result = result.replace(/{punishment_reason}/g, context.punishment.reason)
            result = result.replace(/{punishment_issuer}/g, context.punishment.issuer)
            result = result.replace(/{punishment_target}/g, context.punishment.target)
        }

        // System
        result = result.replace(/{timestamp}/g, new Date().toISOString())

        return result
    }
}

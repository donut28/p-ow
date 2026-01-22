import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"

const QUEUE_CHECK_INTERVAL_MS = 60 * 1000 // 1 minute
const COMMAND_DELAY_MS = 6000 // 6 seconds between commands (PRC Rate Limit)

/**
 * Queue a generic command for execution
 */
export async function queueCommand(
    serverId: string,
    command: string,
    priority: number = 0,
    sourceServerId?: string,
    relatedUserId?: string
) {
    await prisma.commandQueue.create({
        data: {
            serverId,
            command,
            priority,
            status: "PENDING",
            sourceServerId,
            relatedUserId
        }
    })
}

/**
 * Queue a ban command to be executed on all other servers
 * If target server is empty, store in queue; otherwise execute immediately
 */
export async function syncBanToAllServers(
    sourceServerId: string,
    username: string,
    robloxUserId: string,
    reason: string
) {
    // Get all servers except the source
    const otherServers = await prisma.server.findMany({
        where: {
            id: { not: sourceServerId }
        }
    })

    const banCommand = `:ban ${username} ${reason}`

    for (const server of otherServers) {
        try {
            const client = new PrcClient(server.apiUrl)
            const serverInfo = await client.getServer().catch(() => null)

            const playerCount = serverInfo?.CurrentPlayers ?? 0

            if (playerCount > 0) {
                // Server has players - execute immediately
                await client.executeCommand(banCommand).catch(e => {
                    console.error(`[CROSS-BAN] Failed to execute on ${server.name}:`, e)
                })
            } else {
                // Server is empty - queue for later
                await prisma.commandQueue.create({
                    data: {
                        serverId: server.id,
                        command: banCommand,
                        priority: 10, // Bans are high priority
                        status: "PENDING",
                        sourceServerId,
                        relatedUserId: robloxUserId
                    }
                })
            }
        } catch (e) {
            // If we can't check server status, queue it to be safe
            await prisma.commandQueue.create({
                data: {
                    serverId: server.id,
                    command: banCommand,
                    priority: 10,
                    status: "PENDING",
                    sourceServerId,
                    relatedUserId: robloxUserId
                }
            })
        }
    }
}

/**
 * Process the command queue for a specific server
 * Called when we detect a server has players
 */
async function processServerQueue(serverId: string, client: PrcClient) {
    // Get pending commands for this server, highest priority first
    // Limit to 2 per execution to prevent timeouts (2 * 6s delay + execution overhead < Vercel timeout)
    const pendingCommands = await prisma.commandQueue.findMany({
        where: {
            serverId,
            status: "PENDING"
        },
        orderBy: [
            { priority: "desc" },
            { createdAt: "asc" }
        ],
        take: 2
    })

    if (pendingCommands.length === 0) return

    // Mark as processing
    const commandIds = pendingCommands.map((c: { id: string }) => c.id)
    await prisma.commandQueue.updateMany({
        where: { id: { in: commandIds } },
        data: { status: "PROCESSING" }
    })

    // Execute with delay between commands
    for (let i = 0; i < pendingCommands.length; i++) {
        const cmd = pendingCommands[i]

        try {
            await client.executeCommand(cmd.command)

            await prisma.commandQueue.update({
                where: { id: cmd.id },
                data: {
                    status: "COMPLETED",
                    processedAt: new Date()
                }
            })
        } catch (e: any) {
            await prisma.commandQueue.update({
                where: { id: cmd.id },
                data: {
                    status: "FAILED",
                    error: e.message || "Unknown error",
                    processedAt: new Date()
                }
            })
        }

        // Wait between commands (except for the last one)
        if (i < pendingCommands.length - 1) {
            await new Promise(resolve => setTimeout(resolve, COMMAND_DELAY_MS))
        }
    }
}

/**
 * Main queue processor - runs every minute
 * Checks all servers with pending commands and processes if populated
 */
export async function processCommandQueue() {
    try {
        // Get unique server IDs that have pending commands
        const serverIds = await prisma.commandQueue.findMany({
            where: { status: "PENDING" },
            select: { serverId: true },
            distinct: ["serverId"]
        })

        if (serverIds.length === 0) return

        // Check each server
        for (const { serverId } of serverIds) {
            try {
                const server = await prisma.server.findUnique({
                    where: { id: serverId }
                })

                if (!server) continue

                const client = new PrcClient(server.apiUrl)
                const serverInfo = await client.getServer().catch(() => null)

                const playerCount = serverInfo?.CurrentPlayers ?? 0

                if (playerCount >= 1) {
                    // Server has players - process the queue
                    await processServerQueue(serverId, client)
                }
            } catch (e) {
                // Skip this server on error
            }
        }
    } catch (e) {
        console.error("[COMMAND-QUEUE] Error processing queue:", e)
    }
}

// Track if the queue processor is running
let queueProcessorRunning = false

/**
 * Start the command queue processor service
 * Should be called on server startup
 */
export function startCommandQueueProcessor() {
    if (queueProcessorRunning) return

    queueProcessorRunning = true

    setInterval(async () => {
        await processCommandQueue()
    }, QUEUE_CHECK_INTERVAL_MS)
}

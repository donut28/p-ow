import { Client, TextChannel } from "discord.js"
import { PrismaClient } from "@prisma/client"

const QUEUE_INTERVAL_MS = 3000 // 3 seconds for responsiveness

export function startBotQueueService(client: Client, prisma: PrismaClient) {
    console.log(`Starting bot queue processor (${QUEUE_INTERVAL_MS}ms interval)`)

    setInterval(async () => {
        try {
            await processQueue(client, prisma)
        } catch (e) {
            console.error("Bot queue processing error:", e)
        }
    }, QUEUE_INTERVAL_MS)
}

async function processQueue(client: Client, prisma: PrismaClient) {
    // 1. Mark PENDING items as PROCESSING atomically
    // We update up to 10 PENDING items to PROCESSING and retrieve them
    // This prevents other instances from picking up the same items
    const now = new Date()

    // Prisma doesn't support updateMany with return values on SQLite/MySQL easily without raw queries
    // So we fetch IDs first, then update them to PROCESSING if they still have PENDING status
    const pendingItems = await prisma.botQueue.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: { id: true }
    })

    if (pendingItems.length === 0) return

    const itemIds = pendingItems.map((i: { id: string }) => i.id)

    // Mark these items as PROCESSING
    await prisma.botQueue.updateMany({
        where: { id: { in: itemIds }, status: "PENDING" },
        data: { status: "PROCESSING" }
    })

    // Re-fetch only the ones we successfully marked
    const itemsToProcess = await prisma.botQueue.findMany({
        where: { id: { in: itemIds }, status: "PROCESSING" }
    })

    for (const item of itemsToProcess) {
        try {
            if (item.type === "MESSAGE") {
                const channel = await client.channels.fetch(item.targetId).catch(() => null)
                if (channel && (channel.isTextBased() || channel instanceof TextChannel)) {
                    // Check if content is JSON (for embeds)
                    let payload: any = item.content
                    try {
                        if (item.content.startsWith("{") && item.content.endsWith("}")) {
                            const parsed = JSON.parse(item.content)
                            if (parsed.embeds || parsed.content) {
                                payload = parsed
                            }
                        }
                    } catch (e) {
                        // Not JSON, send as raw string
                    }

                    // @ts-ignore - isTextBased check ensures send exists
                    await channel.send(payload)

                    await prisma.botQueue.update({
                        where: { id: item.id },
                        data: { status: "SENT", processedAt: new Date() }
                    })
                } else {
                    throw new Error("Channel not found or not text-based")
                }
            } else if (item.type === "DM") {
                const user = await client.users.fetch(item.targetId).catch(() => null)
                if (user) {
                    await user.send(item.content)

                    await prisma.botQueue.update({
                        where: { id: item.id },
                        data: { status: "SENT", processedAt: new Date() }
                    })
                } else {
                    throw new Error("User not found")
                }
            }
        } catch (error: any) {
            console.error(`[QUEUE] Failed to process item ${item.id}:`, error.message || error)

            await prisma.botQueue.update({
                where: { id: item.id },
                data: {
                    status: "FAILED",
                    error: error.message || "Unknown error",
                    processedAt: new Date()
                }
            })
        }
    }
}


"use server"

import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createPunishment(prevState: any, formData: FormData) {
    const session = await getSession()
    if (!session || !session.user?.id) return { message: "Unauthorized" }

    const serverId = formData.get("serverId") as string
    const username = formData.get("username") as string
    const type = formData.get("type") as string
    const reason = formData.get("reason") as string

    if (!serverId || !username || !type) return { message: "Missing fields" }

    const server = await prisma.server.findUnique({ where: { id: serverId } })
    if (!server) return { message: "Server not found" }

    const client = new PrcClient(server.apiUrl)

    try {
        // 1. Execute Command on Game Server
        let command = ""
        switch (type) {
            case "Warn":
                command = `:warn ${username} ${reason}`
                break
            case "Kick":
                command = `:kick ${username} ${reason}`
                break
            case "Ban":
            case "Ban Bolo":
                command = `:ban ${username} ${reason}`
                break
        }

        const promises = []

        if (command) {
            console.log(`[Punishment-Global] Executing main command: "${command}"`)
            promises.push(client.executeCommand(command))
        }

        // Send PM for warnings
        if (type === "Warn") {
            const moderatorName = session.user.robloxUsername || session.user.username || "Staff"
            const reasonText = reason || "No reason provided"
            const pmCommand = `:pm ${username} You have been warned by ${moderatorName} for ${reasonText} - Project Overwatch`
            console.log(`[Punishment-Global] Executing PM command: "${pmCommand}"`)
            promises.push(client.executeCommand(pmCommand))
        }

        // Execute all commands in parallel
        const results = await Promise.allSettled(promises)
        results.forEach((res, i) => {
            if (res.status === 'rejected') {
                console.error(`[Punishment-Global] Command ${i} failed:`, res.reason)
            } else {
                console.log(`[Punishment-Global] Command ${i} success`)
            }
        })

        // 2. Save to Database
        await prisma.punishment.create({
            data: {
                serverId,
                userId: username, // Storing username for now as ID if fetching ID is complex synchronously
                moderatorId: session.user.discordId || session.user.id, // Prefer Discord ID if available
                type,
                reason,
            }
        })

        // 3. Revalidate
        revalidatePath(`/dashboard/${serverId}/punishments`)
        return { message: "Punishment executed successfully", success: true }

    } catch (error) {
        console.error("Punishment Error:", error)
        return { message: "Failed to execute punishment on server. Check API connection." }
    }
}

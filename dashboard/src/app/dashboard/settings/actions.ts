"use server"

import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { isSuperAdmin } from "@/lib/admin"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function addServer(prevState: any, formData: FormData) {
    const session = await getSession()
    if (!session) return { message: "Unauthorized" }

    // Check if server creation is enabled globally
    const canCreate = await isFeatureEnabled('SERVER_CREATION')
    if (!canCreate) {
        return { message: "Server creation is currently disabled." }
    }

    // Superadmin Restriction
    if (!isSuperAdmin(session.user as any)) {
        console.log("User attempting to add server:", session.user.name)
        return { message: "Unauthorized: Only Superadmins can add servers." }
    }

    const apiKey = formData.get("apiKey") as string
    if (!apiKey) return { message: "API Key is required" }

    try {
        // Validate Key
        const client = new PrcClient(apiKey)
        const serverInfo = await client.getServer()

        // Save to DB
        await prisma.server.create({
            data: {
                name: serverInfo.Name,
                apiUrl: apiKey, // Storing key in apiUrl field as per schema choice, though field name is odd, schema maps it to api_key
            },
        })
    } catch (error) {
        console.error("Failed to add server:", error)
        return { message: "Failed to validate API Key or Server is offline." }
    }

    revalidatePath("/dashboard")
    redirect("/dashboard")
}

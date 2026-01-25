import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import { verifyVisionSignature, visionCorsHeaders } from "@/lib/vision-auth"

// Handle preflight requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: visionCorsHeaders })
}

// Lookup player by username
export async function GET(req: Request) {
    try {
        // Validate required environment variable
        if (!process.env.VISION_JWT_SECRET) {
            console.error("[Vision Player] VISION_JWT_SECRET is not set!")
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500, headers: visionCorsHeaders }
            )
        }

        const VISION_SECRET = new TextEncoder().encode(process.env.VISION_JWT_SECRET)

        // Verify the request is from Vision app using HMAC signature
        const signature = req.headers.get("X-Vision-Sig")
        if (!verifyVisionSignature(signature)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403, headers: visionCorsHeaders }
            )
        }

        // Verify Vision token from Authorization header
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "No token provided" }, { status: 401, headers: visionCorsHeaders })
        }

        const token = authHeader.substring(7)
        try {
            await jwtVerify(token, VISION_SECRET, {
                issuer: "pow-dashboard",
                audience: "pow-vision"
            })
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: visionCorsHeaders })
        }

        // Get username from query
        const url = new URL(req.url)
        const username = url.searchParams.get("username")

        if (!username) {
            return NextResponse.json({ error: "Username required" }, { status: 400, headers: visionCorsHeaders })
        }

        // Lookup user on Roblox
        const robloxRes = await fetch(
            `https://users.roblox.com/v1/usernames/users`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usernames: [username],
                    excludeBannedUsers: false
                })
            }
        )

        if (!robloxRes.ok) {
            return NextResponse.json({ error: "Failed to lookup user" }, { status: 502, headers: visionCorsHeaders })
        }

        const robloxData = await robloxRes.json()
        const userData = robloxData.data?.[0]

        if (!userData) {
            return NextResponse.json({ error: "User not found" }, { status: 404, headers: visionCorsHeaders })
        }

        // Get avatar
        let avatar = null
        try {
            const avatarRes = await fetch(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.id}&size=150x150&format=Png&isCircular=false`
            )
            if (avatarRes.ok) {
                const avatarData = await avatarRes.json()
                avatar = avatarData.data?.[0]?.imageUrl || null
            }
        } catch {
            // Avatar fetch failed, continue without it
        }

        // Get punishment count from database (across all servers) using Roblox ID
        const robloxIdStr = String(userData.id)
        const punishmentCount = await prisma.punishment.count({
            where: {
                userId: robloxIdStr
            }
        })

        // Get recent punishments (last 5)
        const recentPunishments = await prisma.punishment.findMany({
            where: {
                userId: robloxIdStr
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                type: true,
                reason: true,
                createdAt: true,
                resolved: true
            }
        })

        return NextResponse.json({
            id: userData.id,
            name: userData.name,
            displayName: userData.displayName,
            avatar,
            punishmentCount,
            recentPunishments
        }, { headers: visionCorsHeaders })
    } catch (error) {
        console.error("[Vision Player] Error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: visionCorsHeaders })
    }
}



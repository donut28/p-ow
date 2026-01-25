import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-clerk"
import { SignJWT, jwtVerify } from "jose"
import { verifyVisionSignature, visionCorsHeaders } from "@/lib/vision-auth"

// Handle preflight requests
export async function OPTIONS() {
    return NextResponse.json({}, { headers: visionCorsHeaders })
}

// Generate a token for Vision app
export async function GET(req: Request) {
    try {
        // Validate required environment variable
        if (!process.env.VISION_JWT_SECRET) {
            console.error("[Vision Auth] VISION_JWT_SECRET is not set!")
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500, headers: visionCorsHeaders }
            )
        }

        const VISION_SECRET = new TextEncoder().encode(process.env.VISION_JWT_SECRET)
        const session = await getSession()

        if (!session?.user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: visionCorsHeaders })
        }

        // Create a JWT token for Vision
        const token = await new SignJWT({
            userId: session.user.id,
            username: session.user.username,
            robloxId: session.user.robloxId,
            robloxUsername: session.user.robloxUsername,
            discordId: session.user.discordId
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d") // Token valid for 7 days
            .setIssuer("pow-dashboard")
            .setAudience("pow-vision")
            .sign(VISION_SECRET)

        return NextResponse.json({
            token,
            user: {
                id: session.user.id,
                username: session.user.username,
                name: session.user.name,
                image: session.user.image,
                robloxUsername: session.user.robloxUsername
            }
        }, { headers: visionCorsHeaders })
    } catch (error) {
        console.error("[Vision Auth] Error:", error)
        return NextResponse.json({ error: "Failed to generate token" }, { status: 500, headers: visionCorsHeaders })
    }
}

// Verify a Vision token
export async function POST(req: Request) {
    try {
        // Validate required environment variable
        if (!process.env.VISION_JWT_SECRET) {
            console.error("[Vision Auth] VISION_JWT_SECRET is not set!")
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

        const { token } = await req.json()

        if (!token) {
            return NextResponse.json({ valid: false, error: "No token provided" }, { status: 400, headers: visionCorsHeaders })
        }

        const { payload } = await jwtVerify(token, VISION_SECRET, {
            issuer: "pow-dashboard",
            audience: "pow-vision"
        })

        return NextResponse.json({
            valid: true,
            user: {
                userId: payload.userId,
                username: payload.username,
                robloxId: payload.robloxId,
                robloxUsername: payload.robloxUsername,
                discordId: payload.discordId
            }
        }, { headers: visionCorsHeaders })
    } catch (error) {
        console.error("[Vision Auth] Token verification failed:", error)
        return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401, headers: visionCorsHeaders })
    }
}

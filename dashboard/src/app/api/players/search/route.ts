
import { getSession } from "@/lib/auth-clerk"
import { prisma } from "@/lib/db"
import { PrcClient } from "@/lib/prc"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const session = await getSession()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")
    const query = searchParams.get("query")?.toLowerCase()

    if (!serverId || !query || query.length < 3) return NextResponse.json([])

    try {
        // 1. Search Recent Logs (Command/Join/Kill)
        const recentLogs = await prisma.log.findMany({
            where: {
                serverId,
                OR: [
                    { playerName: { contains: query } },
                    { killerName: { contains: query } },
                    { victimName: { contains: query } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                playerName: true,
                playerId: true,
                killerName: true,
                killerId: true,
                victimName: true,
                victimId: true
            }
        })

        // Process logs into unique players
        const recentPlayers = new Map<string, { name: string, id: string, source: string }>()

        recentLogs.forEach((log: any) => {
            if (log.playerName && log.playerName.toLowerCase().includes(query)) {
                recentPlayers.set(log.playerName.toLowerCase(), { name: log.playerName, id: log.playerId || "", source: "Recent Activity" })
            }
            if (log.killerName && log.killerName.toLowerCase().includes(query)) {
                recentPlayers.set(log.killerName.toLowerCase(), { name: log.killerName, id: log.killerId || "", source: "Recent Activity" })
            }
            if (log.victimName && log.victimName.toLowerCase().includes(query)) {
                recentPlayers.set(log.victimName.toLowerCase(), { name: log.victimName, id: log.victimId || "", source: "Recent Activity" })
            }
        })

        // 2. Search Roblox Users
        const robloxRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`)
        let robloxUsers: any[] = []

        if (robloxRes.ok) {
            const robloxData = await robloxRes.json()
            robloxUsers = robloxData.data || []
        }

        // 3. Fetch Thumbnails for all unique IDs
        const uniqueIds = new Set<string>()
        recentPlayers.forEach(p => { if (p.id) uniqueIds.add(p.id) })
        robloxUsers.forEach(u => uniqueIds.add(u.id.toString()))

        const userIdsArray = Array.from(uniqueIds)
        let thumbs = new Map()

        if (userIdsArray.length > 0) {
            try {
                // Batch chunks of 100 if needed, but likely small enough here
                const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIdsArray.join(",")}&size=150x150&format=Png&isCircular=true`)
                if (thumbRes.ok) {
                    const thumbData = await thumbRes.json()
                    if (thumbData.data) {
                        thumbData.data.forEach((t: any) => thumbs.set(t.targetId, t.imageUrl))
                    }
                }
            } catch (err) {
                console.warn("Title fetch error:", err)
            }
        }

        // 4. Combine and Format Results
        const results = []

        // Add recent players first
        for (const p of recentPlayers.values()) {
            results.push({
                name: p.name,
                displayName: p.name, // Log doesn't save display name usually
                id: p.id,
                avatar: thumbs.get(Number(p.id)) || null,
                source: "Recent Activity"
            })
        }

        // Add Roblox users if not already added
        for (const u of robloxUsers) {
            if (!recentPlayers.has(u.name.toLowerCase())) {
                results.push({
                    name: u.name,
                    displayName: u.displayName,
                    id: u.id.toString(),
                    avatar: thumbs.get(u.id) || null,
                    source: "Roblox"
                })
            }
        }

        return NextResponse.json(results)
    } catch (e) {
        console.error("Search Error:", e)
        return new NextResponse("Error searching", { status: 500 })
    }
}

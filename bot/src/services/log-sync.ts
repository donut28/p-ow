import { Client } from "discord.js"

const SYNC_INTERVAL_MS = 10000 // 10 seconds (Matches DB-backed Mod Panel sync)
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000"
const INTERNAL_SECRET = process.env.INTERNAL_SYNC_SECRET!

let isSyncing = false // Overlap protection

export function startLogSyncService(client: Client) {
    console.log(`Starting log sync service (${SYNC_INTERVAL_MS}ms interval)`)

    // Initial sync
    syncLogs()

    setInterval(async () => {
        if (isSyncing) return // Skip if previous sync is still running
        try {
            await syncLogs()
        } catch (e) {
            console.error("Log sync service error:", e)
        }
    }, SYNC_INTERVAL_MS)
}

async function syncLogs() {
    isSyncing = true
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s max per sync cycle

        const response = await fetch(`${DASHBOARD_URL}/api/internal/sync`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": INTERNAL_SECRET
            },
            body: JSON.stringify({}),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`Sync failed with status: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        // Optional: Log success if needed, but keep it quiet to avoid spam
        // console.log(`[LOG SYNC] Synced ${data.results?.length || 0} servers`)
    } catch (e: any) {
        // Suppress connection refused errors during dev if dashboard is down
        if (e.cause?.code === "ECONNREFUSED") return
        if (e.name === "AbortError") {
            console.error("Failed to sync logs: sync cycle timed out (30s)")
            return
        }
        console.error("Failed to sync logs:", e.message)
    } finally {
        isSyncing = false
    }
}


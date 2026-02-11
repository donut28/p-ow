import { PrcServer, PrcPlayer, PrcJoinLog, PrcKillLog, PrcCommandLog } from "./prc-types"

const BASE_URL = "https://api.policeroleplay.community/v1"
const DEFAULT_WEBHOOK_URL = process.env.DISCORD_PUNISHMENT_WEBHOOK

// Rate limit state per server key
interface RateLimitState {
    remaining: number
    resetTime: number  // Epoch timestamp in ms
    blockedUntil: number  // Epoch timestamp in ms (for 429 retry_after)
    lastWebhookTime: number // For cooldown
}

// Persist state across module reloads in Next.js using globalThis
const globalForPrc = globalThis as unknown as {
    rateLimitStates: Map<string, RateLimitState> | undefined;
    requestQueues: Map<string, Promise<unknown>> | undefined;
};

// Global rate limit tracking (keyed by server API key hash for privacy)
const rateLimitStates = globalForPrc.rateLimitStates ??= new Map<string, RateLimitState>()

// Request queue to serialize requests per server key (prevents parallel requests bypassing rate limits)
const requestQueues = globalForPrc.requestQueues ??= new Map<string, Promise<unknown>>()

function getKeyHash(apiKey: string): string {
    return apiKey.slice(-8)
}

export class PrcClient {
    private apiKey: string
    private keyHash: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
        this.keyHash = getKeyHash(apiKey)
    }

    private getState(): RateLimitState {
        if (!rateLimitStates.has(this.keyHash)) {
            rateLimitStates.set(this.keyHash, {
                remaining: 35,
                resetTime: Date.now() + 1000,
                blockedUntil: 0,
                lastWebhookTime: 0
            })
        }
        return rateLimitStates.get(this.keyHash)!
    }

    private updateState(headers: Headers, retryAfter?: number) {
        const state = this.getState()
        const remaining = headers.get("X-RateLimit-Remaining")
        const reset = headers.get("X-RateLimit-Reset")

        if (remaining !== null) state.remaining = parseInt(remaining, 10)
        if (reset !== null) state.resetTime = parseInt(reset, 10) * 1000

        if (retryAfter !== undefined) {
            state.blockedUntil = Date.now() + (retryAfter * 1000)
            if (Date.now() - state.lastWebhookTime > 120000) {
                this.sendRateLimitWebhook(retryAfter)
                state.lastWebhookTime = Date.now()
            }
        }
    }

    private async sendRateLimitWebhook(retryAfter: number) {
        const webhookUrl = (globalThis as any).process?.env?.PRC_RATE_LIMIT_WEBHOOK || DEFAULT_WEBHOOK_URL
        if (!webhookUrl) return

        const waitString = `${Math.floor(retryAfter / 60)}m ${retryAfter % 60}s`
        try {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    embeds: [{
                        title: "🚨 PRC API Rate Limited",
                        description: `The application has been rate limited by the PRC API.\n\n**Wait Time:** \`${waitString}\` (${retryAfter}s)`,
                        color: 15548997,
                        timestamp: new Date().toISOString(),
                        fields: [{ name: "Key Hash", value: `\`...${this.keyHash}\``, inline: true }]
                    }]
                })
            })
        } catch (e) {
            console.error("[PRC] Failed to send rate limit webhook:", e)
        }
    }

    private async waitIfNeeded(): Promise<void> {
        const state = this.getState()
        const now = Date.now()

        if (state.blockedUntil > now) {
            const waitTime = state.blockedUntil - now
            await new Promise(resolve => setTimeout(resolve, waitTime))
            return
        }

        if (state.remaining <= 0 && state.resetTime > now) {
            const waitTime = state.resetTime - now + 100
            if (waitTime > 60000 && now - state.lastWebhookTime > 300000) {
                this.sendRateLimitWebhook(Math.ceil(waitTime / 1000))
                state.lastWebhookTime = now
            }
            await new Promise(resolve => setTimeout(resolve, waitTime))
            state.remaining = 35
        }
    }

    // Queued fetch — used for background sync to respect rate limits
    private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const currentQueue = requestQueues.get(this.keyHash) || Promise.resolve()
        const thisRequest = currentQueue.then(async () => this.doFetch<T>(endpoint, options))
        requestQueues.set(this.keyHash, thisRequest.catch(() => { }))
        return thisRequest
    }

    // Direct fetch — bypasses queue for user-initiated actions (commands)
    private async fetchDirect<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.doFetch<T>(endpoint, options)
    }

    private async doFetch<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
        const MAX_RETRIES = 3
        await this.waitIfNeeded()

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        try {
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers: { "Server-Key": this.apiKey, ...options.headers },
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            this.updateState(res.headers)

            if (!res.ok) {
                if (res.status === 429) {
                    let retryAfter = 5
                    try {
                        const body = await res.json()
                        retryAfter = body.retry_after || 5
                    } catch (e) { }

                    this.updateState(res.headers, retryAfter)
                    if (retryCount < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
                        return this.doFetch<T>(endpoint, options, retryCount + 1)
                    }
                    throw new Error("Rate Limited")
                }
                if (res.status === 403) throw new Error("Invalid API Key")
                throw new Error(`PRC API Error: ${res.statusText}`)
            }

            const text = await res.text()
            try {
                return text ? JSON.parse(text) : {} as T
            } catch (e) {
                console.error("[PRC] Failed to parse JSON:", text)
                return {} as T
            }
        } catch (error: any) {
            clearTimeout(timeoutId)
            if (error.name === 'AbortError') throw new Error("PRC API Timeout")
            throw error
        }
    }

    async getServer(): Promise<PrcServer> {
        return this.fetch<PrcServer>("/server")
    }

    async getPlayers(): Promise<PrcPlayer[]> {
        return this.fetch<PrcPlayer[]>("/server/players")
    }

    async getJoinLogs(): Promise<PrcJoinLog[]> {
        return this.fetch<PrcJoinLog[]>("/server/joinlogs")
    }

    async getKillLogs(): Promise<PrcKillLog[]> {
        return this.fetch<PrcKillLog[]>("/server/killlogs")
    }

    async getCommandLogs(): Promise<PrcCommandLog[]> {
        return this.fetch<PrcCommandLog[]>("/server/commandlogs")
    }

    async executeCommand(command: string): Promise<any> {
        return this.fetchDirect("/server/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command })
        })
    }
}

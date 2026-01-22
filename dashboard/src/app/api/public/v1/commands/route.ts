import { PrcClient } from "@/lib/prc"
import { validatePublicApiKey, findServerByName, logApiAccess } from "@/lib/public-auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const auth = await validatePublicApiKey()
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const serverName = searchParams.get("server")

    if (!serverName) return NextResponse.json({ error: "Missing server name" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { command } = body

    if (!command) return NextResponse.json({ error: "Missing 'command' in body" }, { status: 400 })

    const server = await findServerByName(serverName)
    if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 })

    try {
        const client = new PrcClient(server.apiUrl)
        await client.executeCommand(command)

        await logApiAccess(auth.apiKey, "PUBLIC_COMMAND_EXECUTED", `Server: ${server.name}, Command: ${command}`)
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Public Command API Error:", e)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

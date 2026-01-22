
import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Debug endpoint to check what external accounts are linked
export async function GET() {
    const user = await currentUser()
    if (!user) return new NextResponse("Not logged in", { status: 401 })

    const accounts = user.externalAccounts.map(a => ({
        provider: a.provider,
        externalId: a.externalId,
        username: a.username,
        firstName: a.firstName,
        lastName: a.lastName,
        imageUrl: a.imageUrl
    }))

    return NextResponse.json({
        userId: user.id,
        externalAccounts: accounts,
        allProviders: user.externalAccounts.map(a => a.provider)
    }, { status: 200 })
}

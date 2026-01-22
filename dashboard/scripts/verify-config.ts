
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("Checking Server Configuration...")
    try {
        const servers = await prisma.server.findMany({
            include: { roles: true }
        })

        if (servers.length === 0) {
            console.log("No servers found in database.")
            return
        }

        for (const server of servers) {
            console.log(`\nSERVER: ${server.name} (ID: ${server.id})`)
            console.log(`- Discord Guild ID: ${server.discordGuildId ? server.discordGuildId : "MISSING ❌"}`)

            console.log("- Roles with Discord ID:")
            const linkedRoles = server.roles.filter((r: any) => r.discordRoleId)
            const allRoles = server.roles

            if (linkedRoles.length === 0) {
                console.log("  NONE! No roles have a Discord Role ID. ❌")
            } else {
                linkedRoles.forEach((r: any) => {
                    console.log(`  ✓ ${r.name}: ${r.discordRoleId}`)
                })
            }

            if (allRoles.length > 0 && linkedRoles.length < allRoles.length) {
                console.log(`  (Total roles: ${allRoles.length}, Unlinked: ${allRoles.length - linkedRoles.length})`)
            }
        }
    } catch (e) {
        console.error("Error querying database:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()

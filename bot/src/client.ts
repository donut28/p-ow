import { Client, GatewayIntentBits } from "discord.js"
import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config()

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // For role management
        GatewayIntentBits.GuildMessages
    ]
})

export const prisma = new PrismaClient()

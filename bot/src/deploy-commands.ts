import { REST, Routes, SlashCommandBuilder } from "discord.js"
import dotenv from "dotenv"

dotenv.config()

const commands = [
    // LOA Command
    new SlashCommandBuilder()
        .setName("loa")
        .setDescription("Manage Leave of Absences")
        .addSubcommand((sub: any) =>
            sub.setName("request")
                .setDescription("Request a Leave of Absence")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("The server to request LOA for (or 'all' for global)")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("start_date")
                        .setDescription("Start date (YYYY-MM-DD)")
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("end_date")
                        .setDescription("End date (YYYY-MM-DD)")
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("reason")
                        .setDescription("Reason for LOA")
                        .setRequired(true))
        ),

    // Shift Command
    new SlashCommandBuilder()
        .setName("shift")
        .setDescription("Manage your shift")
        .addSubcommand((sub: any) =>
            sub.setName("start")
                .setDescription("Start a shift")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("Server to start shift on")
                        .setAutocomplete(true)
                        .setRequired(true))
        )
        .addSubcommand((sub: any) =>
            sub.setName("end")
                .setDescription("End your current shift")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("Server to end shift on")
                        .setAutocomplete(true)
                        .setRequired(true))
        )
        .addSubcommand((sub: any) =>
            sub.setName("status")
                .setDescription("Check your current shift status")
        ),

    // Quota Command
    new SlashCommandBuilder()
        .setName("quota")
        .setDescription("Check quota statistics")
        .addSubcommand((sub: any) =>
            sub.setName("status")
                .setDescription("Check your quota status across all servers")
        )
        .addSubcommand((sub: any) =>
            sub.setName("leaderboard")
                .setDescription("View global quota leaderboard for all members")
        ),

    // In-game Command
    new SlashCommandBuilder()
        .setName("command")
        .setDescription("Execute an in-game command")
        .addStringOption((opt: any) =>
            opt.setName("server")
                .setDescription("Target server")
                .setAutocomplete(true)
                .setRequired(true))
        .addStringOption((opt: any) =>
            opt.setName("cmd")
                .setDescription("Command to execute (e.g. ':announce Hello')")
                .setRequired(true)),

    // Log Punishment Command
    new SlashCommandBuilder()
        .setName("log")
        .setDescription("Log a punishment or view logs")
        .addSubcommand((sub: any) =>
            sub.setName("punishment")
                .setDescription("Log a punishment against a player")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("Server where punishment occurred")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("username")
                        .setDescription("Roblox username of the player")
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("type")
                        .setDescription("Type of punishment")
                        .setRequired(true)
                        .addChoices(
                            { name: "Warn", value: "Warn" },
                            { name: "Kick", value: "Kick" },
                            { name: "Ban", value: "Ban" },
                            { name: "Ban Bolo", value: "Ban Bolo" }
                        ))
                .addStringOption((opt: any) =>
                    opt.setName("reason")
                        .setDescription("Reason for punishment")
                        .setRequired(true))
        )
        .addSubcommand((sub: any) =>
            sub.setName("view")
                .setDescription("View logs or punishments for a Roblox user")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("Server to view logs from")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("username")
                        .setDescription("Roblox username to search for")
                        .setRequired(true))
                .addStringOption((opt: any) =>
                    opt.setName("type")
                        .setDescription("Type of logs to view")
                        .setRequired(true)
                        .addChoices(
                            { name: "All Logs", value: "all" },
                            { name: "Joins/Leaves", value: "join" },
                            { name: "Kills", value: "kill" },
                            { name: "Commands", value: "command" },
                            { name: "Punishments", value: "punishment" }
                        ))
        ),

    // Manage Panel Roles (Sync)
    new SlashCommandBuilder()
        .setName("sync")
        .setDescription("Sync your roles and permissions"),

    // Staff Request Command
    new SlashCommandBuilder()
        .setName("staffrequest")
        .setDescription("Request staff assistance on a server")
        .addStringOption((opt: any) =>
            opt.setName("server")
                .setDescription("Target server")
                .setAutocomplete(true)
                .setRequired(true))
        .addStringOption((opt: any) =>
            opt.setName("reason")
                .setDescription("Reason for staff request")
                .setRequired(true)),

    // Server Status Command
    new SlashCommandBuilder()
        .setName("server")
        .setDescription("Server management commands")
        .addSubcommand((sub: any) =>
            sub.setName("status")
                .setDescription("View server status (players, staff, etc.)")
                .addStringOption((opt: any) =>
                    opt.setName("server")
                        .setDescription("Server to check")
                        .setAutocomplete(true)
                        .setRequired(true)))

].map(c => c.toJSON())

export async function deployCommands() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!)

    try {
        console.log("Syncing slash commands with Discord...")

        if (!process.env.CLIENT_ID || !process.env.GUILD_ID) {
            console.warn("Missing CLIENT_ID or GUILD_ID - skipping command sync")
            return
        }

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        )

        console.log("✓ Slash commands synced successfully")
    } catch (error) {
        console.error("Failed to sync commands:", error)
    }
}

// Allow running standalone with: npx ts-node src/deploy-commands.ts
if (require.main === module) {
    deployCommands()
}

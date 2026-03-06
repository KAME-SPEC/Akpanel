const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const app = express();

// --- CONFIGURATION ---
let activeScript = "print('Ak Tp: No script set yet!')";
let keys = new Map(); // In-memory database (Resets if bot restarts, use Neon.tech later to save permanently)

// --- 1. THE "CODE HIDER" (ROBLOX ENDPOINT) ---
app.get("/api/v1/loader", (req, res) => {
    const key = req.query.key;
    const hwid = req.headers["roblox-id"] || "no-hwid";
    const userAgent = req.headers["user-agent"] || "";

    // Security: Only allow Roblox
    if (!userAgent.includes("Roblox")) return res.status(403).send("-- Access Denied.");

    // Validate Key
    if (!keys.has(key)) return res.status(401).send("print('Invalid Key')");

    // HWID Lock Logic
    let data = keys.get(key);
    if (!data.hwid) {
        data.hwid = hwid; // Lock it
    } else if (data.hwid !== hwid) {
        return res.status(403).send("print('HWID Mismatch: Key locked to another PC')");
    }

    res.setHeader("Content-Type", "text/plain");
    res.send(activeScript);
});

// --- 2. DISCORD BOT COMMANDS ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'genkey') {
        const newKey = "AK-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        keys.set(newKey, { hwid: null });
        await interaction.reply(`Generated Key: \`${newKey}\``);
    }

    if (interaction.commandName === 'setscript') {
        activeScript = interaction.options.getString('code');
        await interaction.reply("✅ Script Updated! Your loader is now pulling the new code.");
    }
});

// --- 3. STARTUP ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN).then(() => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: [
            new SlashCommandBuilder().setName('genkey').setDescription('Generate an Ak-Tp Key'),
            new SlashCommandBuilder().setName('setscript').setDescription('Set Luau Code').addStringOption(o => o.setName('code').setDescription('The script').setRequired(true))
        ]
    });
});
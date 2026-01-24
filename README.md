# ⚠️ THIS PROJECT IS NOT MEANT TO BE DEPLOYED ON OTHER SYSTEMS. USE LIMITED TO LACOMM. READ LICENSE.

---

# Project Overwatch (POW)

A comprehensive moderation platform for Roblox ER:LC communities, featuring a real-time dashboard, Discord bot integration, and desktop overlay tool.

## 🏗️ Architecture

This is a monorepo containing three main components:

```
p-ow/
├── dashboard/    # Next.js web dashboard
├── bot/          # Discord bot
└── vision/       # Electron desktop overlay (POW Vision)
```

### Dashboard (`/dashboard`)
- **Stack**: Next.js 14, React, Tailwind CSS, Prisma (SQLite)
- **Auth**: Clerk
- **Features**: 
  - Real-time mod panel with player search
  - Punishment logging and history
  - Staff activity tracking
  - Server management
  - API key management for external integrations

### Bot (`/bot`)
- **Stack**: Discord.js
- **Features**:
  - Slash commands for server info and management
  - Automatic log syncing with the dashboard
  - Integration with PRC (Police Roleplay Community) API

### Vision (`/vision`)
- **Stack**: Electron, React, Vite
- **Features**:
  - Always-on-top overlay for in-game moderation
  - OCR-based player identification using AI (Mistral)
  - Quick punishment actions (Warn, Kick, Ban, BOLO)
  - System tray support with hotkey toggle

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm

### Development

1. **Install dependencies**:
   ```bash
   npm install
   cd dashboard && npm install
   cd ../bot && npm install
   cd ../vision && npm install
   ```

2. **Set up environment**:
   Copy `.env.example` to `.env` and fill in your credentials.

3. **Run components**:
   ```bash
   # Dashboard
   cd dashboard && npm run dev

   # Bot
   cd bot && npm run dev

   # Vision
   cd vision && npm run dev
   ```

## 📦 Deployment

Use the included `deploy.sh` script for zero-downtime deployments:

```bash
./deploy.sh
```

This script will:
- Prompt for required secrets (first-time only)
- Build all components
- Run database migrations
- Switch traffic to the new release atomically
- Keep the last 3 releases for easy rollback

## 🔑 Environment Variables

See `.env.example` for all required variables. Key ones include:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database path |
| `CLERK_SECRET_KEY` | Clerk authentication |
| `DISCORD_TOKEN` | Discord bot token |
| `VISION_JWT_SECRET` | JWT signing key for Vision auth |
| `VISION_HMAC_SECRET` | HMAC key for Vision request signing |
| `MISTRAL_API_KEY` | AI for OCR processing |

## 📄 License

This project is licensed under a custom restrictive license. See [LICENSE](LICENSE) for details.

---

Built with ❤️ by the POW Team

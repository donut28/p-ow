# Project Overwatch Public API (v1.4)

The definitive guide for integrating with the Project Overwatch ecosystem.

## 🚀 Newly Added: Discovery & Management

### 1. Global Server Discovery
Get a list of all servers managed by this instance. Useful for multi-server bots.
`GET /api/public/v1/servers`

### 2. Staff Directory
Lookup all registered staff members for a specific server.
`GET /api/public/v1/members?server=LACOMM Server A`

### 3. Shift Tracking (External Clock-in)
You can now manage staff shifts from external tools (e.g., Discord /clockin commands).

*   **Check Status**: `GET /api/public/v1/shifts/status?server=...&userId=...`
*   **Clock In**: `POST /api/public/v1/shifts/start?server=...` (Body: `{ "userId": "..." }`)
*   **Clock Out**: `POST /api/public/v1/shifts/end?server=...` (Body: `{ "userId": "..." }`)

---

## 🛡️ Moderation & Logging
*   **Log Punishment**: `POST /api/public/v1/punishments?server=...`
*   **Resolve Bolo**: `POST /api/public/v1/punishments/resolve?id=...`
*   **Fetch Logs**: `GET /api/public/v1/logs?server=...&type=join|kill|command`

## 📊 Real-time Data
*   **Server Stats**: `GET /api/public/v1/stats?server=...`
*   **In-game Players**: `GET /api/public/v1/players?server=...`
*   **Duty List**: `GET /api/public/v1/staff/on-duty?server=...`

## 🛠️ Commands & Interaction
*   **Execute Command**: `POST /api/public/v1/commands?server=...` (Body: `{ "command": "..." }`)
*   **Staff Request**: `POST /api/public/v1/staff/request?server=...`

---

## 📖 Full Technical Spec
All request and response schemas are meticulously documented in:
[openapi.yaml](file:///Users/ciankellya/p-ow/dashboard/public/openapi.yaml)

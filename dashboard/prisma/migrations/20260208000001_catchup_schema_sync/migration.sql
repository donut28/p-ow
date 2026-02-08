-- AlterTable
ALTER TABLE "Form" ADD COLUMN "ignoredRoleIds" TEXT;
ALTER TABLE "Form" ADD COLUMN "requiredRoleIds" TEXT;
ALTER TABLE "Form" ADD COLUMN "thankYouMessage" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "discordId" TEXT;

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "lastRunAt" DATETIME,
    "serverId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Automation_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BotQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "BotQueue_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME,
    "rateLimit" INTEGER NOT NULL DEFAULT 5,
    "dailyLimit" INTEGER NOT NULL DEFAULT 500,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BannedIp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SecurityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "quotaMinutes" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "discordRoleId" TEXT,
    "canShift" BOOLEAN NOT NULL DEFAULT true,
    "canViewOtherShifts" BOOLEAN NOT NULL DEFAULT true,
    "canViewLogs" BOOLEAN NOT NULL DEFAULT true,
    "canViewPunishments" BOOLEAN NOT NULL DEFAULT true,
    "canIssueWarnings" BOOLEAN NOT NULL DEFAULT true,
    "canKick" BOOLEAN NOT NULL DEFAULT true,
    "canBan" BOOLEAN NOT NULL DEFAULT true,
    "canBanBolo" BOOLEAN NOT NULL DEFAULT true,
    "canUseToolbox" BOOLEAN NOT NULL DEFAULT true,
    "canManageBolos" BOOLEAN NOT NULL DEFAULT true,
    "canRequestLoa" BOOLEAN NOT NULL DEFAULT true,
    "canViewQuota" BOOLEAN NOT NULL DEFAULT true,
    "canUseAdminCommands" BOOLEAN NOT NULL DEFAULT false,
    "serverId" TEXT NOT NULL,
    CONSTRAINT "Role_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Role" ("color", "id", "isDefault", "name", "quotaMinutes", "serverId") SELECT "color", "id", "isDefault", "name", "quotaMinutes", "serverId" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "customName" TEXT,
    "discordGuildId" TEXT,
    "suspendedRoleId" TEXT,
    "terminatedRoleId" TEXT,
    "staffRoleId" TEXT,
    "permLogChannelId" TEXT,
    "staffRequestChannelId" TEXT,
    "raidAlertChannelId" TEXT,
    "commandLogChannelId" TEXT,
    "onDutyRoleId" TEXT,
    "autoSyncRoles" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriberUserId" TEXT,
    "subscriptionPlan" TEXT,
    "customBotToken" TEXT,
    "customBotEnabled" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Server" ("api_key", "autoSyncRoles", "bannerUrl", "createdAt", "customName", "id", "name", "onDutyRoleId", "raidAlertChannelId") SELECT "api_key", "autoSyncRoles", "bannerUrl", "createdAt", "customName", "id", "name", "onDutyRoleId", "raidAlertChannelId" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Automation_serverId_idx" ON "Automation"("serverId");

-- CreateIndex
CREATE INDEX "BotQueue_serverId_status_idx" ON "BotQueue"("serverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BannedIp_ip_key" ON "BannedIp"("ip");

-- CreateIndex
CREATE INDEX "SecurityLog_ip_idx" ON "SecurityLog"("ip");

-- CreateIndex
CREATE INDEX "SecurityLog_createdAt_idx" ON "SecurityLog"("createdAt");

-- CreateIndex
CREATE INDEX "Log_serverId_type_prcTimestamp_idx" ON "Log"("serverId", "type", "prcTimestamp");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_discordId_serverId_idx" ON "Member"("discordId", "serverId");

-- CreateIndex
CREATE INDEX "Punishment_serverId_userId_createdAt_idx" ON "Punishment"("serverId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "Shift_userId_startTime_idx" ON "Shift"("userId", "startTime");

-- CreateIndex
CREATE INDEX "Shift_serverId_startTime_idx" ON "Shift"("serverId", "startTime");

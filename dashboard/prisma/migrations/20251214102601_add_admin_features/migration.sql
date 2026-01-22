/*
  Warnings:

  - You are about to drop the column `content` on the `Log` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Log` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Server" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Server" ADD COLUMN "customName" TEXT;

-- CreateTable
CREATE TABLE "LeaveOfAbsence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveOfAbsence_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Punishment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Punishment_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Punishment" ("createdAt", "id", "moderatorId", "reason", "serverId", "type", "userId") SELECT "createdAt", "id", "moderatorId", "reason", "serverId", "type", "userId" FROM "Punishment";
DROP TABLE "Punishment";
ALTER TABLE "new_Punishment" RENAME TO "Punishment";
CREATE TABLE "new_Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "playerName" TEXT,
    "playerId" TEXT,
    "killerName" TEXT,
    "killerId" TEXT,
    "victimName" TEXT,
    "victimId" TEXT,
    "command" TEXT,
    "arguments" TEXT,
    "isJoin" BOOLEAN NOT NULL DEFAULT true,
    "prcTimestamp" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("id", "serverId", "type") SELECT "id", "serverId", "type" FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
CREATE INDEX "Log_serverId_createdAt_idx" ON "Log"("serverId", "createdAt");
CREATE INDEX "Log_playerId_idx" ON "Log"("playerId");
CREATE INDEX "Log_killerId_idx" ON "Log"("killerId");
CREATE INDEX "Log_victimId_idx" ON "Log"("victimId");
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "serverId" TEXT NOT NULL,
    "roleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Member_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Member_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("createdAt", "id", "roleId", "serverId", "userId") SELECT "createdAt", "id", "roleId", "serverId", "userId" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_userId_serverId_key" ON "Member"("userId", "serverId");
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "quotaMinutes" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "serverId" TEXT NOT NULL,
    CONSTRAINT "Role_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Role" ("color", "id", "isDefault", "name", "quotaMinutes", "serverId") SELECT "color", "id", "isDefault", "name", "quotaMinutes", "serverId" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "LeaveOfAbsence_serverId_status_idx" ON "LeaveOfAbsence"("serverId", "status");

-- CreateIndex
CREATE INDEX "LeaveOfAbsence_userId_idx" ON "LeaveOfAbsence"("userId");

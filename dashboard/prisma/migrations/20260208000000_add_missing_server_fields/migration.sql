-- AlterTable
ALTER TABLE "Server" ADD COLUMN "onDutyRoleId" TEXT;
ALTER TABLE "Server" ADD COLUMN "autoSyncRoles" BOOLEAN NOT NULL DEFAULT false;

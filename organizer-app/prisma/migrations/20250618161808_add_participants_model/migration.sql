/*
  Warnings:

  - A unique constraint covering the columns `[leaderId]` on the table `teams` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "leaderId" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "ledTeamId" TEXT,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "participants_userId_key" ON "participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "participants_ledTeamId_key" ON "participants"("ledTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_leaderId_key" ON "teams"("leaderId");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_ledTeamId_fkey" FOREIGN KEY ("ledTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

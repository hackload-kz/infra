-- CreateEnum
CREATE TYPE "JournalEventType" AS ENUM ('PARTICIPANT_CREATED', 'PROFILE_UPDATED', 'MESSAGE_RECEIVED', 'TEAM_CREATED', 'TEAM_UPDATED', 'TEAM_DELETED', 'JOIN_REQUEST_CREATED', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED', 'JOINED_TEAM', 'LEFT_TEAM', 'INVITED_TO_TEAM', 'TEAM_STATUS_UPDATED', 'ADMIN_TEAM_EDIT', 'SYSTEM_EVENT');

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "eventType" "JournalEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityId" TEXT,
    "entityType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "participantId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
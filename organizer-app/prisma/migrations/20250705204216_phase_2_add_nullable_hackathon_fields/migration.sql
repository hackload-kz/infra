-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "telegram" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "hackathonId" TEXT,
ADD COLUMN     "level" "TeamLevel",
ADD COLUMN     "status" "TeamStatus" DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "join_requests" (
    "id" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "hackathonId" TEXT,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

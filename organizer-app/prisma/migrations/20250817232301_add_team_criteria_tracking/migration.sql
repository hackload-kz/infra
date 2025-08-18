-- CreateEnum
CREATE TYPE "CriteriaType" AS ENUM ('CODE_REPO', 'DEPLOYED_SOLUTION', 'EVENT_SEARCH', 'ARCHIVE_SEARCH', 'AUTH_PERFORMANCE', 'TICKET_BOOKING', 'TICKET_CANCELLATION', 'BUDGET_TRACKING');

-- CreateEnum
CREATE TYPE "CriteriaStatus" AS ENUM ('PASSED', 'FAILED', 'NO_DATA');

-- AlterEnum
BEGIN;
CREATE TYPE "TestRunStatus_new" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
ALTER TABLE "test_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "test_runs" ALTER COLUMN "status" TYPE "TestRunStatus_new" USING ("status"::text::"TestRunStatus_new");
ALTER TYPE "TestRunStatus" RENAME TO "TestRunStatus_old";
ALTER TYPE "TestRunStatus_new" RENAME TO "TestRunStatus";
DROP TYPE "TestRunStatus_old";
ALTER TABLE "test_runs" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- CreateTable
CREATE TABLE "team_criteria" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "criteriaType" "CriteriaType" NOT NULL,
    "status" "CriteriaStatus" NOT NULL DEFAULT 'NO_DATA',
    "score" INTEGER,
    "metrics" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_criteria_history" (
    "id" TEXT NOT NULL,
    "teamCriteriaId" TEXT NOT NULL,
    "status" "CriteriaStatus" NOT NULL,
    "score" INTEGER,
    "metrics" JSONB,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_criteria_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_criteria_teamId_hackathonId_criteriaType_key" ON "team_criteria"("teamId", "hackathonId", "criteriaType");

-- AddForeignKey
ALTER TABLE "team_criteria" ADD CONSTRAINT "team_criteria_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_criteria" ADD CONSTRAINT "team_criteria_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_criteria_history" ADD CONSTRAINT "team_criteria_history_teamCriteriaId_fkey" FOREIGN KEY ("teamCriteriaId") REFERENCES "team_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
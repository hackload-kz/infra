-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "comment" TEXT,
    "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

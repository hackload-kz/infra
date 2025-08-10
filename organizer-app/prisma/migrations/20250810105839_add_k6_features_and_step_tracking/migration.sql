-- CreateEnum
CREATE TYPE "TestRunStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DELETED');

-- AlterEnum
-- This migration adds the SUCCEEDED value to the existing enum and removes COMPLETED
ALTER TYPE "TestRunStatus" ADD VALUE 'SUCCEEDED';
-- Note: In production, you would need to migrate existing COMPLETED values to SUCCEEDED first
-- UPDATE "test_runs" SET status = 'SUCCEEDED' WHERE status = 'COMPLETED';
-- UPDATE "test_run_steps" SET status = 'SUCCEEDED' WHERE status = 'SUCCEEDED';
-- Then remove the old value (requires recreation of enum in PostgreSQL)

-- CreateTable
CREATE TABLE "distributed_locks" (
    "id" TEXT NOT NULL,
    "lockName" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "distributed_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run_steps" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "scenarioStepId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepType" "TestStepType" NOT NULL,
    "k6TestName" TEXT,
    "status" "TestRunStepStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastStatusCheck" TIMESTAMP(3),
    "containerLogs" TEXT,
    "k6Results" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_run_steps_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "k6EnvironmentVars" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "distributed_locks_lockName_key" ON "distributed_locks"("lockName");

-- CreateIndex
CREATE UNIQUE INDEX "test_run_steps_testRunId_stepOrder_key" ON "test_run_steps"("testRunId", "stepOrder");

-- AddForeignKey
ALTER TABLE "test_run_steps" ADD CONSTRAINT "test_run_steps_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_steps" ADD CONSTRAINT "test_run_steps_scenarioStepId_fkey" FOREIGN KEY ("scenarioStepId") REFERENCES "test_scenario_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

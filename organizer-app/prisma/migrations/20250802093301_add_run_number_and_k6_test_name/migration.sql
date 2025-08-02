-- AlterTable
ALTER TABLE "test_runs" ADD COLUMN "k6TestName" TEXT;

-- AlterTable
ALTER TABLE "test_runs" ADD COLUMN "runNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "test_runs_runNumber_key" ON "test_runs"("runNumber");
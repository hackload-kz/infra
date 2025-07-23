-- CreateEnum
CREATE TYPE "TestStepType" AS ENUM ('k6_script', 'http_request');

-- CreateTable
CREATE TABLE "test_scenarios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "test_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_scenario_steps" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepType" "TestStepType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_scenario_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_scenarios_identifier_key" ON "test_scenarios"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "test_scenario_steps_scenarioId_stepOrder_key" ON "test_scenario_steps"("scenarioId", "stepOrder");

-- AddForeignKey
ALTER TABLE "test_scenario_steps" ADD CONSTRAINT "test_scenario_steps_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "test_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

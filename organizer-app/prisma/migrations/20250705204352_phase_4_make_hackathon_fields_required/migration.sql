/*
  Warnings:

  - Made the column `hackathonId` on table `join_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hackathonId` on table `teams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `teams` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "join_requests" ALTER COLUMN "hackathonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "hackathonId" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;

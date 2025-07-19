-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JournalEventType" ADD VALUE 'TEAM_ENVIRONMENT_UPDATED';
ALTER TYPE "JournalEventType" ADD VALUE 'TEAM_ENVIRONMENT_DELETED';

-- CreateTable
CREATE TABLE "team_environment_data" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isSecure" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "team_environment_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY['environment:write']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "service_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_api_key_usage" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "teamId" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_api_key_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_environment_data_teamId_key_key" ON "team_environment_data"("teamId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "service_api_keys_keyHash_key" ON "service_api_keys"("keyHash");

-- AddForeignKey
ALTER TABLE "team_environment_data" ADD CONSTRAINT "team_environment_data_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_api_key_usage" ADD CONSTRAINT "service_api_key_usage_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "service_api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

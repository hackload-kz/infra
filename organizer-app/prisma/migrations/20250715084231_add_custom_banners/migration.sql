-- CreateEnum
CREATE TYPE "CustomBannerType" AS ENUM ('INFO', 'WARN');

-- CreateTable
CREATE TABLE "custom_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CustomBannerType" NOT NULL,
    "displayStart" TIMESTAMP(3) NOT NULL,
    "displayEnd" TIMESTAMP(3) NOT NULL,
    "allowDismiss" BOOLEAN NOT NULL DEFAULT true,
    "hackathonId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_banner_dismissals" (
    "id" TEXT NOT NULL,
    "customBannerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_banner_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_banner_dismissals_customBannerId_participantId_hacka_key" ON "custom_banner_dismissals"("customBannerId", "participantId", "hackathonId");

-- AddForeignKey
ALTER TABLE "custom_banners" ADD CONSTRAINT "custom_banners_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_banner_dismissals" ADD CONSTRAINT "custom_banner_dismissals_customBannerId_fkey" FOREIGN KEY ("customBannerId") REFERENCES "custom_banners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_banner_dismissals" ADD CONSTRAINT "custom_banner_dismissals_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_banner_dismissals" ADD CONSTRAINT "custom_banner_dismissals_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

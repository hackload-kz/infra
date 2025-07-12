-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('TELEGRAM_PROFILE', 'GITHUB_PROFILE', 'FIND_TEAM', 'TEAM_NEEDS_MEMBERS');

-- CreateTable
CREATE TABLE "dismissed_banners" (
    "id" TEXT NOT NULL,
    "bannerType" "BannerType" NOT NULL,
    "participantId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_banners_participantId_bannerType_hackathonId_key" ON "dismissed_banners"("participantId", "bannerType", "hackathonId");

-- AddForeignKey
ALTER TABLE "dismissed_banners" ADD CONSTRAINT "dismissed_banners_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dismissed_banners" ADD CONSTRAINT "dismissed_banners_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

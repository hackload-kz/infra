-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "cloudProviders" TEXT,
ADD COLUMN     "cloudServices" TEXT,
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "otherCloudProviders" TEXT,
ADD COLUMN     "otherCloudServices" TEXT,
ADD COLUMN     "otherTechnologies" TEXT,
ADD COLUMN     "technologies" TEXT;

-- Add profile enhancement fields to participants table
ALTER TABLE "participants" ADD COLUMN "programmingLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "participants" ADD COLUMN "databases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "participants" ADD COLUMN "description" TEXT;

-- Add profile enhancement fields to teams table
ALTER TABLE "teams" ADD COLUMN "acceptedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "teams" ADD COLUMN "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "teams" ADD COLUMN "description" TEXT;
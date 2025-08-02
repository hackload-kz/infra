-- Rollback script for add_run_number_and_k6_test_name migration
-- Run this if you need to rollback the migration

-- Drop unique index
DROP INDEX IF EXISTS "test_runs_runNumber_key";

-- Remove columns (this will lose data!)
ALTER TABLE "test_runs" DROP COLUMN IF EXISTS "runNumber";
ALTER TABLE "test_runs" DROP COLUMN IF EXISTS "k6TestName";
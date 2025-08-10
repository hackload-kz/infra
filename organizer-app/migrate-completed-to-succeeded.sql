-- Update existing COMPLETED records to SUCCEEDED in TestRunStatus
UPDATE "TestRun" 
SET status = 'SUCCEEDED' 
WHERE status = 'COMPLETED';

-- Update existing COMPLETED records to SUCCEEDED in TestRunStepStatus  
UPDATE "TestRunStep" 
SET status = 'SUCCEEDED' 
WHERE status = 'COMPLETED';
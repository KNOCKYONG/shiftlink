-- Add level column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 3;

-- Add comment for clarity
COMMENT ON COLUMN employees.level IS 'Employee hierarchy level: 1=Team Lead, 2=Senior, 3=Junior, etc.';

-- Update existing employees to have appropriate levels based on role
UPDATE employees 
SET level = CASE 
  WHEN role = 'admin' THEN 1
  WHEN role = 'manager' THEN 2
  ELSE 3
END
WHERE level IS NULL;
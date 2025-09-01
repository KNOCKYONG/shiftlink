-- Add ratio column to organization_hierarchy table
ALTER TABLE organization_hierarchy 
ADD COLUMN IF NOT EXISTS distribution_ratio INTEGER DEFAULT 1;

-- Set default ratios (1:2:2 for 3 levels)
UPDATE organization_hierarchy 
SET distribution_ratio = CASE 
  WHEN level = 1 THEN 1  -- 관리자 적게
  WHEN level = 2 THEN 2  -- 시니어 많이
  WHEN level = 3 THEN 2  -- 주니어 많이
  ELSE 1
END
WHERE distribution_ratio IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN organization_hierarchy.distribution_ratio IS 'Distribution ratio for this level when creating schedules (e.g., 1:2:2 means managers:seniors:juniors)';
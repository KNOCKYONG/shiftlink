-- IMPORTANT: Execute these files in order to ensure all dependencies are met
-- 
-- This script assumes you're running it in Supabase SQL Editor or psql
-- Make sure to execute each file in the order listed below

-- Step 1: Create base schema (if not already created)
-- This creates tenants, sites, teams, employees tables
-- Execute: schema.sql or ensure these tables exist

-- Step 2: Create extended schema features (if needed)
-- Execute: schema_v2.sql

-- Step 3: Set up RLS policies
-- Execute: rls_policies.sql

-- Step 4: Create work pattern preferences
-- Execute: work_pattern_preferences.sql

-- Step 5: Create default requests (with fixed syntax)
-- Execute: default_requests_fixed.sql

-- Step 6: Create leave management system  
-- Execute: leave_management.sql

-- Step 7: Create swap settings
-- Execute: swap_settings.sql

-- Step 8: Create schedule shares
-- Execute: schedule_shares.sql

-- If you want to execute everything at once, uncomment and run:
/*
\i schema.sql
\i schema_v2.sql
\i rls_policies.sql
\i work_pattern_preferences.sql
\i default_requests_fixed.sql
\i leave_management.sql
\i swap_settings.sql
\i schedule_shares.sql
*/

-- Or if using Supabase Dashboard, run each file's content in order

-- Quick check to verify tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'employees', 'default_requests')
ORDER BY table_name;
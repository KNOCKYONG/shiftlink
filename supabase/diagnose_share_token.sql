-- Diagnostic script to find where share_token error occurs

-- Step 1: Check if schedule_shares table exists
SELECT 
    'Checking schedule_shares table' as step,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_shares'
    ) as table_exists;

-- Step 2: If schedule_shares exists, check its columns
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'schedule_shares'
ORDER BY ordinal_position;

-- Step 3: Check if there are any views or functions referencing share_token
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%share_token%';

-- Step 4: Check for any policies that might reference share_token
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND (qual LIKE '%share_token%' OR with_check LIKE '%share_token%');

-- Step 5: Test creating a simple table with share_token column
BEGIN;
DROP TABLE IF EXISTS test_share_token CASCADE;
CREATE TABLE test_share_token (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
);
-- Check if column was created
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'test_share_token' AND column_name = 'share_token';
ROLLBACK;

-- Step 6: Check if the error is in a specific line
-- Try creating just the table without functions
BEGIN;
DROP TABLE IF EXISTS schedule_shares_test CASCADE;
CREATE TABLE schedule_shares_test (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  share_type VARCHAR(20) DEFAULT 'view'
);
-- Check if this works
SELECT 'Table created with share_token column' as result
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_shares_test' 
    AND column_name = 'share_token'
);
ROLLBACK;
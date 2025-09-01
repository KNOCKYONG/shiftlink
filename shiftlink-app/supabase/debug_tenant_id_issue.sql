-- Debug script to identify the tenant_id column issue
-- Run these queries step by step to diagnose the problem

-- Step 1: Check if tenants table exists
SELECT 
    'Checking tenants table' as step,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
    ) as table_exists;

-- Step 2: Check tenants table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'tenants'
ORDER BY ordinal_position;

-- Step 3: Check if employees table exists
SELECT 
    'Checking employees table' as step,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
    ) as table_exists;

-- Step 4: Check employees table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'employees'
ORDER BY ordinal_position;

-- Step 5: Check if default_requests table already exists
SELECT 
    'Checking default_requests table' as step,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'default_requests'
    ) as table_exists;

-- Step 6: If default_requests exists, check its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'default_requests'
ORDER BY ordinal_position;

-- Step 7: Check all foreign key constraints on default_requests
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'default_requests';

-- Step 8: Check if there are any RLS policies causing issues
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'default_requests';

-- Step 9: Try to identify the exact line causing the error
-- This will help pinpoint if it's in table creation, RLS policy, or function
\echo 'If the error occurs during table creation, it might be because:'
\echo '1. The tenants table does not exist yet'
\echo '2. The employees table does not exist yet'
\echo '3. There is a typo in the column reference'
\echo '4. The schema/search_path is incorrect'

-- Step 10: Check current schema search path
SHOW search_path;
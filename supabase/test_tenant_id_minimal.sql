-- Minimal test to isolate the tenant_id error
-- Run each section separately to identify where the error occurs

-- Test 1: Simple table creation with tenant_id
BEGIN;
CREATE TABLE test_table_1 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(100)
);
-- If this works, the issue is not with the column name itself
DROP TABLE IF EXISTS test_table_1;
ROLLBACK;

-- Test 2: Create table with foreign key to tenants
BEGIN;
-- First ensure tenants table exists
CREATE TABLE IF NOT EXISTS tenants_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL
);

-- Then create a table referencing it
CREATE TABLE test_table_2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants_test(id),
    name VARCHAR(100)
);
-- If this fails, the issue is with the foreign key reference
DROP TABLE IF EXISTS test_table_2;
DROP TABLE IF EXISTS tenants_test;
ROLLBACK;

-- Test 3: Check if the error is in RLS policies
BEGIN;
CREATE TABLE test_table_3 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    name VARCHAR(100)
);

ALTER TABLE test_table_3 ENABLE ROW LEVEL SECURITY;

-- Try creating a policy that references tenant_id
CREATE POLICY "test_policy" ON test_table_3
    FOR SELECT
    USING (tenant_id IS NOT NULL);

-- If this works, try with a more complex policy
DROP POLICY IF EXISTS "test_policy" ON test_table_3;

CREATE POLICY "test_policy_complex" ON test_table_3
    FOR SELECT
    USING (
        test_table_3.tenant_id IN (
            SELECT id FROM tenants_test WHERE id IS NOT NULL
        )
    );

DROP TABLE IF EXISTS test_table_3;
ROLLBACK;

-- Test 4: The actual issue might be in the RLS policy syntax
-- Let's test if the column reference without table qualification works
BEGIN;
CREATE TABLE test_with_tenant (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id UUID
);

ALTER TABLE test_with_tenant ENABLE ROW LEVEL SECURITY;

-- This might fail if tenant_id is not qualified
CREATE POLICY "test_unqualified" ON test_with_tenant
    FOR SELECT
    USING (
        tenant_id IN (SELECT gen_random_uuid())  -- Unqualified tenant_id
    );

DROP TABLE IF EXISTS test_with_tenant;
ROLLBACK;

-- Final diagnosis
SELECT 
    'Run each test block separately to identify which one causes the error' as instruction,
    'The error location will tell us the exact problem' as diagnosis;
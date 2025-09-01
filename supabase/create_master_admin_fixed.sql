-- ShiftLink Master Admin Account Setup (Fixed Version)
-- Email: master@shiftlink.com
-- Password: Wkdrn123@@

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check and create enum types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
        CREATE TYPE shift_type AS ENUM ('day', 'evening', 'night');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'approved', 'rejected', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type') THEN
        CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'personal', 'maternity', 'paternity', 'other');
    END IF;
END$$;

-- Step 1: Create Auth User (Manual step required)
-- Go to Supabase Dashboard > Authentication > Users
-- Click "Add user" and enter:
-- Email: master@shiftlink.com
-- Password: Wkdrn123@@
-- Then get the user ID and continue with step 2

-- Step 2: Create or update master tenant
INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ShiftLink Master',
    'master',
    jsonb_build_object(
        'is_master', true,
        'features', jsonb_build_object(
            'all_access', true,
            'multi_tenant', true,
            'advanced_analytics', true
        )
    ),
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    settings = EXCLUDED.settings,
    updated_at = NOW();

-- Step 3: Create or update master site
INSERT INTO sites (id, tenant_id, name, address, timezone, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Master Site',
    'ShiftLink HQ',
    'Asia/Seoul',
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    updated_at = NOW();

-- Step 4: Create or update master team
INSERT INTO teams (id, site_id, name, description, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'System Administrators',
    'Master admin team with full system access',
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 5: Function to create or update master employee
CREATE OR REPLACE FUNCTION setup_master_employee(auth_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Delete any existing employee with same email but different ID
    DELETE FROM employees 
    WHERE email = 'master@shiftlink.com' 
    AND id != '00000000-0000-0000-0000-000000000004'::uuid;
    
    -- Insert or update master employee
    INSERT INTO employees (
        id,
        tenant_id,
        team_id,
        auth_user_id,
        email,
        name,
        employee_code,
        role,
        is_active,
        preferences,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000004'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000003'::uuid,
        auth_user_id,
        'master@shiftlink.com',
        'System Administrator',
        'MASTER001',
        'admin'::user_role,
        true,
        jsonb_build_object(
            'is_super_admin', true,
            'can_access_all_tenants', true,
            'can_modify_system_settings', true
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
        auth_user_id = EXCLUDED.auth_user_id,
        team_id = EXCLUDED.team_id,
        role = EXCLUDED.role,
        preferences = EXCLUDED.preferences,
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Master employee created/updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create helper functions for master admin detection
CREATE OR REPLACE FUNCTION is_master_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees 
        WHERE auth_user_id = check_user_id 
        AND email = 'master@shiftlink.com'
        AND role = 'admin'
        AND (preferences->>'is_super_admin')::boolean = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create or replace RLS policies for master admin access

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "master_admin_all_access_tenants" ON tenants;
DROP POLICY IF EXISTS "master_admin_all_access_sites" ON sites;
DROP POLICY IF EXISTS "master_admin_all_access_teams" ON teams;
DROP POLICY IF EXISTS "master_admin_all_access_employees" ON employees;

-- Create new policies for master admin
CREATE POLICY "master_admin_all_access_tenants" ON tenants
    FOR ALL
    USING (
        is_master_admin(auth.uid()) 
        OR id IN (SELECT tenant_id FROM employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "master_admin_all_access_sites" ON sites
    FOR ALL
    USING (
        is_master_admin(auth.uid()) 
        OR tenant_id IN (SELECT tenant_id FROM employees WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "master_admin_all_access_teams" ON teams
    FOR ALL
    USING (
        is_master_admin(auth.uid()) 
        OR site_id IN (
            SELECT s.id FROM sites s
            JOIN employees e ON e.tenant_id = s.tenant_id
            WHERE e.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "master_admin_all_access_employees" ON employees
    FOR ALL
    USING (
        is_master_admin(auth.uid()) 
        OR tenant_id IN (SELECT tenant_id FROM employees WHERE auth_user_id = auth.uid())
    );

-- Step 8: Verification query
CREATE OR REPLACE FUNCTION verify_master_setup()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check tenant
    RETURN QUERY
    SELECT 
        'Tenant'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM tenants WHERE slug = 'master') 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CASE WHEN EXISTS (SELECT 1 FROM tenants WHERE slug = 'master')
            THEN 'Master tenant exists'::TEXT
            ELSE 'Master tenant not found'::TEXT
        END;
    
    -- Check site
    RETURN QUERY
    SELECT 
        'Site'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM sites WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid) 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CASE WHEN EXISTS (SELECT 1 FROM sites WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
            THEN 'Master site exists'::TEXT
            ELSE 'Master site not found'::TEXT
        END;
    
    -- Check team
    RETURN QUERY
    SELECT 
        'Team'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM teams WHERE site_id = '00000000-0000-0000-0000-000000000002'::uuid) 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CASE WHEN EXISTS (SELECT 1 FROM teams WHERE site_id = '00000000-0000-0000-0000-000000000002'::uuid)
            THEN 'Admin team exists'::TEXT
            ELSE 'Admin team not found'::TEXT
        END;
    
    -- Check employee
    RETURN QUERY
    SELECT 
        'Employee'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM employees WHERE email = 'master@shiftlink.com') 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CASE WHEN EXISTS (SELECT 1 FROM employees WHERE email = 'master@shiftlink.com')
            THEN 'Master employee exists with ID: ' || 
                 COALESCE((SELECT auth_user_id::TEXT FROM employees WHERE email = 'master@shiftlink.com'), 'No auth ID')
            ELSE 'Master employee not found - run setup_master_employee() with auth user ID'::TEXT
        END;
END;
$$ LANGUAGE plpgsql;

-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Go to Authentication > Users and create user with email: master@shiftlink.com, password: Wkdrn123@@
-- 3. Copy the user ID from the created user
-- 4. Run: SELECT setup_master_employee('paste-user-id-here'::uuid);
-- 5. Run: SELECT * FROM verify_master_setup(); to verify everything is set up correctly

-- Quick verification:
SELECT * FROM verify_master_setup();
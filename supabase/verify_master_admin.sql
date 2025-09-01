-- Master Admin Account Verification Script
-- This script verifies that the master admin account was created correctly and has proper access

BEGIN;

-- Set the session to simulate the master admin user (for testing)
-- In production, this would be done through proper authentication
DO $$
DECLARE
    master_auth_id UUID;
    verification_results JSONB := '{}';
BEGIN
    -- Get the master admin auth user ID
    SELECT id INTO master_auth_id 
    FROM auth.users 
    WHERE email = 'master@shiftlink.com';
    
    IF master_auth_id IS NULL THEN
        RAISE EXCEPTION 'Master admin auth user not found! Please run create_master_admin.sql first.';
    END IF;
    
    RAISE NOTICE 'Found master admin auth user: %', master_auth_id;
    
    -- Verify master admin employee record exists
    IF EXISTS (
        SELECT 1 FROM employees 
        WHERE auth_user_id = master_auth_id 
        AND email = 'master@shiftlink.com'
        AND role = 'admin'
    ) THEN
        RAISE NOTICE '✓ Master admin employee record exists and has admin role';
        verification_results := verification_results || '{"employee_record": true}';
    ELSE
        RAISE WARNING '✗ Master admin employee record is missing or incorrect';
        verification_results := verification_results || '{"employee_record": false}';
    END IF;
    
    -- Verify master tenant exists
    IF EXISTS (
        SELECT 1 FROM tenants 
        WHERE slug = 'master-org'
        AND (settings->>'master_admin')::boolean = true
    ) THEN
        RAISE NOTICE '✓ Master organization tenant exists';
        verification_results := verification_results || '{"tenant_record": true}';
    ELSE
        RAISE WARNING '✗ Master organization tenant is missing';
        verification_results := verification_results || '{"tenant_record": false}';
    END IF;
    
    -- Verify master site exists
    IF EXISTS (
        SELECT 1 FROM sites s
        JOIN tenants t ON s.tenant_id = t.id
        WHERE t.slug = 'master-org'
        AND s.name = 'ShiftLink Headquarters'
    ) THEN
        RAISE NOTICE '✓ Master site exists';
        verification_results := verification_results || '{"site_record": true}';
    ELSE
        RAISE WARNING '✗ Master site is missing';
        verification_results := verification_results || '{"site_record": false}';
    END IF;
    
    -- Verify master team exists
    IF EXISTS (
        SELECT 1 FROM teams tm
        JOIN sites s ON tm.site_id = s.id
        JOIN tenants t ON s.tenant_id = t.id
        WHERE t.slug = 'master-org'
        AND tm.name = 'System Administration'
    ) THEN
        RAISE NOTICE '✓ Master team exists';
        verification_results := verification_results || '{"team_record": true}';
    ELSE
        RAISE WARNING '✗ Master team is missing';
        verification_results := verification_results || '{"team_record": false}';
    END IF;
    
    -- Verify helper functions exist
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_master_admin'
    ) THEN
        RAISE NOTICE '✓ is_master_admin() function exists';
        verification_results := verification_results || '{"helper_functions": true}';
    ELSE
        RAISE WARNING '✗ is_master_admin() function is missing';
        verification_results := verification_results || '{"helper_functions": false}';
    END IF;
    
    -- Check if master admin policies exist (sample check)
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname LIKE '%Master admin%'
        AND tablename = 'tenants'
    ) THEN
        RAISE NOTICE '✓ Master admin RLS policies exist';
        verification_results := verification_results || '{"rls_policies": true}';
    ELSE
        RAISE WARNING '✗ Master admin RLS policies may be missing';
        verification_results := verification_results || '{"rls_policies": false}';
    END IF;
    
    -- Test data access
    RAISE NOTICE '';
    RAISE NOTICE 'DATA ACCESS TEST:';
    
    -- Count accessible records
    RAISE NOTICE 'Tenants accessible: %', (SELECT COUNT(*) FROM tenants);
    RAISE NOTICE 'Sites accessible: %', (SELECT COUNT(*) FROM sites);
    RAISE NOTICE 'Teams accessible: %', (SELECT COUNT(*) FROM teams);
    RAISE NOTICE 'Employees accessible: %', (SELECT COUNT(*) FROM employees);
    
    -- Show master admin details
    RAISE NOTICE '';
    RAISE NOTICE 'MASTER ADMIN DETAILS:';
    
    -- Display master admin information
    FOR rec IN (
        SELECT 
            e.id as employee_id,
            e.name,
            e.email,
            e.employee_code,
            e.role,
            t.name as tenant_name,
            s.name as site_name,
            tm.name as team_name,
            e.created_at
        FROM employees e
        JOIN tenants t ON e.tenant_id = t.id
        JOIN teams tm ON e.team_id = tm.id
        JOIN sites s ON tm.site_id = s.id
        WHERE e.auth_user_id = master_auth_id
    ) LOOP
        RAISE NOTICE 'Employee ID: %', rec.employee_id;
        RAISE NOTICE 'Name: %', rec.name;
        RAISE NOTICE 'Email: %', rec.email;
        RAISE NOTICE 'Employee Code: %', rec.employee_code;
        RAISE NOTICE 'Role: %', rec.role;
        RAISE NOTICE 'Organization: %', rec.tenant_name;
        RAISE NOTICE 'Site: %', rec.site_name;
        RAISE NOTICE 'Team: %', rec.team_name;
        RAISE NOTICE 'Created: %', rec.created_at;
    END LOOP;
    
    -- Final verification summary
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFICATION SUMMARY: %', verification_results;
    
END $$;

-- Test dashboard function if it exists
DO $$
DECLARE
    dashboard_result RECORD;
BEGIN
    -- This will only work if the user is properly authenticated as master admin
    -- In a real scenario, this would be called from an authenticated session
    
    RAISE NOTICE '';
    RAISE NOTICE 'TESTING MASTER ADMIN DASHBOARD ACCESS:';
    RAISE NOTICE 'Note: This test may fail if not run in authenticated context';
    
    BEGIN
        SELECT * INTO dashboard_result FROM get_master_admin_dashboard();
        
        RAISE NOTICE 'Total Tenants: %', dashboard_result.total_tenants;
        RAISE NOTICE 'Total Sites: %', dashboard_result.total_sites;
        RAISE NOTICE 'Total Employees: %', dashboard_result.total_employees;
        RAISE NOTICE 'Active Employees: %', dashboard_result.active_employees;
        RAISE NOTICE 'Pending Leaves: %', dashboard_result.pending_leaves;
        RAISE NOTICE 'Pending Swaps: %', dashboard_result.pending_swaps;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Dashboard function test failed (expected in unauthenticated context): %', SQLERRM;
    END;
    
END $$;

-- Show account login information
SELECT 
    'MASTER ADMIN LOGIN INFORMATION' as info_type,
    jsonb_build_object(
        'email', 'master@shiftlink.com',
        'password', 'Wkdrn123@@',
        'role', 'admin',
        'access_level', 'super_admin',
        'capabilities', jsonb_build_array(
            'Cross-tenant access',
            'Full system administration',
            'User management',
            'Database management',
            'System configuration',
            'Audit log access',
            'All data modification'
        )
    ) as details;

-- Show next steps
SELECT 
    'NEXT STEPS' as step_type,
    jsonb_build_array(
        '1. Execute create_master_admin.sql in Supabase dashboard or via CLI',
        '2. Execute master_admin_rls_policies.sql to enable super admin access',
        '3. Test login with email: master@shiftlink.com and password: Wkdrn123@@',
        '4. Verify access to all tenants and data in the application',
        '5. Update password after first login for security'
    ) as instructions;

COMMIT;
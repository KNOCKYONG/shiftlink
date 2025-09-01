-- Master Admin Account Creation Script
-- This script creates a master admin account with full system privileges
-- Email: master@shiftlink.com
-- Password: Wkdrn123@@

BEGIN;

-- First, we need to insert the user into auth.users table
-- Note: In production, you should use Supabase Auth API or supabase auth admin create-user command
-- This is a direct database approach for development/setup purposes

-- Insert into auth.users table (this simulates creating an auth user)
-- You'll need to execute this through Supabase Dashboard or CLI as it requires admin access
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  gen_random_uuid(), -- This will be our auth_user_id
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'master@shiftlink.com',
  crypt('Wkdrn123@@', gen_salt('bf')), -- This encrypts the password
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Master Admin", "full_name": "Master Admin"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
) ON CONFLICT (email) DO NOTHING;

-- Get the auth user ID for the master admin
DO $$
DECLARE 
    master_auth_id UUID;
    master_tenant_id UUID;
    master_site_id UUID;
    master_team_id UUID;
    master_employee_id UUID;
BEGIN
    -- Get the auth user ID
    SELECT id INTO master_auth_id 
    FROM auth.users 
    WHERE email = 'master@shiftlink.com';
    
    IF master_auth_id IS NULL THEN
        RAISE EXCEPTION 'Master admin auth user not found. Please create the auth user first.';
    END IF;

    -- Create the master tenant (organization)
    INSERT INTO tenants (id, name, slug, settings)
    VALUES (
        gen_random_uuid(),
        'ShiftLink Master Organization',
        'master-org',
        '{
            "timezone": "Asia/Seoul",
            "currency": "KRW",
            "language": "ko",
            "features": {
                "advanced_scheduling": true,
                "analytics": true,
                "integrations": true,
                "multi_site": true,
                "api_access": true,
                "custom_roles": true
            },
            "master_admin": true
        }'
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        settings = EXCLUDED.settings,
        updated_at = NOW()
    RETURNING id INTO master_tenant_id;

    -- Create the master site
    INSERT INTO sites (id, tenant_id, name, address, timezone)
    VALUES (
        gen_random_uuid(),
        master_tenant_id,
        'ShiftLink Headquarters',
        'Seoul, South Korea',
        'Asia/Seoul'
    )
    RETURNING id INTO master_site_id;

    -- Create the master team
    INSERT INTO teams (id, site_id, name, description)
    VALUES (
        gen_random_uuid(),
        master_site_id,
        'System Administration',
        'Master administration team with full system access'
    )
    RETURNING id INTO master_team_id;

    -- Create the master admin employee record
    INSERT INTO employees (
        id,
        tenant_id,
        team_id,
        auth_user_id,
        email,
        name,
        employee_code,
        role,
        phone,
        hire_date,
        skills,
        preferences,
        is_active
    )
    VALUES (
        gen_random_uuid(),
        master_tenant_id,
        master_team_id,
        master_auth_id,
        'master@shiftlink.com',
        'Master Admin',
        'MASTER001',
        'admin',
        '+82-10-0000-0000',
        CURRENT_DATE,
        '["system_administration", "database_management", "user_management", "reporting", "scheduling"]',
        '{
            "notifications": {
                "email": true,
                "push": true,
                "sms": false
            },
            "dashboard": {
                "default_view": "admin_overview",
                "show_all_tenants": true
            },
            "access_level": "super_admin"
        }',
        true
    )
    ON CONFLICT (tenant_id, email) DO UPDATE SET
        name = EXCLUDED.name,
        employee_code = EXCLUDED.employee_code,
        role = EXCLUDED.role,
        team_id = EXCLUDED.team_id,
        auth_user_id = EXCLUDED.auth_user_id,
        skills = EXCLUDED.skills,
        preferences = EXCLUDED.preferences,
        updated_at = NOW()
    RETURNING id INTO master_employee_id;

    -- Create a default ruleset for the master organization
    INSERT INTO rulesets (tenant_id, name, rules, is_default)
    VALUES (
        master_tenant_id,
        'Master Organization Default Rules',
        '{
            "min_rest_hours": {"enabled": true, "value": 11},
            "max_week_hours": {"enabled": true, "value": 52},
            "max_consec_nights": {"enabled": true, "value": 3},
            "fairness": {"enabled": true, "target_score": 0.8},
            "preferences": {"enabled": true},
            "public_holidays": {"enabled": true, "source": "KR"},
            "overtime": {"enabled": true, "max_daily": 4, "max_weekly": 12},
            "master_overrides": {"enabled": true}
        }',
        true
    );

    -- Create some basic shift templates
    INSERT INTO shift_templates (tenant_id, name, type, start_time, end_time, duration_hours, break_minutes, color)
    VALUES 
        (master_tenant_id, 'Day Shift', 'day', '09:00:00', '18:00:00', 8.0, 60, '#2D7FF9'),
        (master_tenant_id, 'Evening Shift', 'evening', '14:00:00', '23:00:00', 8.0, 60, '#F59E0B'),
        (master_tenant_id, 'Night Shift', 'night', '22:00:00', '07:00:00', 8.0, 60, '#7C3AED');

    -- Log the creation in audit logs
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values,
        created_at
    )
    VALUES (
        master_tenant_id,
        master_employee_id,
        'CREATE_MASTER_ADMIN',
        'employee',
        master_employee_id,
        jsonb_build_object(
            'email', 'master@shiftlink.com',
            'role', 'admin',
            'type', 'master_admin_creation',
            'tenant_id', master_tenant_id,
            'created_by', 'system_initialization'
        ),
        NOW()
    );

    RAISE NOTICE 'Master admin account created successfully!';
    RAISE NOTICE 'Auth User ID: %', master_auth_id;
    RAISE NOTICE 'Tenant ID: %', master_tenant_id;
    RAISE NOTICE 'Employee ID: %', master_employee_id;
    
END $$;

COMMIT;
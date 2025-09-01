-- Enhanced RLS Policies for Master Admin Super User Access
-- This script adds special policies to allow the master admin to access all tenants and data

BEGIN;

-- Create helper function to check if user is master admin
CREATE OR REPLACE FUNCTION is_master_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND email = 'master@shiftlink.com'
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create helper function to check if user has master admin privileges
CREATE OR REPLACE FUNCTION has_master_admin_privileges()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e
    JOIN tenants t ON e.tenant_id = t.id
    WHERE e.auth_user_id = auth.uid()
    AND e.role = 'admin'
    AND (
      e.email = 'master@shiftlink.com'
      OR (t.settings->>'master_admin')::boolean = true
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Enhanced Tenants policies (Master admin can see all tenants)
DROP POLICY IF EXISTS "Master admin can view all tenants" ON tenants;
CREATE POLICY "Master admin can view all tenants" ON tenants
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all tenants" ON tenants;
CREATE POLICY "Master admin can manage all tenants" ON tenants
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Sites policies (Master admin can see all sites)
DROP POLICY IF EXISTS "Master admin can view all sites" ON sites;
CREATE POLICY "Master admin can view all sites" ON sites
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all sites" ON sites;
CREATE POLICY "Master admin can manage all sites" ON sites
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Teams policies (Master admin can see all teams)
DROP POLICY IF EXISTS "Master admin can view all teams" ON teams;
CREATE POLICY "Master admin can view all teams" ON teams
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all teams" ON teams;
CREATE POLICY "Master admin can manage all teams" ON teams
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Employees policies (Master admin can see all employees)
DROP POLICY IF EXISTS "Master admin can view all employees" ON employees;
CREATE POLICY "Master admin can view all employees" ON employees
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all employees" ON employees;
CREATE POLICY "Master admin can manage all employees" ON employees
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Schedules policies (Master admin can see all schedules)
DROP POLICY IF EXISTS "Master admin can view all schedules" ON schedules;
CREATE POLICY "Master admin can view all schedules" ON schedules
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all schedules" ON schedules;
CREATE POLICY "Master admin can manage all schedules" ON schedules
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Schedule Assignments policies (Master admin can see all assignments)
DROP POLICY IF EXISTS "Master admin can view all assignments" ON schedule_assignments;
CREATE POLICY "Master admin can view all assignments" ON schedule_assignments
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all assignments" ON schedule_assignments;
CREATE POLICY "Master admin can manage all assignments" ON schedule_assignments
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Leaves policies (Master admin can see all leave requests)
DROP POLICY IF EXISTS "Master admin can view all leaves" ON leaves;
CREATE POLICY "Master admin can view all leaves" ON leaves
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all leaves" ON leaves;
CREATE POLICY "Master admin can manage all leaves" ON leaves
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Swap Requests policies (Master admin can see all swap requests)
DROP POLICY IF EXISTS "Master admin can view all swap requests" ON swap_requests;
CREATE POLICY "Master admin can view all swap requests" ON swap_requests
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all swap requests" ON swap_requests;
CREATE POLICY "Master admin can manage all swap requests" ON swap_requests
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Notifications policies (Master admin can see all notifications)
DROP POLICY IF EXISTS "Master admin can view all notifications" ON notifications;
CREATE POLICY "Master admin can view all notifications" ON notifications
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all notifications" ON notifications;
CREATE POLICY "Master admin can manage all notifications" ON notifications
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Audit Logs policies (Master admin can see all audit logs)
DROP POLICY IF EXISTS "Master admin can view all audit logs" ON audit_logs;
CREATE POLICY "Master admin can view all audit logs" ON audit_logs
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can create audit logs" ON audit_logs;
CREATE POLICY "Master admin can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    is_master_admin()
  );

-- Enhanced Rulesets policies (Master admin can see all rulesets)
DROP POLICY IF EXISTS "Master admin can view all rulesets" ON rulesets;
CREATE POLICY "Master admin can view all rulesets" ON rulesets
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all rulesets" ON rulesets;
CREATE POLICY "Master admin can manage all rulesets" ON rulesets
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Shift Templates policies (Master admin can see all shift templates)
DROP POLICY IF EXISTS "Master admin can view all shift templates" ON shift_templates;
CREATE POLICY "Master admin can view all shift templates" ON shift_templates
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all shift templates" ON shift_templates;
CREATE POLICY "Master admin can manage all shift templates" ON shift_templates
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Patterns policies (Master admin can see all patterns)
DROP POLICY IF EXISTS "Master admin can view all patterns" ON patterns;
CREATE POLICY "Master admin can view all patterns" ON patterns
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all patterns" ON patterns;
CREATE POLICY "Master admin can manage all patterns" ON patterns
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Integrations policies (Master admin can see all integrations)
DROP POLICY IF EXISTS "Master admin can view all integrations" ON integrations;
CREATE POLICY "Master admin can view all integrations" ON integrations
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all integrations" ON integrations;
CREATE POLICY "Master admin can manage all integrations" ON integrations
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Absences policies (Master admin can see all absences)
DROP POLICY IF EXISTS "Master admin can view all absences" ON absences;
CREATE POLICY "Master admin can view all absences" ON absences
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all absences" ON absences;
CREATE POLICY "Master admin can manage all absences" ON absences
  FOR ALL USING (
    is_master_admin()
  );

-- Enhanced Training policies (Master admin can see all training sessions)
DROP POLICY IF EXISTS "Master admin can view all trainings" ON trainings;
CREATE POLICY "Master admin can view all trainings" ON trainings
  FOR SELECT USING (
    is_master_admin()
  );

DROP POLICY IF EXISTS "Master admin can manage all trainings" ON trainings;
CREATE POLICY "Master admin can manage all trainings" ON trainings
  FOR ALL USING (
    is_master_admin()
  );

-- Add policies for extended tables if they exist
DO $$
BEGIN
  -- Employee preferences
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_preferences') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all employee preferences" ON employee_preferences';
    EXECUTE 'CREATE POLICY "Master admin can view all employee preferences" ON employee_preferences
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all employee preferences" ON employee_preferences';
    EXECUTE 'CREATE POLICY "Master admin can manage all employee preferences" ON employee_preferences
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Organization hierarchy
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organization_hierarchy') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all organization hierarchy" ON organization_hierarchy';
    EXECUTE 'CREATE POLICY "Master admin can view all organization hierarchy" ON organization_hierarchy
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all organization hierarchy" ON organization_hierarchy';
    EXECUTE 'CREATE POLICY "Master admin can manage all organization hierarchy" ON organization_hierarchy
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Default requests
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'default_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all default requests" ON default_requests';
    EXECUTE 'CREATE POLICY "Master admin can view all default requests" ON default_requests
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all default requests" ON default_requests';
    EXECUTE 'CREATE POLICY "Master admin can manage all default requests" ON default_requests
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Schedule metrics
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedule_metrics') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all schedule metrics" ON schedule_metrics';
    EXECUTE 'CREATE POLICY "Master admin can view all schedule metrics" ON schedule_metrics
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all schedule metrics" ON schedule_metrics';
    EXECUTE 'CREATE POLICY "Master admin can manage all schedule metrics" ON schedule_metrics
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Schedule versions
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedule_versions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all schedule versions" ON schedule_versions';
    EXECUTE 'CREATE POLICY "Master admin can view all schedule versions" ON schedule_versions
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all schedule versions" ON schedule_versions';
    EXECUTE 'CREATE POLICY "Master admin can manage all schedule versions" ON schedule_versions
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Schedule change logs
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedule_change_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all schedule change logs" ON schedule_change_logs';
    EXECUTE 'CREATE POLICY "Master admin can view all schedule change logs" ON schedule_change_logs
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all schedule change logs" ON schedule_change_logs';
    EXECUTE 'CREATE POLICY "Master admin can manage all schedule change logs" ON schedule_change_logs
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Schedule shares
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedule_shares') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all schedule shares" ON schedule_shares';
    EXECUTE 'CREATE POLICY "Master admin can view all schedule shares" ON schedule_shares
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all schedule shares" ON schedule_shares';
    EXECUTE 'CREATE POLICY "Master admin can manage all schedule shares" ON schedule_shares
      FOR ALL USING (is_master_admin())';
  END IF;

  -- Schedule generation requests
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedule_generation_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can view all schedule generation requests" ON schedule_generation_requests';
    EXECUTE 'CREATE POLICY "Master admin can view all schedule generation requests" ON schedule_generation_requests
      FOR SELECT USING (is_master_admin())';
    
    EXECUTE 'DROP POLICY IF EXISTS "Master admin can manage all schedule generation requests" ON schedule_generation_requests';
    EXECUTE 'CREATE POLICY "Master admin can manage all schedule generation requests" ON schedule_generation_requests
      FOR ALL USING (is_master_admin())';
  END IF;

END $$;

-- Create a master admin dashboard view function
CREATE OR REPLACE FUNCTION get_master_admin_dashboard()
RETURNS TABLE(
  total_tenants BIGINT,
  total_sites BIGINT,
  total_employees BIGINT,
  total_schedules BIGINT,
  active_employees BIGINT,
  pending_leaves BIGINT,
  pending_swaps BIGINT,
  recent_activities JSONB
) AS $$
BEGIN
  -- Only allow master admin to call this function
  IF NOT is_master_admin() THEN
    RAISE EXCEPTION 'Access denied. Master admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM tenants)::BIGINT as total_tenants,
    (SELECT COUNT(*) FROM sites)::BIGINT as total_sites,
    (SELECT COUNT(*) FROM employees)::BIGINT as total_employees,
    (SELECT COUNT(*) FROM schedules)::BIGINT as total_schedules,
    (SELECT COUNT(*) FROM employees WHERE is_active = true)::BIGINT as active_employees,
    (SELECT COUNT(*) FROM leaves WHERE status = 'pending')::BIGINT as pending_leaves,
    (SELECT COUNT(*) FROM swap_requests WHERE status = 'pending')::BIGINT as pending_swaps,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'action', action,
          'entity_type', entity_type,
          'created_at', created_at,
          'user_id', user_id
        ) ORDER BY created_at DESC
      )
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      LIMIT 50
    ) as recent_activities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Success message
SELECT 'Master Admin RLS policies have been successfully created!' as status;
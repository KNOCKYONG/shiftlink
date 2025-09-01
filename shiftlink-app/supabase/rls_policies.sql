-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's employee record
CREATE OR REPLACE FUNCTION get_current_employee()
RETURNS employees AS $$
  SELECT * FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (
    id = get_user_tenant_id()
  );

CREATE POLICY "Users can create tenants during signup" ON tenants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can manage tenants" ON tenants
  FOR ALL USING (
    is_admin()
  );

-- Sites policies
CREATE POLICY "Users can view sites in their tenant" ON sites
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Users can create sites during signup" ON sites
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can manage sites" ON sites
  FOR ALL USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

-- Teams policies
CREATE POLICY "Users can view teams in their tenant" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = teams.site_id
      AND sites.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "Users can create teams during signup" ON teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Managers can manage teams" ON teams
  FOR ALL USING (
    is_manager_or_admin() AND
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = teams.site_id
      AND sites.tenant_id = get_user_tenant_id()
    )
  );

-- Employees policies
CREATE POLICY "Users can view employees in their tenant" ON employees
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Users can create employee records during signup" ON employees
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON employees
  FOR UPDATE USING (
    auth_user_id = auth.uid()
  ) WITH CHECK (
    auth_user_id = auth.uid()
  );

CREATE POLICY "Managers can manage employees" ON employees
  FOR ALL USING (
    is_manager_or_admin() AND tenant_id = get_user_tenant_id()
  );

-- Rulesets policies
CREATE POLICY "Users can view rulesets in their tenant" ON rulesets
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Admins can manage rulesets" ON rulesets
  FOR ALL USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

-- Shift Templates policies
CREATE POLICY "Users can view shift templates in their tenant" ON shift_templates
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Managers can manage shift templates" ON shift_templates
  FOR ALL USING (
    is_manager_or_admin() AND tenant_id = get_user_tenant_id()
  );

-- Patterns policies
CREATE POLICY "Users can view patterns in their tenant" ON patterns
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Managers can manage patterns" ON patterns
  FOR ALL USING (
    is_manager_or_admin() AND tenant_id = get_user_tenant_id()
  );

-- Schedules policies
CREATE POLICY "Users can view schedules in their tenant" ON schedules
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Managers can manage schedules" ON schedules
  FOR ALL USING (
    is_manager_or_admin() AND tenant_id = get_user_tenant_id()
  );

-- Schedule Assignments policies
CREATE POLICY "Users can view their own assignments" ON schedule_assignments
  FOR SELECT USING (
    employee_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

CREATE POLICY "Managers can manage assignments" ON schedule_assignments
  FOR ALL USING (
    is_manager_or_admin()
  );

-- Leaves policies
CREATE POLICY "Users can view their own leaves" ON leaves
  FOR SELECT USING (
    employee_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

CREATE POLICY "Users can create their own leave requests" ON leaves
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM get_current_employee())
  );

CREATE POLICY "Managers can manage leaves" ON leaves
  FOR ALL USING (
    is_manager_or_admin()
  );

-- Absences policies
CREATE POLICY "Users can view absences" ON absences
  FOR SELECT USING (
    employee_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

CREATE POLICY "Managers can manage absences" ON absences
  FOR ALL USING (
    is_manager_or_admin()
  );

-- Trainings policies
CREATE POLICY "Users can view their own trainings" ON trainings
  FOR SELECT USING (
    employee_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

CREATE POLICY "Managers can manage trainings" ON trainings
  FOR ALL USING (
    is_manager_or_admin()
  );

-- Swap Requests policies
CREATE POLICY "Users can view swap requests they're involved in" ON swap_requests
  FOR SELECT USING (
    requester_id = (SELECT id FROM get_current_employee())
    OR target_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

CREATE POLICY "Users can create swap requests" ON swap_requests
  FOR INSERT WITH CHECK (
    requester_id = (SELECT id FROM get_current_employee())
  );

CREATE POLICY "Users can update swap requests they're involved in" ON swap_requests
  FOR UPDATE USING (
    target_id = (SELECT id FROM get_current_employee())
    OR is_manager_or_admin()
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    recipient_id = (SELECT id FROM get_current_employee())
  );

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    recipient_id = (SELECT id FROM get_current_employee())
  );

-- Integrations policies
CREATE POLICY "Admins can view integrations" ON integrations
  FOR SELECT USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Admins can manage integrations" ON integrations
  FOR ALL USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

-- Audit Logs policies
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );
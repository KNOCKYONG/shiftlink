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
ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_metrics ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Admins can manage tenants" ON tenants
  FOR ALL USING (
    is_admin()
  );

-- Sites policies
CREATE POLICY "Users can view sites in their tenant" ON sites
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
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

CREATE POLICY "Users can update their own profile" ON employees
  FOR UPDATE USING (
    auth_user_id = auth.uid()
  );

CREATE POLICY "Managers can manage employees" ON employees
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

-- Schedule assignments policies
CREATE POLICY "Users can view their assignments" ON schedule_assignments
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_assignments.schedule_id
      AND schedules.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "Managers can manage assignments" ON schedule_assignments
  FOR ALL USING (
    is_manager_or_admin()
  );

-- Leaves policies
CREATE POLICY "Users can view their own leaves" ON leaves
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can request leaves" ON leaves
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage leaves" ON leaves
  FOR ALL USING (
    is_manager_or_admin() AND
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_user_tenant_id()
    )
  );

-- Swap requests policies
CREATE POLICY "Users can view swap requests involving them" ON swap_requests
  FOR SELECT USING (
    requester_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    ) OR
    target_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create swap requests" ON swap_requests
  FOR INSERT WITH CHECK (
    requester_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their swap requests" ON swap_requests
  FOR UPDATE USING (
    target_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    ) OR
    is_manager_or_admin()
  );

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (
    recipient_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (
    recipient_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    );

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Audit logs policies (admins only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

-- Extended tables policies

-- Employee preferences policies
CREATE POLICY "Users can view and manage their preferences" ON employee_preferences
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all preferences" ON employee_preferences
  FOR SELECT USING (
    is_manager_or_admin() AND
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_user_tenant_id()
    )
  );

-- Organization hierarchy policies
CREATE POLICY "Users can view organization hierarchy" ON organization_hierarchy
  FOR SELECT USING (
    tenant_id = get_user_tenant_id()
  );

CREATE POLICY "Admins can manage organization hierarchy" ON organization_hierarchy
  FOR ALL USING (
    is_admin() AND tenant_id = get_user_tenant_id()
  );

-- Default requests policies
CREATE POLICY "Users can manage their default requests" ON default_requests
  FOR ALL USING (
    employee_id IN (
      SELECT id FROM employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all default requests" ON default_requests
  FOR SELECT USING (
    is_manager_or_admin() AND
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_user_tenant_id()
    )
  );

-- Schedule metrics policies
CREATE POLICY "Users can view schedule metrics" ON schedule_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_metrics.schedule_id
      AND schedules.tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "Managers can manage schedule metrics" ON schedule_metrics
  FOR ALL USING (
    is_manager_or_admin()
  );
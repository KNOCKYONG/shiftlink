-- ShiftLink Database Schema - Complete Deployment Script
-- This script creates all tables, indexes, triggers, and RLS policies for ShiftLink
-- Execute this in Supabase SQL Editor (Dashboard > SQL Editor)

-- =====================================================
-- PART 1: INITIAL SCHEMA SETUP
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types if they exist (for re-runs)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE shift_type AS ENUM ('day', 'evening', 'night');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'approved', 'rejected', 'cancelled');
CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'personal', 'maternity', 'paternity', 'other');

-- Tenants (Companies)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites (Business locations)
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  timezone VARCHAR(100) DEFAULT 'Asia/Seoul',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  employee_code VARCHAR(100),
  role user_role DEFAULT 'employee',
  phone VARCHAR(50),
  hire_date DATE,
  skills JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Rulesets (Configurable constraints)
CREATE TABLE IF NOT EXISTS rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rules JSONB NOT NULL DEFAULT '{
    "min_rest_hours": {"enabled": true, "value": 11},
    "max_week_hours": {"enabled": true, "value": 52},
    "max_consec_nights": {"enabled": true, "value": 3},
    "fairness": {"enabled": true, "target_score": 0.7},
    "preferences": {"enabled": true},
    "public_holidays": {"enabled": true, "source": "KR"}
  }',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Templates
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type shift_type NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(3,1),
  break_minutes INTEGER DEFAULT 60,
  color VARCHAR(7) DEFAULT '#2D7FF9',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Patterns
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pattern JSONB NOT NULL,
  cycle_days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  ruleset_id UUID REFERENCES rulesets(id),
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule Assignments
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_template_id UUID REFERENCES shift_templates(id),
  date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_overtime BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date, schedule_id)
);

-- Leaves
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status request_status DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Absences
CREATE TABLE IF NOT EXISTS absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  is_notified BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Sessions
CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swap Requests
CREATE TABLE IF NOT EXISTS swap_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requester_assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  target_assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
  reason TEXT,
  status request_status DEFAULT 'pending',
  target_accepted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES employees(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 2: EXTENDED SCHEMA (V2)
-- =====================================================

-- Schedule versions
CREATE TABLE IF NOT EXISTS schedule_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES employees(id),
    change_type VARCHAR(50),
    change_description TEXT,
    snapshot JSONB NOT NULL,
    affected_employees UUID[],
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    UNIQUE(schedule_id, version_number)
);

-- Schedule change logs
CREATE TABLE IF NOT EXISTS schedule_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES schedule_versions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    old_shift VARCHAR(20),
    new_shift VARCHAR(20),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule shares
CREATE TABLE IF NOT EXISTS schedule_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_id UUID REFERENCES schedule_versions(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES employees(id),
    share_method VARCHAR(20),
    recipients JSONB,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    share_status VARCHAR(20) DEFAULT 'pending'
);

-- Schedule generation requests
CREATE TABLE IF NOT EXISTS schedule_generation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parameters JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    requested_by UUID REFERENCES employees(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    result_schedule_id UUID REFERENCES schedules(id),
    error_message TEXT
);

-- Employee preferences
CREATE TABLE IF NOT EXISTS employee_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    preference_pattern JSONB,
    pattern_start_date DATE,
    priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, effective_from)
);

-- Organization hierarchy
CREATE TABLE IF NOT EXISTS organization_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    min_required INTEGER DEFAULT 1,
    priority_on_conflict VARCHAR(20) DEFAULT 'balanced',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, level)
);

-- Employee hierarchy mapping
CREATE TABLE IF NOT EXISTS employee_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    hierarchy_id UUID REFERENCES organization_hierarchy(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id)
);

-- Default requests
CREATE TABLE IF NOT EXISTS default_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL,
    day_of_week INTEGER,
    specific_date DATE,
    date_from DATE,
    date_to DATE,
    shift_type VARCHAR(20),
    reason TEXT,
    priority INTEGER DEFAULT 50,
    is_recurring BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (request_type = 'fixed_shift' AND day_of_week IS NOT NULL) OR
        (request_type = 'leave' AND specific_date IS NOT NULL) OR
        (request_type = 'constraint')
    )
);

-- Schedule metrics
CREATE TABLE IF NOT EXISTS schedule_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    version_id UUID REFERENCES schedule_versions(id),
    fairness_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    preference_match_score DECIMAL(5,2),
    hierarchy_coverage_score DECIMAL(5,2),
    total_conflicts INTEGER DEFAULT 0,
    total_warnings INTEGER DEFAULT 0,
    metrics_detail JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 3: INDEXES
-- =====================================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_employees_tenant_team ON employees(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_employee_date ON schedule_assignments(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_target ON swap_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_employee_dates ON leaves(employee_id, start_date, end_date);

-- Extended indexes
CREATE INDEX IF NOT EXISTS idx_schedule_versions_schedule_id ON schedule_versions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_versions_created_at ON schedule_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_schedule_change_logs_version_id ON schedule_change_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_schedule_shares_version_id ON schedule_shares(version_id);
CREATE INDEX IF NOT EXISTS idx_employee_preferences_employee_id ON employee_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_default_requests_employee_id ON default_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_metrics_schedule_id ON schedule_metrics(schedule_id);

-- =====================================================
-- PART 4: TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rulesets_updated_at ON rulesets;
CREATE TRIGGER update_rulesets_updated_at BEFORE UPDATE ON rulesets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shift_templates_updated_at ON shift_templates;
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patterns_updated_at ON patterns;
CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_assignments_updated_at ON schedule_assignments;
CREATE TRIGGER update_schedule_assignments_updated_at BEFORE UPDATE ON schedule_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leaves_updated_at ON leaves;
CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_absences_updated_at ON absences;
CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON absences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainings_updated_at ON trainings;
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_swap_requests_updated_at ON swap_requests;
CREATE TRIGGER update_swap_requests_updated_at BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Version number auto-increment function
CREATE OR REPLACE FUNCTION increment_version_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version_number := COALESCE(
        (SELECT MAX(version_number) FROM schedule_versions WHERE schedule_id = NEW.schedule_id),
        0
    ) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_version_number ON schedule_versions;
CREATE TRIGGER set_version_number
    BEFORE INSERT ON schedule_versions
    FOR EACH ROW
    EXECUTE FUNCTION increment_version_number();

-- Updated_at for extended tables
DROP TRIGGER IF EXISTS update_employee_preferences_updated_at ON employee_preferences;
CREATE TRIGGER update_employee_preferences_updated_at
    BEFORE UPDATE ON employee_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

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

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION get_current_employee()
RETURNS employees AS $$
  SELECT * FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'manager')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS Policies (simplified for initial deployment)
-- Note: You can add more granular policies later

-- Tenants
CREATE POLICY "tenant_select" ON tenants FOR SELECT USING (id = get_user_tenant_id());
CREATE POLICY "tenant_admin" ON tenants FOR ALL USING (is_admin());

-- Sites
CREATE POLICY "site_select" ON sites FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "site_admin" ON sites FOR ALL USING (is_admin() AND tenant_id = get_user_tenant_id());

-- Teams
CREATE POLICY "team_select" ON teams FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = teams.site_id
      AND sites.tenant_id = get_user_tenant_id()
    )
);
CREATE POLICY "team_manager" ON teams FOR ALL USING (
    is_manager_or_admin() AND
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = teams.site_id
      AND sites.tenant_id = get_user_tenant_id()
    )
);

-- Employees
CREATE POLICY "employee_select" ON employees FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "employee_self_update" ON employees FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "employee_manager" ON employees FOR ALL USING (is_manager_or_admin() AND tenant_id = get_user_tenant_id());

-- Schedules
CREATE POLICY "schedule_select" ON schedules FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "schedule_manager" ON schedules FOR ALL USING (is_manager_or_admin() AND tenant_id = get_user_tenant_id());

-- Add more policies as needed...

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- Verify deployment
SELECT 'ShiftLink database schema deployed successfully!' as message;
-- ==============================================
-- Settings Management Schema for ShiftLink
-- ==============================================
-- Purpose: Manage tenant-specific settings, constraints, and defaults
-- Phase 10: Settings Management Implementation
-- ==============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS tenant_settings CASCADE;
DROP TABLE IF EXISTS constraint_settings CASCADE;
DROP TABLE IF EXISTS schedule_rules CASCADE;
DROP TABLE IF EXISTS simulation_configs CASCADE;
DROP TABLE IF EXISTS setting_presets CASCADE;
DROP TABLE IF EXISTS setting_history CASCADE;

-- ==============================================
-- 1. TENANT SETTINGS (Main Settings Table)
-- ==============================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- General Settings
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  week_starts_on INTEGER DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday
  fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  default_language VARCHAR(10) DEFAULT 'ko',
  date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) DEFAULT '24h',
  
  -- Working Hours Settings
  default_shift_duration INTEGER DEFAULT 8, -- hours
  break_time_minutes INTEGER DEFAULT 60,
  minimum_rest_hours INTEGER DEFAULT 11,
  maximum_weekly_hours INTEGER DEFAULT 52,
  maximum_monthly_hours INTEGER DEFAULT 200,
  
  -- Shift Settings
  shift_patterns JSONB DEFAULT '{"day": {"start": "06:00", "end": "14:00"}, "evening": {"start": "14:00", "end": "22:00"}, "night": {"start": "22:00", "end": "06:00"}}',
  allow_split_shifts BOOLEAN DEFAULT false,
  allow_consecutive_nights BOOLEAN DEFAULT true,
  max_consecutive_nights INTEGER DEFAULT 5,
  max_consecutive_work_days INTEGER DEFAULT 7,
  
  -- Leave Settings
  annual_leave_days INTEGER DEFAULT 15,
  sick_leave_days INTEGER DEFAULT 10,
  personal_leave_days INTEGER DEFAULT 5,
  auto_approve_emergency_leave BOOLEAN DEFAULT true,
  leave_request_advance_days INTEGER DEFAULT 7,
  
  -- Swap Settings
  allow_swap_requests BOOLEAN DEFAULT true,
  swap_request_deadline_hours INTEGER DEFAULT 24,
  require_manager_approval_for_swap BOOLEAN DEFAULT true,
  allow_cross_team_swaps BOOLEAN DEFAULT false,
  
  -- Notification Settings
  enable_email_notifications BOOLEAN DEFAULT true,
  enable_sms_notifications BOOLEAN DEFAULT false,
  enable_push_notifications BOOLEAN DEFAULT true,
  notification_advance_hours INTEGER DEFAULT 24,
  
  -- Schedule Generation Settings
  auto_generate_schedule BOOLEAN DEFAULT false,
  generation_advance_days INTEGER DEFAULT 30,
  prefer_pattern_continuity BOOLEAN DEFAULT true,
  balance_workload BOOLEAN DEFAULT true,
  
  -- Compliance Settings
  enforce_labor_laws BOOLEAN DEFAULT true,
  track_overtime BOOLEAN DEFAULT true,
  require_overtime_approval BOOLEAN DEFAULT true,
  overtime_threshold_daily INTEGER DEFAULT 8,
  overtime_threshold_weekly INTEGER DEFAULT 40,
  
  -- Display Settings
  show_employee_photos BOOLEAN DEFAULT true,
  show_employee_contacts BOOLEAN DEFAULT false,
  default_schedule_view VARCHAR(20) DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  color_scheme VARCHAR(20) DEFAULT 'auto', -- 'light', 'dark', 'auto'
  
  -- Audit Settings
  enable_audit_log BOOLEAN DEFAULT true,
  audit_retention_days INTEGER DEFAULT 365,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id)
);

-- ==============================================
-- 2. CONSTRAINT SETTINGS (Toggleable Constraints)
-- ==============================================
CREATE TABLE IF NOT EXISTS constraint_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  constraint_type VARCHAR(50) NOT NULL,
  constraint_name VARCHAR(100) NOT NULL,
  
  -- Constraint Configuration
  is_enabled BOOLEAN DEFAULT true,
  is_hard_constraint BOOLEAN DEFAULT true, -- true=must enforce, false=soft/preference
  priority INTEGER DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  
  -- Constraint Values
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  default_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  
  -- Additional Configuration
  config JSONB DEFAULT '{}',
  /* Example configs:
  {
    "applies_to": ["all", "managers", "employees"],
    "exceptions": ["emergency", "holiday"],
    "time_range": {"start": "2024-01-01", "end": "2024-12-31"},
    "custom_formula": "value * 1.5 on weekends"
  }
  */
  
  description TEXT,
  warning_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, constraint_type, constraint_name)
);

-- ==============================================
-- 3. SCHEDULE RULES (Business Rules for Scheduling)
-- ==============================================
CREATE TABLE IF NOT EXISTS schedule_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  rule_type VARCHAR(50) NOT NULL, -- 'coverage', 'skill', 'seniority', 'pattern', 'custom'
  rule_name VARCHAR(100) NOT NULL,
  
  -- Rule Configuration
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,
  
  -- Rule Definition
  condition JSONB NOT NULL,
  /* Example conditions:
  {
    "type": "minimum_coverage",
    "shift": "night",
    "min_employees": 3,
    "required_skills": ["supervisor", "first_aid"]
  }
  */
  
  action JSONB NOT NULL,
  /* Example actions:
  {
    "type": "assign",
    "employee_criteria": {"seniority": "senior", "skill": "supervisor"},
    "fallback": "request_overtime"
  }
  */
  
  -- Validation
  validation_formula TEXT,
  error_message TEXT,
  
  -- Scheduling
  effective_from DATE,
  effective_to DATE,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, rule_type, rule_name)
);

-- ==============================================
-- 4. SIMULATION CONFIGS (Test Settings Before Apply)
-- ==============================================
CREATE TABLE IF NOT EXISTS simulation_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  simulation_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Simulation Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Settings to Test (JSON copy of settings)
  test_settings JSONB NOT NULL,
  test_constraints JSONB,
  test_rules JSONB,
  
  -- Simulation Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Results
  simulation_results JSONB,
  /* Example results:
  {
    "success_rate": 95.5,
    "violations": [],
    "warnings": ["Overtime increased by 15%"],
    "metrics": {
      "coverage": 98,
      "fairness": 92,
      "cost": 105
    },
    "recommendations": []
  }
  */
  
  -- Execution Details
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES employees(id),
  
  -- Apply Settings
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES employees(id),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 5. SETTING PRESETS (Pre-configured Templates)
-- ==============================================
CREATE TABLE IF NOT EXISTS setting_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  preset_name VARCHAR(100) NOT NULL,
  preset_type VARCHAR(50) NOT NULL, -- 'industry', 'size', 'custom'
  industry VARCHAR(50), -- 'manufacturing', 'healthcare', 'retail', 'hospitality'
  company_size VARCHAR(20), -- 'small', 'medium', 'large', 'enterprise'
  
  -- Preset Configuration
  settings JSONB NOT NULL,
  constraints JSONB,
  rules JSONB,
  
  description TEXT,
  features TEXT[],
  
  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(preset_name)
);

-- ==============================================
-- 6. SETTING HISTORY (Track Changes)
-- ==============================================
CREATE TABLE IF NOT EXISTS setting_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What changed
  setting_type VARCHAR(50) NOT NULL, -- 'tenant_settings', 'constraints', 'rules'
  setting_id UUID,
  field_name VARCHAR(100),
  
  -- Change details
  old_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  
  -- Who changed
  changed_by UUID REFERENCES employees(id),
  
  -- Rollback capability
  is_rollbackable BOOLEAN DEFAULT true,
  rolled_back BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES employees(id),
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to apply preset settings
CREATE OR REPLACE FUNCTION apply_preset_settings(
  p_tenant_id UUID,
  p_preset_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_preset RECORD;
BEGIN
  -- Get preset
  SELECT * INTO v_preset
  FROM setting_presets
  WHERE id = p_preset_id;
  
  IF v_preset IS NULL THEN
    RAISE EXCEPTION 'Preset not found';
  END IF;
  
  -- Apply tenant settings
  INSERT INTO tenant_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  UPDATE tenant_settings
  SET 
    timezone = COALESCE((v_preset.settings->>'timezone')::VARCHAR, timezone),
    default_shift_duration = COALESCE((v_preset.settings->>'default_shift_duration')::INTEGER, default_shift_duration),
    maximum_weekly_hours = COALESCE((v_preset.settings->>'maximum_weekly_hours')::INTEGER, maximum_weekly_hours),
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = p_tenant_id;
  
  -- Apply constraints if exists
  IF v_preset.constraints IS NOT NULL THEN
    -- Insert constraints from preset
    INSERT INTO constraint_settings (tenant_id, constraint_type, constraint_name, config)
    SELECT 
      p_tenant_id,
      (constraint->>'type')::VARCHAR,
      (constraint->>'name')::VARCHAR,
      constraint->'config'
    FROM jsonb_array_elements(v_preset.constraints) AS constraint
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Update usage count
  UPDATE setting_presets
  SET usage_count = usage_count + 1
  WHERE id = p_preset_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to validate settings
CREATE OR REPLACE FUNCTION validate_settings(
  p_tenant_id UUID
) RETURNS TABLE (
  is_valid BOOLEAN,
  warnings TEXT[],
  errors TEXT[]
) AS $$
DECLARE
  v_settings RECORD;
  v_warnings TEXT[] := ARRAY[]::TEXT[];
  v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get current settings
  SELECT * INTO v_settings
  FROM tenant_settings
  WHERE tenant_id = p_tenant_id;
  
  -- Validate working hours
  IF v_settings.maximum_weekly_hours > 52 THEN
    v_warnings := array_append(v_warnings, 'Weekly hours exceed legal limit of 52');
  END IF;
  
  IF v_settings.minimum_rest_hours < 11 THEN
    v_errors := array_append(v_errors, 'Minimum rest hours cannot be less than 11');
  END IF;
  
  -- Validate consecutive work days
  IF v_settings.max_consecutive_work_days > 14 THEN
    v_warnings := array_append(v_warnings, 'Consecutive work days exceed recommended limit');
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE WHEN array_length(v_errors, 1) IS NULL THEN TRUE ELSE FALSE END,
    v_warnings,
    v_errors;
END;
$$ LANGUAGE plpgsql;

-- Function to simulate schedule with new settings
CREATE OR REPLACE FUNCTION simulate_schedule_with_settings(
  p_simulation_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_simulation RECORD;
  v_results JSONB;
BEGIN
  -- Get simulation config
  SELECT * INTO v_simulation
  FROM simulation_configs
  WHERE id = p_simulation_id;
  
  -- Update status
  UPDATE simulation_configs
  SET 
    status = 'running',
    started_at = CURRENT_TIMESTAMP
  WHERE id = p_simulation_id;
  
  -- Perform simulation (simplified)
  -- In real implementation, this would run the actual scheduling algorithm
  v_results := jsonb_build_object(
    'success_rate', 95.5,
    'violations', '[]'::JSONB,
    'warnings', '["Overtime increased by 10%"]'::JSONB,
    'metrics', jsonb_build_object(
      'coverage', 98,
      'fairness', 92,
      'cost', 105,
      'compliance', 100
    ),
    'recommendations', '["Consider adjusting night shift premium"]'::JSONB
  );
  
  -- Update simulation with results
  UPDATE simulation_configs
  SET 
    status = 'completed',
    simulation_results = v_results,
    completed_at = CURRENT_TIMESTAMP
  WHERE id = p_simulation_id;
  
  RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track setting changes
CREATE OR REPLACE FUNCTION track_setting_changes() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Record each changed field
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO setting_history (
        tenant_id,
        setting_type,
        setting_id,
        field_name,
        old_value,
        new_value,
        changed_by
      )
      SELECT
        NEW.tenant_id,
        TG_TABLE_NAME,
        NEW.id,
        'all_fields',
        to_jsonb(OLD),
        to_jsonb(NEW),
        current_setting('app.current_user_id', true)::UUID
      WHERE OLD IS DISTINCT FROM NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to settings tables
CREATE TRIGGER track_tenant_settings_changes
  AFTER UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION track_setting_changes();

CREATE TRIGGER track_constraint_settings_changes
  AFTER UPDATE ON constraint_settings
  FOR EACH ROW
  EXECUTE FUNCTION track_setting_changes();

CREATE TRIGGER track_schedule_rules_changes
  AFTER UPDATE ON schedule_rules
  FOR EACH ROW
  EXECUTE FUNCTION track_setting_changes();

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX idx_constraint_settings_tenant ON constraint_settings(tenant_id);
CREATE INDEX idx_constraint_settings_type ON constraint_settings(constraint_type, is_enabled);
CREATE INDEX idx_schedule_rules_tenant ON schedule_rules(tenant_id, is_active);
CREATE INDEX idx_schedule_rules_team ON schedule_rules(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_simulation_configs_tenant ON simulation_configs(tenant_id, status);
CREATE INDEX idx_setting_presets_type ON setting_presets(preset_type, is_public);
CREATE INDEX idx_setting_history_tenant ON setting_history(tenant_id, created_at DESC);

-- ==============================================
-- RLS POLICIES
-- ==============================================

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE setting_history ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tenant settings
CREATE POLICY "Admins can manage tenant settings" ON tenant_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = tenant_settings.tenant_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage constraints" ON constraint_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = constraint_settings.tenant_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage rules" ON schedule_rules
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = schedule_rules.tenant_id 
      AND role = 'admin'
    )
  );

-- Managers can view settings
CREATE POLICY "Managers can view settings" ON tenant_settings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM employees 
      WHERE tenant_id = tenant_settings.tenant_id 
      AND role IN ('admin', 'manager')
    )
  );

-- Public presets are viewable by all
CREATE POLICY "Public presets viewable by all" ON setting_presets
  FOR SELECT USING (is_public = true);

-- ==============================================
-- DEFAULT DATA
-- ==============================================

-- Insert default constraint settings
INSERT INTO constraint_settings (tenant_id, constraint_type, constraint_name, min_value, max_value, default_value, current_value, description)
SELECT 
  id,
  'working_hours',
  'Maximum Weekly Hours',
  40,
  60,
  52,
  52,
  'Maximum number of hours an employee can work per week'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO constraint_settings (tenant_id, constraint_type, constraint_name, min_value, max_value, default_value, current_value, description)
SELECT 
  id,
  'rest_time',
  'Minimum Rest Hours',
  8,
  12,
  11,
  11,
  'Minimum rest hours between shifts'
FROM tenants
ON CONFLICT DO NOTHING;

INSERT INTO constraint_settings (tenant_id, constraint_type, constraint_name, min_value, max_value, default_value, current_value, description)
SELECT 
  id,
  'consecutive_nights',
  'Maximum Consecutive Night Shifts',
  3,
  7,
  5,
  5,
  'Maximum number of consecutive night shifts allowed'
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert industry presets
INSERT INTO setting_presets (preset_name, preset_type, industry, company_size, settings, description, features)
VALUES 
(
  'Manufacturing Standard',
  'industry',
  'manufacturing',
  'medium',
  '{
    "timezone": "Asia/Seoul",
    "default_shift_duration": 8,
    "maximum_weekly_hours": 52,
    "max_consecutive_nights": 5,
    "enforce_labor_laws": true,
    "shift_patterns": {
      "day": {"start": "06:00", "end": "14:00"},
      "evening": {"start": "14:00", "end": "22:00"},
      "night": {"start": "22:00", "end": "06:00"}
    }
  }'::JSONB,
  'Standard settings for manufacturing companies with 3-shift rotation',
  ARRAY['3-shift rotation', 'Labor law compliant', 'Overtime tracking']
),
(
  'Healthcare 24/7',
  'industry',
  'healthcare',
  'large',
  '{
    "timezone": "Asia/Seoul",
    "default_shift_duration": 12,
    "maximum_weekly_hours": 48,
    "max_consecutive_nights": 3,
    "enforce_labor_laws": true,
    "allow_split_shifts": true,
    "shift_patterns": {
      "day": {"start": "07:00", "end": "19:00"},
      "night": {"start": "19:00", "end": "07:00"}
    }
  }'::JSONB,
  'Settings optimized for 24/7 healthcare facilities',
  ARRAY['12-hour shifts', 'Split shift support', 'Strict rest requirements']
),
(
  'Retail Flexible',
  'industry',
  'retail',
  'small',
  '{
    "timezone": "Asia/Seoul",
    "default_shift_duration": 8,
    "maximum_weekly_hours": 40,
    "allow_split_shifts": true,
    "shift_patterns": {
      "morning": {"start": "09:00", "end": "14:00"},
      "afternoon": {"start": "14:00", "end": "19:00"},
      "evening": {"start": "19:00", "end": "22:00"}
    }
  }'::JSONB,
  'Flexible scheduling for retail operations',
  ARRAY['Part-time support', 'Flexible hours', 'Customer-facing optimization']
)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON tenant_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON constraint_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON schedule_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON simulation_configs TO authenticated;
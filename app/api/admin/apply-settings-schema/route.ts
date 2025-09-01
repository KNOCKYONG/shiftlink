import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check admin permission
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee || employee.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Read and execute the settings schema
    const settingsSchemaSQL = `
-- ==============================================
-- Settings Management Schema for ShiftLink (Fixed)
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
  action JSONB NOT NULL,
  
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
`

    // Execute schema in chunks to avoid timeout
    const sqlChunks = settingsSchemaSQL.split('-- ==============================================')
    const results = []

    for (const chunk of sqlChunks) {
      if (chunk.trim()) {
        console.log('Executing SQL chunk:', chunk.substring(0, 100) + '...')
        const { data, error } = await supabase.rpc('exec', { 
          sql: chunk.trim() 
        })
        
        if (error) {
          console.error('SQL execution error:', error)
          // Continue with other chunks even if one fails
          results.push({ chunk: chunk.substring(0, 100), error: error.message })
        } else {
          results.push({ chunk: chunk.substring(0, 100), success: true })
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settings schema application attempted',
      results 
    })

  } catch (error) {
    console.error('Schema application error:', error)
    return NextResponse.json({ 
      error: 'Failed to apply schema', 
      details: error instanceof Error ? error.message : error 
    }, { status: 500 })
  }
}
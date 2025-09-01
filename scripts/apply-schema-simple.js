const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createSettingsTables() {
  try {
    console.log('🚀 Creating Settings Management Tables...')
    
    // Create tenant_settings table
    console.log('📝 Creating tenant_settings table...')
    const { error: error1 } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS tenant_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          
          -- General Settings
          timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
          week_starts_on INTEGER DEFAULT 1 CHECK (week_starts_on BETWEEN 0 AND 6),
          fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
          default_language VARCHAR(10) DEFAULT 'ko',
          date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
          time_format VARCHAR(20) DEFAULT '24h',
          
          -- Working Hours Settings
          default_shift_duration INTEGER DEFAULT 8,
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
          default_schedule_view VARCHAR(20) DEFAULT 'monthly',
          color_scheme VARCHAR(20) DEFAULT 'auto',
          
          -- Audit Settings
          enable_audit_log BOOLEAN DEFAULT true,
          audit_retention_days INTEGER DEFAULT 365,
          
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(tenant_id)
        );
      `
    })
    
    if (error1) {
      console.error('❌ Error creating tenant_settings:', error1)
    } else {
      console.log('✅ tenant_settings table created')
    }

    // Create constraint_settings table
    console.log('📝 Creating constraint_settings table...')
    const { error: error2 } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS constraint_settings (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          
          constraint_type VARCHAR(50) NOT NULL,
          constraint_name VARCHAR(100) NOT NULL,
          
          is_enabled BOOLEAN DEFAULT true,
          is_hard_constraint BOOLEAN DEFAULT true,
          priority INTEGER DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
          
          min_value DECIMAL(10,2),
          max_value DECIMAL(10,2),
          default_value DECIMAL(10,2),
          current_value DECIMAL(10,2),
          
          config JSONB DEFAULT '{}',
          
          description TEXT,
          warning_message TEXT,
          
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(tenant_id, constraint_type, constraint_name)
        );
      `
    })
    
    if (error2) {
      console.error('❌ Error creating constraint_settings:', error2)
    } else {
      console.log('✅ constraint_settings table created')
    }

    console.log('\n✨ Basic tables creation completed!')
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error)
    process.exit(1)
  }
}

createSettingsTables()
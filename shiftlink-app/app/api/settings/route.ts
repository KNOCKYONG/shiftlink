import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManagerOrAdmin } from '@/lib/auth/utils'

export interface TenantSettings {
  // General Settings
  timezone: string
  week_starts_on: number
  fiscal_year_start_month: number
  default_language: string
  date_format: string
  time_format: string
  
  // Working Hours Settings
  default_shift_duration: number
  break_time_minutes: number
  minimum_rest_hours: number
  maximum_weekly_hours: number
  maximum_monthly_hours: number
  
  // Shift Settings
  shift_patterns: {
    day: { start: string; end: string }
    evening: { start: string; end: string }
    night: { start: string; end: string }
  }
  allow_split_shifts: boolean
  allow_consecutive_nights: boolean
  max_consecutive_nights: number
  max_consecutive_work_days: number
  
  // Leave Settings
  annual_leave_days: number
  sick_leave_days: number
  personal_leave_days: number
  auto_approve_emergency_leave: boolean
  leave_request_advance_days: number
  
  // Swap Settings
  allow_swap_requests: boolean
  swap_request_deadline_hours: number
  require_manager_approval_for_swap: boolean
  allow_cross_team_swaps: boolean
  
  // Notification Settings
  enable_email_notifications: boolean
  enable_sms_notifications: boolean
  enable_push_notifications: boolean
  notification_advance_hours: number
  
  // Schedule Generation Settings
  auto_generate_schedule: boolean
  generation_advance_days: number
  prefer_pattern_continuity: boolean
  balance_workload: boolean
  
  // Compliance Settings
  enforce_labor_laws: boolean
  track_overtime: boolean
  require_overtime_approval: boolean
  overtime_threshold_daily: number
  overtime_threshold_weekly: number
  
  // Display Settings
  show_employee_photos: boolean
  show_employee_contacts: boolean
  default_schedule_view: string
  color_scheme: string
  
  // Audit Settings
  enable_audit_log: boolean
  audit_retention_days: number
}

const DEFAULT_SETTINGS: TenantSettings = {
  timezone: 'Asia/Seoul',
  week_starts_on: 1,
  fiscal_year_start_month: 1,
  default_language: 'ko',
  date_format: 'YYYY-MM-DD',
  time_format: '24h',
  
  default_shift_duration: 8,
  break_time_minutes: 60,
  minimum_rest_hours: 11,
  maximum_weekly_hours: 52,
  maximum_monthly_hours: 200,
  
  shift_patterns: {
    day: { start: '06:00', end: '14:00' },
    evening: { start: '14:00', end: '22:00' },
    night: { start: '22:00', end: '06:00' }
  },
  allow_split_shifts: false,
  allow_consecutive_nights: true,
  max_consecutive_nights: 5,
  max_consecutive_work_days: 7,
  
  annual_leave_days: 15,
  sick_leave_days: 10,
  personal_leave_days: 5,
  auto_approve_emergency_leave: true,
  leave_request_advance_days: 7,
  
  allow_swap_requests: true,
  swap_request_deadline_hours: 24,
  require_manager_approval_for_swap: true,
  allow_cross_team_swaps: false,
  
  enable_email_notifications: true,
  enable_sms_notifications: false,
  enable_push_notifications: true,
  notification_advance_hours: 24,
  
  auto_generate_schedule: false,
  generation_advance_days: 30,
  prefer_pattern_continuity: true,
  balance_workload: true,
  
  enforce_labor_laws: true,
  track_overtime: true,
  require_overtime_approval: true,
  overtime_threshold_daily: 8,
  overtime_threshold_weekly: 40,
  
  show_employee_photos: true,
  show_employee_contacts: false,
  default_schedule_view: 'monthly',
  color_scheme: 'auto',
  
  enable_audit_log: true,
  audit_retention_days: 365
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireManagerOrAdmin()
    const supabase = createClient()
    
    // Try to get existing settings from tenant record
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings, industry_type')
      .eq('id', user.tenantId)
      .single()
    
    let settings: TenantSettings = DEFAULT_SETTINGS
    
    if (tenant?.settings) {
      // Merge with defaults to ensure all fields are present
      settings = { ...DEFAULT_SETTINGS, ...tenant.settings }
    }

    // Also get legacy ruleset data for backward compatibility
    const { data: rulesets } = await supabase
      .from('rulesets')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false })

    // Merge legacy settings if they exist
    if (rulesets && rulesets.length > 0) {
      const legacySettings: Partial<TenantSettings> = {}
      
      rulesets.forEach(rule => {
        switch (rule.rule_name) {
          case 'min_rest_hours':
            legacySettings.minimum_rest_hours = rule.rule_value
            break
          case 'max_weekly_hours':
            legacySettings.maximum_weekly_hours = rule.rule_value
            break
          case 'max_consecutive_nights':
            legacySettings.max_consecutive_nights = rule.rule_value
            break
        }
      })
      
      settings = { ...settings, ...legacySettings }
    }

    return NextResponse.json({ 
      success: true,
      settings,
      industry_type: tenant?.industry_type || 'general'
    })
    
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch settings' 
    }, { status: 500 })
  }
}

// PUT /api/settings - Update tenant settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireManagerOrAdmin()
    const supabase = createClient()
    
    const body = await request.json()
    const updates: Partial<TenantSettings> = body.settings
    
    if (!updates) {
      return NextResponse.json({ 
        error: 'Settings data is required' 
      }, { status: 400 })
    }
    
    // Validate settings (basic validation)
    if (updates.minimum_rest_hours && updates.minimum_rest_hours < 8) {
      return NextResponse.json({ 
        error: 'Minimum rest hours cannot be less than 8 hours' 
      }, { status: 400 })
    }
    
    if (updates.maximum_weekly_hours && updates.maximum_weekly_hours > 60) {
      return NextResponse.json({ 
        error: 'Maximum weekly hours should not exceed 60 hours' 
      }, { status: 400 })
    }
    
    // Get current settings
    const { data: currentTenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', user.tenantId)
      .single()
    
    const currentSettings = currentTenant?.settings || DEFAULT_SETTINGS
    const newSettings = { ...currentSettings, ...updates }
    
    // Update tenant settings
    const { error } = await supabase
      .from('tenants')
      .update({ 
        settings: newSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.tenantId)
    
    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ 
        error: 'Failed to update settings' 
      }, { status: 500 })
    }
    
    // Create audit log
    await supabase.from('audit_logs').insert({
      tenant_id: user.tenantId,
      user_id: user.employeeId,
      action: 'settings_updated',
      resource_type: 'tenant_settings',
      resource_id: user.tenantId,
      details: {
        updated_fields: Object.keys(updates),
        previous_values: Object.keys(updates).reduce((acc, key) => {
          acc[key] = currentSettings[key as keyof TenantSettings]
          return acc
        }, {} as any),
        new_values: updates
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      settings: newSettings 
    })
    
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ 
      error: 'Failed to update settings' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireManagerOrAdmin()
    const supabase = createClient()

    const body = await request.json()
    const { category, settings } = body

    if (!category || !settings) {
      return NextResponse.json(
        { error: 'Category and settings are required' },
        { status: 400 }
      )
    }

    switch (category) {
      case 'constraints':
        await updateConstraintSettings(supabase, user, settings)
        break
      
      case 'shiftTemplate':
        await createOrUpdateShiftTemplate(supabase, user, settings)
        break
      
      case 'team':
        await createOrUpdateTeam(supabase, user, settings)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        )
    }

    // Log the settings change
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: user.tenantId,
        user_id: user.employeeId,
        action: 'settings_updated',
        entity_type: 'settings',
        details: {
          category,
          settings
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Settings update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function updateConstraintSettings(supabase: any, user: any, settings: any) {
  const constraintRules = [
    { name: 'min_rest_hours', value: settings.minRestHours, description: 'Minimum rest hours between shifts' },
    { name: 'max_weekly_hours', value: settings.maxWeeklyHours, description: 'Maximum weekly working hours' },
    { name: 'max_consecutive_nights', value: settings.maxConsecutiveNights, description: 'Maximum consecutive night shifts' },
    { name: 'min_staff_per_shift', value: settings.minStaffPerShift, description: 'Minimum staff required per shift' }
  ]

  for (const rule of constraintRules) {
    // Check if rule exists
    const { data: existing } = await supabase
      .from('rulesets')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('rule_name', rule.name)
      .single()

    if (existing) {
      // Update existing rule
      await supabase
        .from('rulesets')
        .update({
          rule_value: rule.value,
          description: rule.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Create new rule
      await supabase
        .from('rulesets')
        .insert({
          tenant_id: user.tenantId,
          rule_name: rule.name,
          rule_value: rule.value,
          description: rule.description,
          is_active: true,
          created_by: user.employeeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }
  }
}

async function createOrUpdateShiftTemplate(supabase: any, user: any, settings: any) {
  const shiftData = {
    tenant_id: user.tenantId,
    name: settings.name,
    type: settings.type,
    start_time: settings.startTime,
    end_time: settings.endTime,
    required_count: settings.requiredCount || 1,
    description: settings.description || null,
    is_active: settings.isActive !== false,
    updated_at: new Date().toISOString()
  }

  if (settings.id) {
    // Update existing shift template
    await supabase
      .from('shift_templates')
      .update(shiftData)
      .eq('id', settings.id)
      .eq('tenant_id', user.tenantId)
  } else {
    // Create new shift template
    await supabase
      .from('shift_templates')
      .insert({
        ...shiftData,
        created_by: user.employeeId,
        created_at: new Date().toISOString()
      })
  }
}

async function createOrUpdateTeam(supabase: any, user: any, settings: any) {
  const teamData = {
    tenant_id: user.tenantId,
    name: settings.name,
    description: settings.description || null,
    is_active: settings.isActive !== false,
    updated_at: new Date().toISOString()
  }

  if (settings.id) {
    // Update existing team
    await supabase
      .from('teams')
      .update(teamData)
      .eq('id', settings.id)
      .eq('tenant_id', user.tenantId)
  } else {
    // Create new team
    await supabase
      .from('teams')
      .insert({
        ...teamData,
        created_by: user.employeeId,
        created_at: new Date().toISOString()
      })
  }
}
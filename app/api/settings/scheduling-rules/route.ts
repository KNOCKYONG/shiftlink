import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check permissions (only admin/manager can view settings)
    if (!['admin', 'manager'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get scheduling rules for the tenant
    const { data: ruleset, error } = await supabase
      .from('rulesets')
      .select('*')
      .eq('tenant_id', employee.tenant_id)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json(
        { error: `Failed to fetch scheduling rules: ${error.message}` },
        { status: 500 }
      )
    }

    // Default Korean nursing rules if none exist
    const defaultRules = {
      // 기본 제약 조건
      min_rest_between_shifts: 11,
      max_consecutive_nights: 2,
      max_consecutive_days: 5,
      max_weekly_hours: 40,
      
      // 한국 간호사 특화 규칙
      avoid_dangerous_patterns: true,
      day_night_gap_required: true,
      weekend_coverage_required: true,
      holiday_coverage_required: true,
      
      // 공정성 설정
      fairness_weight: 0.3,
      seniority_weight: 0.2,
      preference_weight: 0.3,
      workload_weight: 0.2,
      
      // 피로도 관리
      fatigue_monitoring_enabled: true,
      max_fatigue_score: 7.0,
      consecutive_shift_penalty: 1.5,
      night_shift_penalty: 1.2,
      
      // 스케줄링 최적화
      optimization_iterations: 1000,
      min_acceptable_score: 0.8,
      allow_partial_solutions: true,
      emergency_override_enabled: true,
      
      // 알림 및 경고
      send_warnings: true,
      violation_notifications: true,
      pattern_risk_alerts: true,
      fatigue_alerts: true
    }

    const rules = ruleset ? {
      ...defaultRules,
      ...ruleset.rules_config
    } : defaultRules

    return NextResponse.json({
      success: true,
      data: { rules }
    })

  } catch (error) {
    console.error('Scheduling rules fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check permissions (only admin can modify settings)
    if (employee.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { rules } = body

    if (!rules || typeof rules !== 'object') {
      return NextResponse.json(
        { error: 'Rules object is required' },
        { status: 400 }
      )
    }

    // Validate critical rules
    if (rules.min_rest_between_shifts && (rules.min_rest_between_shifts < 8 || rules.min_rest_between_shifts > 24)) {
      return NextResponse.json(
        { error: 'Minimum rest between shifts must be between 8-24 hours' },
        { status: 400 }
      )
    }

    if (rules.max_weekly_hours && (rules.max_weekly_hours < 20 || rules.max_weekly_hours > 60)) {
      return NextResponse.json(
        { error: 'Maximum weekly hours must be between 20-60 hours' },
        { status: 400 }
      )
    }

    // Check if ruleset exists for this tenant
    const { data: existingRuleset } = await supabase
      .from('rulesets')
      .select('id')
      .eq('tenant_id', employee.tenant_id)
      .eq('is_active', true)
      .single()

    let result
    if (existingRuleset) {
      // Update existing ruleset
      result = await supabase
        .from('rulesets')
        .update({
          rules_config: rules,
          updated_at: new Date().toISOString(),
          updated_by: employee.id
        })
        .eq('id', existingRuleset.id)
        .select()
        .single()
    } else {
      // Create new ruleset
      result = await supabase
        .from('rulesets')
        .insert({
          tenant_id: employee.tenant_id,
          name: 'Korean Nursing Rules',
          description: '한국 간호사 3교대 스케줄링 규칙',
          rules_config: rules,
          is_active: true,
          created_by: employee.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json(
        { error: `Failed to save scheduling rules: ${result.error.message}` },
        { status: 500 }
      )
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: employee.tenant_id,
        user_id: user.id,
        action: 'scheduling_rules_updated',
        entity_type: 'ruleset',
        details: {
          rulesetId: result.data?.id,
          updatedBy: employee.id,
          changeType: existingRuleset ? 'update' : 'create'
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Scheduling rules saved successfully',
      data: {
        rulesetId: result.data?.id,
        changeType: existingRuleset ? 'updated' : 'created'
      }
    })

  } catch (error) {
    console.error('Scheduling rules save error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
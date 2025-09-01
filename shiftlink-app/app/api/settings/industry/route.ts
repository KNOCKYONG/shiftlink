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

    // Get tenant industry type
    const { data: tenant } = await supabase
      .from('tenants')
      .select('industry_type')
      .eq('id', employee.tenant_id)
      .single()

    // Get industry configuration
    const { data: config } = await supabase
      .from('industry_configurations')
      .select('config')
      .eq('tenant_id', employee.tenant_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        industryType: tenant?.industry_type || 'general',
        config: config?.config || {}
      }
    })

  } catch (error) {
    console.error('Industry settings fetch error:', error)
    
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
    const { industryType, config } = body

    if (!industryType) {
      return NextResponse.json(
        { error: 'Industry type is required' },
        { status: 400 }
      )
    }

    // Valid industry types
    const validIndustries = [
      'general', 
      'healthcare_nursing', 
      'manufacturing', 
      'retail', 
      'hospitality'
    ]

    if (!validIndustries.includes(industryType)) {
      return NextResponse.json(
        { error: 'Invalid industry type' },
        { status: 400 }
      )
    }

    // Update tenant industry type
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ 
        industry_type: industryType,
        updated_at: new Date().toISOString()
      })
      .eq('id', employee.tenant_id)

    if (tenantError) {
      return NextResponse.json(
        { error: `Failed to update tenant industry type: ${tenantError.message}` },
        { status: 500 }
      )
    }

    // Upsert industry configuration
    const { error: configError } = await supabase
      .from('industry_configurations')
      .upsert({
        tenant_id: employee.tenant_id,
        industry_type: industryType,
        config: config || {},
        updated_at: new Date().toISOString()
      })

    if (configError) {
      return NextResponse.json(
        { error: `Failed to save industry configuration: ${configError.message}` },
        { status: 500 }
      )
    }

    // Update scheduling rules if nursing mode is enabled
    if (industryType === 'healthcare_nursing' && config?.enableNursingMode) {
      const nursingRules = {
        // 한국 간호사 특화 규칙
        min_rest_between_shifts: 11,
        max_consecutive_nights: 2,
        max_consecutive_days: 5,
        max_weekly_hours: 40,
        
        // 간호사 특화 기능
        avoid_dangerous_patterns: true,
        day_night_gap_required: true,
        fatigue_monitoring_enabled: true,
        korean_labor_law_compliance: true,
        
        // 패턴 회피
        dangerous_pattern_detection: true,
        pattern_risk_scoring: true,
        
        // 공정성
        fairness_weight: 0.3,
        preference_weight: 0.3,
        workload_weight: 0.2,
        seniority_weight: 0.2
      }

      await supabase
        .from('rulesets')
        .upsert({
          tenant_id: employee.tenant_id,
          name: 'Healthcare Nursing Rules',
          description: '의료/간호 업종 특화 스케줄링 규칙',
          rules_config: nursingRules,
          is_active: true,
          created_by: employee.id,
          updated_at: new Date().toISOString()
        })
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: employee.tenant_id,
        user_id: user.id,
        action: 'industry_settings_updated',
        entity_type: 'tenant',
        details: {
          industryType,
          nursingModeEnabled: config?.enableNursingMode || false,
          updatedBy: employee.id
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Industry settings saved successfully',
      data: {
        industryType,
        nursingModeEnabled: config?.enableNursingMode || false
      }
    })

  } catch (error) {
    console.error('Industry settings save error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
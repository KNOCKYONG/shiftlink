import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/settings/tenant - Get tenant settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee and tenant
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    // Get tenant settings
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', employee.tenant_id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    
    // If no settings exist, create default settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_id: employee.tenant_id
        })
        .select()
        .single()
      
      if (createError) {
        throw createError
      }
      
      return NextResponse.json({
        success: true,
        data: newSettings
      })
    }
    
    return NextResponse.json({
      success: true,
      data: settings
    })
    
  } catch (error) {
    console.error('Error fetching tenant settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/tenant - Update tenant settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee and check admin role
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee || employee.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Update settings
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', employee.tenant_id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    // Log the change
    await supabase.from('audit_logs').insert({
      tenant_id: employee.tenant_id,
      user_id: user.id,
      action: 'update_tenant_settings',
      entity_type: 'tenant_settings',
      entity_id: settings.id,
      details: {
        changes: body
      }
    })
    
    return NextResponse.json({
      success: true,
      data: settings
    })
    
  } catch (error) {
    console.error('Error updating tenant settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings/tenant/validate - Validate settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    // Validate settings
    const warnings: string[] = []
    const errors: string[] = []
    
    // Working hours validation
    if (body.maximum_weekly_hours > 52) {
      warnings.push('주당 최대 근무시간이 법정 한도(52시간)를 초과합니다')
    }
    
    if (body.minimum_rest_hours < 11) {
      errors.push('최소 휴식시간은 11시간 이상이어야 합니다')
    }
    
    // Consecutive work validation
    if (body.max_consecutive_work_days > 14) {
      warnings.push('연속 근무일이 권장 한도를 초과합니다')
    }
    
    if (body.max_consecutive_nights > 7) {
      warnings.push('연속 야간 근무가 과도합니다')
    }
    
    // Leave validation
    if (body.annual_leave_days < 15) {
      warnings.push('연차 일수가 법정 최소 기준보다 낮습니다')
    }
    
    // Shift duration validation
    if (body.default_shift_duration > 12) {
      warnings.push('기본 교대 시간이 12시간을 초과합니다')
    }
    
    return NextResponse.json({
      success: true,
      data: {
        is_valid: errors.length === 0,
        warnings,
        errors
      }
    })
    
  } catch (error) {
    console.error('Error validating settings:', error)
    return NextResponse.json(
      { error: 'Failed to validate settings' },
      { status: 500 }
    )
  }
}
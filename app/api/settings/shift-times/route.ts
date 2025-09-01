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

    // Get shift time settings for the tenant
    const { data: shiftTemplates, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('tenant_id', employee.tenant_id)
      .order('shift_type')

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch shift templates: ${error.message}` },
        { status: 500 }
      )
    }

    // Transform to settings format
    const settings = shiftTemplates?.map(template => ({
      shiftType: template.shift_type,
      startTime: template.start_time,
      endTime: template.end_time,
      duration: template.duration_hours,
      color: template.display_color || '#3B82F6',
      isActive: template.is_active
    })) || []

    return NextResponse.json({
      success: true,
      data: { settings }
    })

  } catch (error) {
    console.error('Shift times settings fetch error:', error)
    
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
    const { settings } = body

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    // Validate settings
    for (const setting of settings) {
      if (!setting.shiftType || !setting.startTime || !setting.endTime) {
        return NextResponse.json(
          { error: 'Each setting must have shiftType, startTime, and endTime' },
          { status: 400 }
        )
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(setting.startTime) || !timeRegex.test(setting.endTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM format' },
          { status: 400 }
        )
      }
    }

    // Delete existing shift templates for this tenant
    await supabase
      .from('shift_templates')
      .delete()
      .eq('tenant_id', employee.tenant_id)

    // Insert new shift templates
    const shiftTemplates = settings.map(setting => ({
      tenant_id: employee.tenant_id,
      shift_type: setting.shiftType,
      start_time: setting.startTime,
      end_time: setting.endTime,
      duration_hours: setting.duration || 8,
      display_color: setting.color || '#3B82F6',
      is_active: setting.isActive !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data: createdTemplates, error: insertError } = await supabase
      .from('shift_templates')
      .insert(shiftTemplates)
      .select()

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save shift templates: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: employee.tenant_id,
        user_id: user.id,
        action: 'shift_templates_updated',
        entity_type: 'shift_template',
        details: {
          templateCount: settings.length,
          updatedBy: employee.id
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Shift time settings saved successfully',
      data: {
        templateCount: createdTemplates?.length || 0
      }
    })

  } catch (error) {
    console.error('Shift times settings save error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
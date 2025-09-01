import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  WorkPatternPreference, 
  WORK_PATTERN_TEMPLATES,
  recommendWorkPattern 
} from '@/lib/scheduler/work-pattern-types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const tenantId = searchParams.get('tenantId')

    if (employeeId) {
      // Get specific employee's work pattern
      const { data: pattern, error } = await supabase
        .from('work_pattern_preferences')
        .select('*')
        .eq('employee_id', employeeId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return NextResponse.json({ pattern })
    }

    if (tenantId) {
      // Get all patterns for a tenant
      const { data: patterns, error } = await supabase
        .from('work_pattern_preferences')
        .select(`
          *,
          employees(name, employee_code)
        `)
        .eq('employees.tenant_id', tenantId)

      if (error) throw error

      return NextResponse.json({ patterns })
    }

    return NextResponse.json({ 
      error: 'Employee ID or Tenant ID is required' 
    }, { status: 400 })

  } catch (error) {
    console.error('Error fetching work patterns:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch work patterns' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      employee_id,
      pattern_type,
      work_intensity,
      rest_preference,
      preferred_consecutive_work_days,
      preferred_consecutive_rest_days,
      max_consecutive_work_days,
      min_rest_between_cycles,
      shift_type_preferences,
      weekday_preferences,
      avoid_friday_night,
      prefer_weekend_off,
      flexible_schedule
    } = body

    // Validate required fields
    if (!employee_id || !pattern_type) {
      return NextResponse.json({ 
        error: 'Employee ID and pattern type are required' 
      }, { status: 400 })
    }

    // Check if pattern already exists
    const { data: existing } = await supabase
      .from('work_pattern_preferences')
      .select('id')
      .eq('employee_id', employee_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Work pattern already exists for this employee. Use PUT to update.' 
      }, { status: 409 })
    }

    // Use template defaults if not provided
    const template = WORK_PATTERN_TEMPLATES[pattern_type as keyof typeof WORK_PATTERN_TEMPLATES]
    if (!template) {
      return NextResponse.json({ 
        error: 'Invalid pattern type' 
      }, { status: 400 })
    }

    const patternData: Partial<WorkPatternPreference> = {
      employee_id,
      pattern_type,
      work_intensity: work_intensity || template.work_intensity,
      rest_preference: rest_preference || template.rest_preference,
      preferred_consecutive_work_days: preferred_consecutive_work_days || template.preferred_consecutive_work_days,
      preferred_consecutive_rest_days: preferred_consecutive_rest_days || template.preferred_consecutive_rest_days,
      max_consecutive_work_days: max_consecutive_work_days || template.max_consecutive_work_days,
      min_rest_between_cycles: min_rest_between_cycles || template.min_rest_between_cycles,
      shift_type_preferences: shift_type_preferences || {
        day: 7,
        evening: 6,
        night: 5
      },
      weekday_preferences: weekday_preferences || template.weekday_preferences,
      avoid_friday_night: avoid_friday_night ?? false,
      prefer_weekend_off: prefer_weekend_off ?? true,
      flexible_schedule: flexible_schedule ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: pattern, error } = await supabase
      .from('work_pattern_preferences')
      .insert(patternData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Work pattern created successfully',
      pattern 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating work pattern:', error)
    return NextResponse.json({ 
      error: 'Failed to create work pattern' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { employee_id, ...updateData } = body

    if (!employee_id) {
      return NextResponse.json({ 
        error: 'Employee ID is required' 
      }, { status: 400 })
    }

    const { data: pattern, error } = await supabase
      .from('work_pattern_preferences')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employee_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Work pattern updated successfully',
      pattern 
    })

  } catch (error) {
    console.error('Error updating work pattern:', error)
    return NextResponse.json({ 
      error: 'Failed to update work pattern' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ 
        error: 'Employee ID is required' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('work_pattern_preferences')
      .delete()
      .eq('employee_id', employeeId)

    if (error) throw error

    return NextResponse.json({ 
      message: 'Work pattern deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting work pattern:', error)
    return NextResponse.json({ 
      error: 'Failed to delete work pattern' 
    }, { status: 500 })
  }
}
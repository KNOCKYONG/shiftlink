import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const employeeId = searchParams.get('employeeId')
    const period = searchParams.get('period') || 'weekly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check permissions
    const targetEmployeeId = employeeId || currentEmployee.id
    if (targetEmployeeId !== currentEmployee.id && !['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Calculate date range based on period
    let periodStart: Date
    let periodEnd: Date
    const now = new Date()

    if (startDate && endDate) {
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)
    } else {
      switch (period) {
        case 'daily':
          periodStart = new Date(now.setHours(0, 0, 0, 0))
          periodEnd = new Date(now.setHours(23, 59, 59, 999))
          break
        case 'weekly':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          periodStart = weekStart
          periodEnd = new Date(weekStart)
          periodEnd.setDate(weekStart.getDate() + 6)
          periodEnd.setHours(23, 59, 59, 999)
          break
        case 'monthly':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          break
        default:
          periodStart = new Date(now.setHours(0, 0, 0, 0))
          periodEnd = new Date(now.setHours(23, 59, 59, 999))
      }
    }

    // Fetch work time aggregation
    const { data: workTimeData, error } = await supabase
      .from('work_time_aggregations')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('period_type', period)
      .gte('period_start', periodStart.toISOString())
      .lte('period_end', periodEnd.toISOString())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // If no data found, calculate from schedule assignments
    if (!workTimeData) {
      const { data: assignments } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedule:schedule_id(schedule_date)
        `)
        .eq('employee_id', targetEmployeeId)
        .gte('schedule.schedule_date', periodStart.toISOString().split('T')[0])
        .lte('schedule.schedule_date', periodEnd.toISOString().split('T')[0])
        .eq('status', 'confirmed')

      // Calculate aggregated data
      let totalHours = 0
      let regularHours = 0
      let overtimeHours = 0
      let nightHours = 0
      let weekendHours = 0
      let dayShifts = 0
      let eveningShifts = 0
      let nightShifts = 0

      assignments?.forEach(assignment => {
        const shiftHours = 8 // Default hours per shift
        totalHours += shiftHours

        switch (assignment.shift_type) {
          case 'day':
            dayShifts++
            regularHours += shiftHours
            break
          case 'evening':
            eveningShifts++
            regularHours += shiftHours
            break
          case 'night':
            nightShifts++
            nightHours += shiftHours
            break
        }

        // Check if weekend
        const date = new Date(assignment.schedule.schedule_date)
        if (date.getDay() === 0 || date.getDay() === 6) {
          weekendHours += shiftHours
        }
      })

      // Calculate overtime (over 40 hours per week)
      if (period === 'weekly' && totalHours > 40) {
        overtimeHours = totalHours - 40
        regularHours = 40
      }

      return NextResponse.json({
        success: true,
        data: {
          total_hours: totalHours,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          night_hours: nightHours,
          weekend_hours: weekendHours,
          total_shifts: assignments?.length || 0,
          day_shifts: dayShifts,
          evening_shifts: eveningShifts,
          night_shifts: nightShifts,
          weekly_limit_violations: totalHours > 52 ? 1 : 0,
          rest_time_violations: 0 // Would need more complex calculation
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: workTimeData
    })

  } catch (error) {
    console.error('Error fetching work time data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch work time data' 
    }, { status: 500 })
  }
}

// Create or update work time aggregation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Only admins and managers can create/update aggregations
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      employee_id,
      period_type,
      period_start,
      period_end,
      ...aggregationData
    } = body

    // Upsert work time aggregation
    const { data, error } = await supabase
      .from('work_time_aggregations')
      .upsert({
        employee_id,
        tenant_id: currentEmployee.tenant_id,
        period_type,
        period_start,
        period_end,
        ...aggregationData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'work_time_aggregation_update',
      resource_type: 'work_time',
      resource_id: data.id,
      details: {
        employee_id,
        period_type,
        period_start,
        period_end
      }
    })

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error updating work time data:', error)
    return NextResponse.json({ 
      error: 'Failed to update work time data' 
    }, { status: 500 })
  }
}
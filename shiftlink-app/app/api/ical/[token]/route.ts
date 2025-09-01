import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ScheduleCalendarGenerator } from '@/lib/ical/schedule-calendar'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const { token } = params
    
    // Validate token and get employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        email,
        team_id,
        calendar_token
      `)
      .eq('calendar_token', token)
      .single()
    
    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get date range (last 3 months to next 3 months)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 3)
    startDate.setDate(1)
    
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)
    endDate.setDate(0) // Last day of month
    
    // Fetch assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        employee:employee_id(
          id,
          name,
          email,
          employee_number,
          team_id
        )
      `)
      .eq('employee_id', employee.id)
      .gte('shift_date', startDate.toISOString().split('T')[0])
      .lte('shift_date', endDate.toISOString().split('T')[0])
      .eq('status', 'confirmed')
      .order('shift_date', { ascending: true })
    
    if (assignmentsError) {
      throw assignmentsError
    }
    
    // Generate ICS
    const calendarGenerator = new ScheduleCalendarGenerator()
    const icsContent = calendarGenerator.generateICS(
      assignments.map(a => ({ assignment: a }))
    )
    
    if (!icsContent) {
      throw new Error('Failed to generate calendar')
    }
    
    // Return ICS file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="shiftlink_schedule.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Error generating calendar feed:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    )
  }
}
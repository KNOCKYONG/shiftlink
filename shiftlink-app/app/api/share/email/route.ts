import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ScheduleMailer } from '@/lib/email/schedule-mailer'
import { SchedulePDFGenerator } from '@/lib/pdf/schedule-generator'
import { ScheduleCSVExporter } from '@/lib/csv/schedule-exporter'
import { ScheduleCalendarGenerator } from '@/lib/ical/schedule-calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      scheduleId,
      recipients,
      includesPDF = true,
      includesCSV = true,
      includesICS = true,
      month
    } = body
    
    // Validate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get employee
    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role, team_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    // Check permissions
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Fetch schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()
    
    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    // Fetch assignments with employee data
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
      .eq('schedule_id', scheduleId)
      .eq('status', 'confirmed')
    
    if (assignmentsError) {
      throw assignmentsError
    }
    
    // Get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', schedule.team_id)
      .single()
    
    const teamName = team?.name || 'Team'
    
    // Generate attachments
    const attachments: any = {}
    
    if (includesPDF) {
      const pdfGenerator = new SchedulePDFGenerator()
      attachments.pdf = pdfGenerator.generate({
        schedule,
        assignments,
        teamName,
        month: new Date(month || schedule.schedule_date)
      })
    }
    
    if (includesCSV) {
      const csvExporter = new ScheduleCSVExporter()
      attachments.csv = csvExporter.generate({
        schedule,
        assignments,
        teamName,
        month: new Date(month || schedule.schedule_date)
      })
    }
    
    if (includesICS) {
      const calendarGenerator = new ScheduleCalendarGenerator()
      attachments.ics = calendarGenerator.generateICS(
        assignments.map(a => ({ assignment: a }))
      )
    }
    
    // Send email
    const mailer = new ScheduleMailer()
    const result = await mailer.sendScheduleEmail(
      recipients,
      schedule,
      assignments,
      attachments
    )
    
    if (!result.success) {
      throw new Error('Failed to send email')
    }
    
    // Log the action
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: user.id,
      action: 'share_schedule_email',
      entity_type: 'schedule',
      entity_id: scheduleId,
      details: {
        recipients,
        attachments: {
          pdf: includesPDF,
          csv: includesCSV,
          ics: includesICS
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: '이메일이 성공적으로 발송되었습니다.'
    })
    
  } catch (error) {
    console.error('Error sharing schedule via email:', error)
    return NextResponse.json(
      { error: 'Failed to share schedule' },
      { status: 500 }
    )
  }
}

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

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') // 'workload', 'overtime', 'attendance', 'fatigue'
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    switch (reportType) {
      case 'workload':
        return await generateWorkloadReport(supabase, employee, startDate, endDate)
      
      case 'overtime':
        return await generateOvertimeReport(supabase, employee, startDate, endDate)
      
      case 'attendance':
        return await generateAttendanceReport(supabase, employee, startDate, endDate)
      
      case 'fatigue':
        return await generateFatigueReport(supabase, employee, startDate, endDate)
      
      case 'dashboard':
        return await generateDashboardMetrics(supabase, employee)
      
      default:
        return NextResponse.json(
          { error: 'Invalid report type. Available types: workload, overtime, attendance, fatigue, dashboard' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Report generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateWorkloadReport(supabase: any, employee: any, startDate: string, endDate: string) {
  // Employee workload analysis
  const { data: assignments } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      employee:employees (
        id,
        name,
        employee_code,
        role,
        level
      ),
      shift_template:shift_templates (
        name,
        type,
        start_time,
        end_time
      )
    `)
    .eq('tenant_id', employee.tenant_id)
    .gte('date', startDate)
    .lte('date', endDate)

  if (!assignments) {
    return NextResponse.json({ success: true, data: { employees: [] } })
  }

  // Group by employee and calculate metrics
  const employeeMetrics = new Map()

  assignments.forEach(assignment => {
    const empId = assignment.employee_id
    if (!employeeMetrics.has(empId)) {
      employeeMetrics.set(empId, {
        employee: assignment.employee,
        totalShifts: 0,
        totalHours: 0,
        shiftTypes: { day: 0, evening: 0, night: 0 },
        overtimeHours: 0,
        averageHoursPerWeek: 0
      })
    }

    const metrics = employeeMetrics.get(empId)
    metrics.totalShifts++
    
    // Calculate shift hours (assuming 8-hour shifts for simplicity)
    const shiftHours = 8
    metrics.totalHours += shiftHours
    
    if (assignment.is_overtime) {
      metrics.overtimeHours += shiftHours
    }

    metrics.shiftTypes[assignment.shift_template.type]++
  })

  // Calculate average weekly hours
  const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  const weeks = Math.max(1, Math.ceil(days / 7))

  employeeMetrics.forEach(metrics => {
    metrics.averageHoursPerWeek = Math.round((metrics.totalHours / weeks) * 10) / 10
  })

  const workloadData = Array.from(employeeMetrics.values())
    .sort((a, b) => b.totalHours - a.totalHours)

  return NextResponse.json({
    success: true,
    data: {
      period: { startDate, endDate },
      employees: workloadData,
      summary: {
        totalEmployees: workloadData.length,
        totalShifts: workloadData.reduce((sum, emp) => sum + emp.totalShifts, 0),
        totalHours: workloadData.reduce((sum, emp) => sum + emp.totalHours, 0),
        averageHoursPerEmployee: Math.round((workloadData.reduce((sum, emp) => sum + emp.totalHours, 0) / workloadData.length) * 10) / 10
      }
    }
  })
}

async function generateOvertimeReport(supabase: any, employee: any, startDate: string, endDate: string) {
  const { data: overtimeAssignments } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      employee:employees (
        id,
        name,
        employee_code,
        role
      ),
      shift_template:shift_templates (
        name,
        type,
        start_time,
        end_time
      )
    `)
    .eq('tenant_id', employee.tenant_id)
    .eq('is_overtime', true)
    .gte('date', startDate)
    .lte('date', endDate)

  const overtimeByEmployee = new Map()

  overtimeAssignments?.forEach(assignment => {
    const empId = assignment.employee_id
    if (!overtimeByEmployee.has(empId)) {
      overtimeByEmployee.set(empId, {
        employee: assignment.employee,
        overtimeShifts: 0,
        overtimeHours: 0,
        costEstimate: 0
      })
    }

    const overtime = overtimeByEmployee.get(empId)
    overtime.overtimeShifts++
    overtime.overtimeHours += 8 // Assuming 8-hour shifts
    overtime.costEstimate += 8 * 25 * 1.5 // $25/hour * 1.5 overtime rate
  })

  const overtimeData = Array.from(overtimeByEmployee.values())
    .sort((a, b) => b.overtimeHours - a.overtimeHours)

  return NextResponse.json({
    success: true,
    data: {
      period: { startDate, endDate },
      employees: overtimeData,
      summary: {
        totalOvertimeHours: overtimeData.reduce((sum, emp) => sum + emp.overtimeHours, 0),
        totalOvertimeShifts: overtimeData.reduce((sum, emp) => sum + emp.overtimeShifts, 0),
        estimatedCost: Math.round(overtimeData.reduce((sum, emp) => sum + emp.costEstimate, 0)),
        averageOvertimePerEmployee: Math.round((overtimeData.reduce((sum, emp) => sum + emp.overtimeHours, 0) / Math.max(1, overtimeData.length)) * 10) / 10
      }
    }
  })
}

async function generateAttendanceReport(supabase: any, employee: any, startDate: string, endDate: string) {
  // Get all scheduled assignments
  const { data: scheduled } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      employee:employees (
        id,
        name,
        employee_code
      )
    `)
    .eq('tenant_id', employee.tenant_id)
    .gte('date', startDate)
    .lte('date', endDate)

  // Get absences
  const { data: absences } = await supabase
    .from('absences')
    .select(`
      *,
      employee:employees (
        id,
        name,
        employee_code
      )
    `)
    .eq('tenant_id', employee.tenant_id)
    .gte('date', startDate)
    .lte('date', endDate)

  const attendanceByEmployee = new Map()

  // Initialize with scheduled shifts
  scheduled?.forEach(assignment => {
    const empId = assignment.employee_id
    if (!attendanceByEmployee.has(empId)) {
      attendanceByEmployee.set(empId, {
        employee: assignment.employee,
        scheduledShifts: 0,
        attendedShifts: 0,
        absences: 0,
        attendanceRate: 100
      })
    }
    attendanceByEmployee.get(empId).scheduledShifts++
    attendanceByEmployee.get(empId).attendedShifts++ // Assume attended unless absent
  })

  // Subtract absences
  absences?.forEach(absence => {
    const empId = absence.employee_id
    if (attendanceByEmployee.has(empId)) {
      const attendance = attendanceByEmployee.get(empId)
      attendance.absences++
      attendance.attendedShifts = Math.max(0, attendance.attendedShifts - 1)
    }
  })

  // Calculate attendance rates
  attendanceByEmployee.forEach(attendance => {
    attendance.attendanceRate = attendance.scheduledShifts > 0 
      ? Math.round((attendance.attendedShifts / attendance.scheduledShifts) * 100 * 10) / 10
      : 100
  })

  const attendanceData = Array.from(attendanceByEmployee.values())
    .sort((a, b) => a.attendanceRate - b.attendanceRate)

  return NextResponse.json({
    success: true,
    data: {
      period: { startDate, endDate },
      employees: attendanceData,
      summary: {
        averageAttendanceRate: Math.round((attendanceData.reduce((sum, emp) => sum + emp.attendanceRate, 0) / Math.max(1, attendanceData.length)) * 10) / 10,
        totalAbsences: attendanceData.reduce((sum, emp) => sum + emp.absences, 0),
        totalScheduledShifts: attendanceData.reduce((sum, emp) => sum + emp.scheduledShifts, 0),
        perfectAttendanceEmployees: attendanceData.filter(emp => emp.attendanceRate === 100).length
      }
    }
  })
}

async function generateFatigueReport(supabase: any, employee: any, startDate: string, endDate: string) {
  // Analyze consecutive work patterns and night shifts
  const { data: assignments } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      employee:employees (
        id,
        name,
        employee_code
      ),
      shift_template:shift_templates (
        type
      )
    `)
    .eq('tenant_id', employee.tenant_id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('employee_id')
    .order('date')

  const fatigueMetrics = new Map()

  // Group by employee
  const employeeAssignments = new Map()
  assignments?.forEach(assignment => {
    const empId = assignment.employee_id
    if (!employeeAssignments.has(empId)) {
      employeeAssignments.set(empId, [])
    }
    employeeAssignments.get(empId).push(assignment)
  })

  employeeAssignments.forEach((empAssignments, empId) => {
    const employee = empAssignments[0].employee
    
    const consecutiveDays = 0
    let maxConsecutiveDays = 0
    const consecutiveNights = 0
    let maxConsecutiveNights = 0
    let totalNightShifts = 0
    let currentStreak = 0
    let nightStreak = 0

    // Sort by date
    const sortedAssignments = empAssignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    for (let i = 0; i < sortedAssignments.length; i++) {
      const assignment = sortedAssignments[i]
      const isNight = assignment.shift_template.type === 'night'
      
      if (isNight) {
        totalNightShifts++
        nightStreak++
        maxConsecutiveNights = Math.max(maxConsecutiveNights, nightStreak)
      } else {
        nightStreak = 0
      }

      // Check if consecutive day
      if (i === 0) {
        currentStreak = 1
      } else {
        const prevDate = new Date(sortedAssignments[i - 1].date)
        const currDate = new Date(assignment.date)
        const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dayDiff === 1) {
          currentStreak++
        } else {
          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak)
          currentStreak = 1
        }
      }
    }
    
    maxConsecutiveDays = Math.max(maxConsecutiveDays, currentStreak)

    // Calculate fatigue score (higher = more fatigue risk)
    let fatigueScore = 0
    fatigueScore += Math.max(0, maxConsecutiveDays - 5) * 10 // Penalty for >5 consecutive days
    fatigueScore += Math.max(0, maxConsecutiveNights - 2) * 20 // Penalty for >2 consecutive nights
    fatigueScore += Math.min(totalNightShifts * 2, 50) // Night shift penalty

    const riskLevel = fatigueScore >= 60 ? 'high' : fatigueScore >= 30 ? 'medium' : 'low'

    fatigueMetrics.set(empId, {
      employee,
      maxConsecutiveDays,
      maxConsecutiveNights,
      totalNightShifts,
      fatigueScore,
      riskLevel
    })
  })

  const fatigueData = Array.from(fatigueMetrics.values())
    .sort((a, b) => b.fatigueScore - a.fatigueScore)

  return NextResponse.json({
    success: true,
    data: {
      period: { startDate, endDate },
      employees: fatigueData,
      summary: {
        highRiskEmployees: fatigueData.filter(emp => emp.riskLevel === 'high').length,
        mediumRiskEmployees: fatigueData.filter(emp => emp.riskLevel === 'medium').length,
        lowRiskEmployees: fatigueData.filter(emp => emp.riskLevel === 'low').length,
        averageFatigueScore: Math.round((fatigueData.reduce((sum, emp) => sum + emp.fatigueScore, 0) / Math.max(1, fatigueData.length)) * 10) / 10,
        maxConsecutiveDaysOverall: Math.max(...fatigueData.map(emp => emp.maxConsecutiveDays), 0),
        maxConsecutiveNightsOverall: Math.max(...fatigueData.map(emp => emp.maxConsecutiveNights), 0)
      }
    }
  })
}

async function generateDashboardMetrics(supabase: any, employee: any) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Today's metrics
  const { data: todayAssignments } = await supabase
    .from('schedule_assignments')
    .select('*, shift_template:shift_templates(type)')
    .eq('tenant_id', employee.tenant_id)
    .eq('date', today)

  const { data: pendingSwaps } = await supabase
    .from('swap_requests')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .eq('status', 'pending')

  const { data: pendingLeaves } = await supabase
    .from('leaves')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .eq('status', 'pending')

  // Weekly trends
  const { data: weeklyOvertime } = await supabase
    .from('schedule_assignments')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .eq('is_overtime', true)
    .gte('date', weekAgo)

  // Monthly metrics
  const { data: monthlyAbsences } = await supabase
    .from('absences')
    .select('*')
    .eq('tenant_id', employee.tenant_id)
    .gte('date', monthAgo)

  return NextResponse.json({
    success: true,
    data: {
      today: {
        workingEmployees: todayAssignments?.length || 0,
        nightShiftWorkers: todayAssignments?.filter(a => a.shift_template?.type === 'night').length || 0,
        dayShiftWorkers: todayAssignments?.filter(a => a.shift_template?.type === 'day').length || 0,
        eveningShiftWorkers: todayAssignments?.filter(a => a.shift_template?.type === 'evening').length || 0
      },
      pending: {
        swapRequests: pendingSwaps?.length || 0,
        leaveRequests: pendingLeaves?.length || 0
      },
      trends: {
        weeklyOvertimeHours: (weeklyOvertime?.length || 0) * 8,
        monthlyAbsences: monthlyAbsences?.length || 0
      },
      alerts: {
        highFatigueRisk: 0, // Would need complex calculation
        consecutiveNightWorkers: 0 // Would need analysis
      }
    }
  })
}
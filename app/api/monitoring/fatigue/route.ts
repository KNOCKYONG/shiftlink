import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const employeeId = searchParams.get('employeeId')
    const teamId = searchParams.get('teamId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role, team_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Determine target based on parameters
    const targetEmployeeId = employeeId || currentEmployee.id
    
    // Check permissions
    if (targetEmployeeId !== currentEmployee.id) {
      if (!['admin', 'manager'].includes(currentEmployee.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // If team ID provided, get team average
    if (teamId) {
      const { data: teamMetrics } = await supabase
        .from('fatigue_metrics')
        .select('*')
        .eq('tenant_id', currentEmployee.tenant_id)
        .eq('calculation_date', date)
        .in('employee_id', 
          supabase
            .from('employees')
            .select('id')
            .eq('team_id', teamId)
        )

      if (teamMetrics && teamMetrics.length > 0) {
        // Calculate team averages
        const avgFatigueScore = teamMetrics.reduce((sum, m) => sum + m.fatigue_score, 0) / teamMetrics.length
        const avgConsecutiveNights = teamMetrics.reduce((sum, m) => sum + m.consecutive_night_shifts, 0) / teamMetrics.length
        const avgConsecutiveDays = teamMetrics.reduce((sum, m) => sum + m.consecutive_work_days, 0) / teamMetrics.length

        return NextResponse.json({
          success: true,
          data: {
            fatigue_score: avgFatigueScore,
            risk_level: avgFatigueScore < 3 ? 'low' : avgFatigueScore < 6 ? 'moderate' : avgFatigueScore < 8 ? 'high' : 'critical',
            consecutive_night_shifts: Math.round(avgConsecutiveNights),
            consecutive_work_days: Math.round(avgConsecutiveDays),
            hours_worked_7days: 0, // Would need calculation
            hours_worked_30days: 0, // Would need calculation
            factors: {
              night_shift_ratio: 0,
              overtime_ratio: 0,
              rest_time_average: 11,
              shift_pattern_changes: 0,
              weekend_work_count: 0
            },
            recommendations: [],
            trend: 'stable'
          }
        })
      }
    }

    // Fetch individual fatigue metrics
    const { data: fatigueData, error } = await supabase
      .from('fatigue_metrics')
      .select('*')
      .eq('employee_id', targetEmployeeId)
      .eq('calculation_date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no data, calculate from schedule assignments
    if (!fatigueData) {
      // Get recent schedule assignments
      const endDate = new Date(date)
      const startDate7Days = new Date(date)
      startDate7Days.setDate(endDate.getDate() - 7)
      const startDate30Days = new Date(date)
      startDate30Days.setDate(endDate.getDate() - 30)

      const { data: recentAssignments } = await supabase
        .from('schedule_assignments')
        .select(`
          *,
          schedule:schedule_id(schedule_date)
        `)
        .eq('employee_id', targetEmployeeId)
        .gte('schedule.schedule_date', startDate30Days.toISOString().split('T')[0])
        .lte('schedule.schedule_date', endDate.toISOString().split('T')[0])
        .eq('status', 'confirmed')
        .order('schedule.schedule_date', { ascending: false })

      // Calculate metrics
      let consecutiveNights = 0
      let consecutiveDays = 0
      let hours7Days = 0
      let hours30Days = 0
      let nightShiftCount = 0
      let totalShifts = 0
      let weekendWorkCount = 0

      recentAssignments?.forEach(assignment => {
        const assignmentDate = new Date(assignment.schedule.schedule_date)
        const daysDiff = Math.floor((endDate.getTime() - assignmentDate.getTime()) / (1000 * 60 * 60 * 24))
        
        totalShifts++
        const shiftHours = 8 // Default

        if (daysDiff <= 7) {
          hours7Days += shiftHours
        }
        hours30Days += shiftHours

        if (assignment.shift_type === 'night') {
          nightShiftCount++
        }

        // Check weekend
        if (assignmentDate.getDay() === 0 || assignmentDate.getDay() === 6) {
          weekendWorkCount++
        }
      })

      // Calculate consecutive counts
      let currentNightStreak = 0
      let currentWorkStreak = 0
      let lastDate: Date | null = null

      recentAssignments?.forEach(assignment => {
        const assignmentDate = new Date(assignment.schedule.schedule_date)
        
        if (!lastDate || (lastDate.getTime() - assignmentDate.getTime()) === 86400000) {
          if (assignment.shift_type !== 'off') {
            currentWorkStreak++
            consecutiveDays = Math.max(consecutiveDays, currentWorkStreak)
          } else {
            currentWorkStreak = 0
          }

          if (assignment.shift_type === 'night') {
            currentNightStreak++
            consecutiveNights = Math.max(consecutiveNights, currentNightStreak)
          } else {
            currentNightStreak = 0
          }
        } else {
          currentWorkStreak = assignment.shift_type !== 'off' ? 1 : 0
          currentNightStreak = assignment.shift_type === 'night' ? 1 : 0
        }
        
        lastDate = assignmentDate
      })

      // Calculate fatigue score
      const nightRatio = totalShifts > 0 ? nightShiftCount / totalShifts : 0
      const overtimeRatio = hours7Days > 40 ? (hours7Days - 40) / 40 : 0
      
      let fatigueScore = 0
      fatigueScore += consecutiveNights * 1.5
      fatigueScore += Math.max(0, consecutiveDays - 5) * 0.5
      fatigueScore += hours7Days > 52 ? 2 : 0
      fatigueScore += hours30Days > 200 ? 1 : 0
      fatigueScore += nightRatio * 3
      fatigueScore += overtimeRatio * 2
      fatigueScore = Math.min(10, fatigueScore)

      // Determine risk level
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical'
      if (fatigueScore < 3) riskLevel = 'low'
      else if (fatigueScore < 6) riskLevel = 'moderate'
      else if (fatigueScore < 8) riskLevel = 'high'
      else riskLevel = 'critical'

      // Generate recommendations
      const recommendations = []
      if (consecutiveNights >= 3) {
        recommendations.push('연속 야간 근무를 줄이고 충분한 휴식을 취하세요')
      }
      if (consecutiveDays >= 7) {
        recommendations.push('연속 근무일이 많습니다. 휴무를 신청하는 것을 권장합니다')
      }
      if (hours7Days > 52) {
        recommendations.push('주간 근무시간이 법정 한도를 초과했습니다')
      }
      if (nightRatio > 0.3) {
        recommendations.push('야간 근무 비율이 높습니다. 수면 패턴 관리에 주의하세요')
      }

      // Determine trend (would need historical data for real trend)
      const trend = fatigueScore > 6 ? 'worsening' : fatigueScore < 3 ? 'improving' : 'stable'

      return NextResponse.json({
        success: true,
        data: {
          fatigue_score: parseFloat(fatigueScore.toFixed(1)),
          risk_level: riskLevel,
          consecutive_night_shifts: consecutiveNights,
          consecutive_work_days: consecutiveDays,
          hours_worked_7days: hours7Days,
          hours_worked_30days: hours30Days,
          factors: {
            night_shift_ratio: nightRatio,
            overtime_ratio: overtimeRatio,
            rest_time_average: 11, // Default estimate
            shift_pattern_changes: 0, // Would need more complex calculation
            weekend_work_count: weekendWorkCount
          },
          recommendations,
          trend
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: fatigueData
    })

  } catch (error) {
    console.error('Error fetching fatigue data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch fatigue data' 
    }, { status: 500 })
  }
}

// Update fatigue metrics
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

    // Only admins and managers can update fatigue metrics
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      employee_id,
      calculation_date,
      ...metricsData
    } = body

    // Upsert fatigue metrics
    const { data, error } = await supabase
      .from('fatigue_metrics')
      .upsert({
        employee_id,
        tenant_id: currentEmployee.tenant_id,
        calculation_date,
        ...metricsData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Check if alert needed
    if (metricsData.risk_level === 'critical' || metricsData.fatigue_score >= 8) {
      await supabase.from('monitoring_alerts').insert({
        tenant_id: currentEmployee.tenant_id,
        alert_type: 'fatigue_critical',
        severity: 'critical',
        metric_type: 'fatigue_score',
        metric_value: metricsData.fatigue_score,
        threshold_value: 8,
        affected_entity_type: 'employee',
        affected_entity_id: employee_id,
        title: '높은 피로도 경고',
        message: `직원의 피로도 점수가 위험 수준(${metricsData.fatigue_score}/10)에 도달했습니다. 즉시 조치가 필요합니다.`,
        status: 'active'
      })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Error updating fatigue data:', error)
    return NextResponse.json({ 
      error: 'Failed to update fatigue data' 
    }, { status: 500 })
  }
}
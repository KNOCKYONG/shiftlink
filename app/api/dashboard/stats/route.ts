import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 현재 사용자 확인
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

    // 병렬로 여러 통계 데이터 조회
    const [
      todayScheduleResult,
      leaveRequestsResult,
      swapRequestsResult,
      nightShiftWorkersResult,
      overtimeWarningsResult,
      recentNotificationsResult
    ] = await Promise.all([
      // 1. 오늘 근무 인원 및 공백 인원
      supabase
        .from('schedule_assignments')
        .select(`
          *,
          employees(id, name, employee_code)
        `)
        .eq('date', date)
        .in('employees.tenant_id', [currentEmployee.tenant_id]),

      // 2. 보류 중인 휴가 요청
      supabase
        .from('leaves')
        .select('*')
        .eq('status', 'pending')
        .gte('start_date', date),

      // 3. 보류 중인 교환 요청
      supabase
        .from('swap_requests')
        .select(`
          *,
          requester:requester_id(name),
          target_employee:target_employee_id(name)
        `)
        .eq('status', 'pending'),

      // 4. 연속 야간 근무자 (최근 3일)
      supabase
        .from('schedule_assignments')
        .select(`
          employee_id,
          date,
          shift_type,
          employees(name)
        `)
        .eq('shift_type', 'night')
        .gte('date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('date', date)
        .order('employee_id, date'),

      // 5. 초과근무 경고 (주 52시간 초과 예정자)
      supabase.rpc('get_overtime_warnings', {
        target_date: date,
        tenant_id: currentEmployee.tenant_id
      }),

      // 6. 최근 알림 (읽지 않은 것만)
      supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentEmployee.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // 오늘 근무 현황 분석
    const todayAssignments = todayScheduleResult.data || []
    const totalScheduled = todayAssignments.length
    const actualWorking = todayAssignments.filter(a => a.status === 'confirmed').length
    const dayShift = todayAssignments.filter(a => a.shift_type === 'day').length
    const eveningShift = todayAssignments.filter(a => a.shift_type === 'evening').length
    const nightShift = todayAssignments.filter(a => a.shift_type === 'night').length
    const offDuty = todayAssignments.filter(a => a.shift_type === 'off').length

    // 연속 야간 근무자 분석
    const nightShiftData = nightShiftWorkersResult.data || []
    const consecutiveNightWorkers = analyzeConsecutiveNightWorkers(nightShiftData)

    // 통계 데이터 구성
    const stats = {
      // KPI 카드 데이터
      kpi: {
        todayWorking: {
          count: actualWorking,
          total: totalScheduled,
          percentage: totalScheduled > 0 ? Math.round((actualWorking / totalScheduled) * 100) : 0,
          breakdown: {
            day: dayShift,
            evening: eveningShift,
            night: nightShift,
            off: offDuty
          }
        },
        pendingLeaves: {
          count: leaveRequestsResult.data?.length || 0,
          urgent: leaveRequestsResult.data?.filter(l => 
            new Date(l.start_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ).length || 0
        },
        consecutiveNightWorkers: {
          count: consecutiveNightWorkers.length,
          workers: consecutiveNightWorkers.slice(0, 3), // 상위 3명만
          maxConsecutive: Math.max(...consecutiveNightWorkers.map(w => w.consecutiveDays), 0)
        },
        overtimeWarnings: {
          count: overtimeWarningsResult.data?.length || 0,
          critical: overtimeWarningsResult.data?.filter(w => w.projected_hours > 60).length || 0
        }
      },

      // 교환 요청 데이터
      swapRequests: {
        pending: swapRequestsResult.data?.slice(0, 5) || [],
        total: swapRequestsResult.data?.length || 0
      },

      // 알림 데이터
      notifications: {
        unread: recentNotificationsResult.data || [],
        count: recentNotificationsResult.data?.length || 0
      },

      // 오늘 스케줄 상세
      todaySchedule: todayAssignments.map(assignment => ({
        id: assignment.id,
        employeeName: assignment.employees?.name || 'Unknown',
        employeeCode: assignment.employees?.employee_code,
        shiftType: assignment.shift_type,
        status: assignment.status,
        startTime: assignment.start_time,
        endTime: assignment.end_time
      }))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard statistics' 
    }, { status: 500 })
  }
}

// 연속 야간 근무자 분석 함수
function analyzeConsecutiveNightWorkers(nightShiftData: any[]) {
  const workerMap = new Map()

  // 직원별로 그룹화
  nightShiftData.forEach(shift => {
    const employeeId = shift.employee_id
    if (!workerMap.has(employeeId)) {
      workerMap.set(employeeId, {
        employeeId,
        name: shift.employees?.name,
        dates: []
      })
    }
    workerMap.get(employeeId).dates.push(shift.date)
  })

  // 연속 근무일 계산
  const consecutiveWorkers = []
  workerMap.forEach(worker => {
    const sortedDates = worker.dates.sort()
    let maxConsecutive = 0
    let currentConsecutive = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currentDate = new Date(sortedDates[i])
      const dayDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

      if (dayDiff === 1) {
        currentConsecutive++
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
        currentConsecutive = 1
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive)

    if (maxConsecutive >= 3) { // 3일 이상 연속 근무자만
      consecutiveWorkers.push({
        ...worker,
        consecutiveDays: maxConsecutive
      })
    }
  })

  return consecutiveWorkers.sort((a, b) => b.consecutiveDays - a.consecutiveDays)
}
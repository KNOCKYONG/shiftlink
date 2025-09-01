import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

export interface CreateSwapRequest {
  schedule_assignment_id: string
  target_employee_id: string
  reason: string
  is_emergency?: boolean
}

export interface SwapCandidate {
  employee_id: string
  employee_name: string
  current_assignment_id: string
  current_shift_type: string
  current_shift_time: string
  compatibility_score: number
  potential_issues: string[]
}

// 교환 가능한 후보자 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = createClient()

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignment_id')

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignment_id가 필요합니다.' },
        { status: 400 }
      )
    }

    // 요청자의 배정 정보 조회
    const { data: assignment, error: assignmentError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        shift_templates(name, type, start_time, end_time),
        schedules(*)
      `)
      .eq('id', assignmentId)
      .eq('employee_id', user.employeeId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: '배정을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      )
    }

    // 같은 날짜의 다른 직원들의 배정 조회
    const { data: candidates, error: candidatesError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        employees(id, name, email, experience_level),
        shift_templates(name, type, start_time, end_time)
      `)
      .eq('date', assignment.date)
      .eq('tenant_id', user.tenantId)
      .neq('employee_id', user.employeeId) // 본인 제외
      .eq('is_confirmed', false) // 확정되지 않은 배정만

    if (candidatesError) {
      console.error('Candidates fetch error:', candidatesError)
      return NextResponse.json(
        { error: '후보자 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 교환 가능성 평가 및 후보자 목록 생성
    const swapCandidates: SwapCandidate[] = []

    for (const candidate of candidates || []) {
      // 호환성 점수 계산
      const compatibilityScore = calculateCompatibilityScore(
        assignment,
        candidate,
        user
      )

      // 잠재적 이슈 체크
      const potentialIssues = await checkPotentialIssues(
        supabase,
        assignment,
        candidate,
        user.tenantId
      )

      swapCandidates.push({
        employee_id: candidate.employee_id,
        employee_name: candidate.employees?.name || '알 수 없음',
        current_assignment_id: candidate.id,
        current_shift_type: candidate.shift_templates?.type || 'unknown',
        current_shift_time: `${candidate.shift_templates?.start_time} - ${candidate.shift_templates?.end_time}`,
        compatibility_score: compatibilityScore,
        potential_issues: potentialIssues
      })
    }

    // 호환성 점수로 정렬
    swapCandidates.sort((a, b) => b.compatibility_score - a.compatibility_score)

    return NextResponse.json({
      candidates: swapCandidates,
      requester_assignment: {
        id: assignment.id,
        date: assignment.date,
        shift_type: assignment.shift_templates?.type || 'unknown',
        shift_time: `${assignment.shift_templates?.start_time} - ${assignment.shift_templates?.end_time}`,
        employee_id: user.employeeId
      }
    })

  } catch (error) {
    console.error('교환 후보자 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 교환 요청 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = createClient()

    const body: CreateSwapRequest = await request.json()
    const {
      schedule_assignment_id,
      target_employee_id,
      reason,
      is_emergency = false
    } = body

    // 입력 검증
    if (!schedule_assignment_id || !target_employee_id || !reason.trim()) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 자기 자신과는 교환 불가
    if (target_employee_id === user.employeeId) {
      return NextResponse.json(
        { error: '자기 자신과는 교환할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 요청자의 배정 확인
    const { data: requesterAssignment, error: requesterError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        schedules(*),
        shift_templates(name, type, start_time, end_time)
      `)
      .eq('id', schedule_assignment_id)
      .eq('employee_id', user.employeeId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (requesterError || !requesterAssignment) {
      return NextResponse.json(
        { error: '해당 배정을 찾을 수 없거나 권한이 없습니다.' },
        { status: 404 }
      )
    }

    // 대상자의 같은 날짜 배정 확인
    const { data: targetAssignment, error: targetError } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        employees(name, email),
        shift_templates(name, type, start_time, end_time)
      `)
      .eq('employee_id', target_employee_id)
      .eq('date', requesterAssignment.date)
      .eq('tenant_id', user.tenantId)
      .single()

    if (targetError || !targetAssignment) {
      return NextResponse.json(
        { error: '대상자의 해당 날짜 배정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 기존 교환 요청 중복 확인
    const { data: existingRequest } = await supabase
      .from('swap_requests')
      .select('id, status')
      .eq('requester_assignment_id', schedule_assignment_id)
      .eq('target_assignment_id', targetAssignment.id)
      .in('status', ['pending', 'accepted'])
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: '이미 동일한 교환 요청이 진행 중입니다.' },
        { status: 400 }
      )
    }

    // 교환 요청 생성
    const { data: swapRequest, error: swapError } = await supabase
      .from('swap_requests')
      .insert({
        requester_id: user.employeeId,
        target_id: target_employee_id,
        requester_assignment_id: schedule_assignment_id,
        target_assignment_id: targetAssignment.id,
        reason,
        is_emergency,
        status: 'pending',
        tenant_id: user.tenantId
      })
      .select()
      .single()

    if (swapError) {
      console.error('Swap request creation error:', swapError)
      return NextResponse.json(
        { error: '교환 요청 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 알림 생성 (대상자에게)
    await supabase.from('notifications').insert({
      tenant_id: user.tenantId,
      user_id: target_employee_id,
      title: '근무 교환 요청',
      message: `${user.name}님이 ${requesterAssignment.date} ${getShiftName(requesterAssignment.shift_templates?.type)}와 교환을 요청했습니다.`,
      type: is_emergency ? 'swap_request_emergency' : 'swap_request',
      related_id: swapRequest.id,
      is_read: false
    })

    // 응급 요청의 경우 관리자에게도 알림
    if (is_emergency) {
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', user.tenantId)
        .in('role', ['admin', 'manager'])
        .eq('is_active', true)

      if (managers && managers.length > 0) {
        const managerNotifications = managers.map(manager => ({
          tenant_id: user.tenantId,
          user_id: manager.id,
          title: '응급 교환 요청',
          message: `${user.name}님이 응급 근무 교환을 요청했습니다. (${requesterAssignment.date})`,
          type: 'swap_request_emergency',
          related_id: swapRequest.id,
          is_read: false
        }))

        await supabase.from('notifications').insert(managerNotifications)
      }
    }

    // 감사 로그
    await supabase.from('audit_logs').insert({
      tenant_id: user.tenantId,
      user_id: user.employeeId,
      action: 'swap_request_created',
      resource_type: 'swap_request',
      resource_id: swapRequest.id,
      details: {
        requester_assignment_id: schedule_assignment_id,
        target_assignment_id: targetAssignment.id,
        date: requesterAssignment.date,
        is_emergency,
        reason_length: reason.length
      }
    })

    return NextResponse.json({
      success: true,
      swap_request_id: swapRequest.id,
      message: is_emergency 
        ? '응급 교환 요청이 접수되어 관리자에게 즉시 알림되었습니다.' 
        : '교환 요청이 성공적으로 전송되었습니다.',
      target_employee_name: targetAssignment.employees?.name
    })

  } catch (error) {
    console.error('교환 요청 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 호환성 점수 계산
function calculateCompatibilityScore(requesterAssignment: any, candidateAssignment: any, user: any): number {
  let score = 100

  // 경험 수준 차이 (20점)
  const experienceDiff = Math.abs(
    (requesterAssignment.experience_level || 0) - (candidateAssignment.employees?.experience_level || 0)
  )
  score -= Math.min(experienceDiff * 5, 20)

  // 교대 유형 호환성 (30점)
  const requesterShift = requesterAssignment.shift_templates?.type
  const candidateShift = candidateAssignment.shift_templates?.type

  // 같은 교대 -> 매우 좋음
  if (requesterShift === candidateShift) {
    score -= 0
  }
  // 데이-이브닝, 이브닝-나이트 -> 보통
  else if (
    (requesterShift === 'day' && candidateShift === 'evening') ||
    (requesterShift === 'evening' && candidateShift === 'night') ||
    (requesterShift === 'evening' && candidateShift === 'day') ||
    (requesterShift === 'night' && candidateShift === 'evening')
  ) {
    score -= 15
  }
  // 데이-나이트 -> 어려움 (한국 간호사 스케줄링에서 특히 피해야 할 패턴)
  else if (
    (requesterShift === 'day' && candidateShift === 'night') ||
    (requesterShift === 'night' && candidateShift === 'day')
  ) {
    score -= 25
  }
  // 오프와의 교환 -> 좋음
  else if (requesterShift === 'off' || candidateShift === 'off') {
    score -= 5
  }
  else {
    score -= 30
  }

  return Math.max(0, Math.min(100, score))
}

// 잠재적 이슈 체크
async function checkPotentialIssues(
  supabase: any,
  requesterAssignment: any,
  candidateAssignment: any,
  tenantId: string
): Promise<string[]> {
  const issues: string[] = []

  // 연속 야간 근무 체크 (한국 간호사 특수 상황)
  const date = new Date(requesterAssignment.date)
  
  // 전후 7일간의 배정 확인 (한국 간호사 스케줄링 특성)
  const checkDates = []
  for (let i = -7; i <= 7; i++) {
    const checkDate = new Date(date)
    checkDate.setDate(date.getDate() + i)
    checkDates.push(checkDate.toISOString().split('T')[0])
  }

  const { data: surroundingAssignments } = await supabase
    .from('schedule_assignments')
    .select('date, employee_id, shift_templates(type)')
    .in('date', checkDates)
    .in('employee_id', [candidateAssignment.employee_id])
    .eq('tenant_id', tenantId)

  // 연속 야간 체크
  if (surroundingAssignments) {
    const candidateNightShifts = surroundingAssignments
      .filter((a: any) => a.employee_id === candidateAssignment.employee_id && a.shift_templates?.type === 'night')
      .length

    if (candidateNightShifts >= 3) {
      issues.push('대상자가 이미 과도한 야간 근무 중입니다. (건강상 위험)')
    } else if (candidateNightShifts >= 2) {
      issues.push('대상자가 연속 야간 근무 중입니다.')
    }

    // 데이나오 패턴 체크 (Day-Night-Off - 한국 간호사들이 가장 피하는 패턴)
    const sortedAssignments = surroundingAssignments
      .filter((a: any) => a.employee_id === candidateAssignment.employee_id)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
    
    for (let i = 0; i < sortedAssignments.length - 2; i++) {
      const pattern = [
        sortedAssignments[i].shift_templates?.type,
        sortedAssignments[i + 1].shift_templates?.type,
        sortedAssignments[i + 2].shift_templates?.type
      ].join('-')
      
      if (['day-night-off', 'night-day-evening', 'evening-night-day'].includes(pattern)) {
        issues.push('위험한 "데이나오" 패턴이 발생할 수 있습니다.')
        break
      }
    }
  }

  return issues
}

function getShiftName(shiftType?: string): string {
  switch (shiftType) {
    case 'day': return '데이'
    case 'evening': return '이브닝'
    case 'night': return '나이트'
    case 'off': return '오프'
    default: return '알 수 없음'
  }
}
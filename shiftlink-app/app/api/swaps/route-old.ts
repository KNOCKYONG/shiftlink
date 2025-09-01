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
    if (target_employee_id === currentEmployee.id) {
      return NextResponse.json({ 
        error: 'Cannot create swap request with yourself' 
      }, { status: 400 })
    }

    // 대상 직원이 같은 테넌트인지 확인
    const { data: targetEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, team_id, name')
      .eq('id', target_employee_id)
      .single()

    if (!targetEmployee || targetEmployee.tenant_id !== currentEmployee.tenant_id) {
      return NextResponse.json({ 
        error: 'Target employee not found or not in same organization' 
      }, { status: 404 })
    }

    // 해당 일정이 실제로 존재하는지 확인
    const [originalAssignment, targetAssignment] = await Promise.all([
      supabase
        .from('schedule_assignments')
        .select('*')
        .eq('employee_id', currentEmployee.id)
        .eq('date', original_date)
        .eq('shift_type', original_shift_type)
        .single(),
      
      supabase
        .from('schedule_assignments')
        .select('*')
        .eq('employee_id', target_employee_id)
        .eq('date', target_date)
        .eq('shift_type', target_shift_type)
        .single()
    ])

    if (originalAssignment.error) {
      return NextResponse.json({ 
        error: `You don't have a ${original_shift_type} shift on ${original_date}` 
      }, { status: 400 })
    }

    if (targetAssignment.error) {
      return NextResponse.json({ 
        error: `Target employee doesn't have a ${target_shift_type} shift on ${target_date}` 
      }, { status: 400 })
    }

    // 이미 교환 요청이 있는지 확인 (중복 방지)
    const { data: existingRequest } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('requester_id', currentEmployee.id)
      .eq('target_employee_id', target_employee_id)
      .eq('original_date', original_date)
      .eq('target_date', target_date)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'A swap request already exists for these shifts' 
      }, { status: 400 })
    }

    // 교환 설정 확인
    const { data: swapSettings } = await supabase
      .from('swap_settings')
      .select('*')
      .eq('tenant_id', currentEmployee.tenant_id)
      .single()

    // 자동 승인 여부 확인
    let initialStatus = 'pending'
    let autoApproved = false

    if (swapSettings && !swapSettings.admin_approval_required) {
      // 자동 승인 조건 확인
      const { data: shouldAutoApprove } = await supabase
        .rpc('should_auto_approve_swap', {
          p_requester_id: currentEmployee.id,
          p_target_id: target_employee_id,
          p_original_date: original_date,
          p_target_date: target_date
        })

      if (shouldAutoApprove) {
        initialStatus = 'target_accepted'
        autoApproved = true
      }
    }

    // 교환 요청 생성
    const { data: swapRequest, error: swapError } = await supabase
      .from('swap_requests')
      .insert({
        requester_id: currentEmployee.id,
        target_employee_id: target_employee_id,
        original_assignment_id: originalAssignment.data.id,
        target_assignment_id: targetAssignment.data.id,
        original_date,
        original_shift_type,
        target_date,
        target_shift_type,
        message: message || null,
        status: initialStatus,
        ...(autoApproved && { target_accepted_at: new Date().toISOString() })
      })
      .select(`
        *,
        requester:requester_id(name),
        target_employee:target_employee_id(name)
      `)
      .single()

    if (swapError) throw swapError

    // 대상 직원에게 알림 생성
    await supabase.from('notifications').insert({
      tenant_id: currentEmployee.tenant_id,
      recipient_id: target_employee_id,
      type: 'swap_request',
      title: '교환 요청이 도착했습니다',
      message: `${currentEmployee.name}님이 ${original_date} ${getShiftTypeName(original_shift_type)} 근무와 ${target_date} ${getShiftTypeName(target_shift_type)} 근무 교환을 요청했습니다.`,
      data: {
        swap_request_id: swapRequest.id,
        requester_name: currentEmployee.name,
        original_date,
        original_shift_type,
        target_date,
        target_shift_type
      }
    })

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'swap_request_created',
      resource_type: 'swap_request',
      resource_id: swapRequest.id,
      details: {
        target_employee: targetEmployee.name,
        original_date,
        original_shift_type,
        target_date,
        target_shift_type
      }
    })

    return NextResponse.json({
      success: true,
      swapRequest,
      message: 'Swap request created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating swap request:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create swap request' 
    }, { status: 500 })
  }
}

function getShiftTypeName(shiftType: string): string {
  const names: Record<string, string> = {
    'day': '주간',
    'evening': '오후',
    'night': '야간',
    'off': '휴무'
  }
  return names[shiftType] || shiftType
}
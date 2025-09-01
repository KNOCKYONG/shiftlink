import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 특정 교환 요청 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

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

    const { data: swapRequest, error } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:requester_id(id, name, employee_code, team_id),
        target_employee:target_employee_id(id, name, employee_code, team_id)
      `)
      .eq('id', id)
      .single()

    if (error || !swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    // 권한 확인 (본인과 관련된 요청이거나 관리자/매니저)
    const hasAccess = 
      swapRequest.requester_id === currentEmployee.id ||
      swapRequest.target_employee_id === currentEmployee.id ||
      ['admin', 'manager'].includes(currentEmployee.role)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ swapRequest })

  } catch (error) {
    console.error('Error fetching swap request:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch swap request' 
    }, { status: 500 })
  }
}

// 교환 요청 승인/거부
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    const { action, admin_approval_required = false, rejection_reason } = body

    if (!action || !['accept', 'reject', 'approve', 'cancel'].includes(action)) {
      return NextResponse.json({ 
        error: 'Valid action is required (accept, reject, approve, cancel)' 
      }, { status: 400 })
    }

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id, role, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 교환 요청 조회
    const { data: swapRequest, error: fetchError } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:requester_id(id, name),
        target_employee:target_employee_id(id, name)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    if (swapRequest.status !== 'pending' && swapRequest.status !== 'target_accepted') {
      return NextResponse.json({ 
        error: 'Only pending swap requests can be modified' 
      }, { status: 400 })
    }

    // 권한 확인 및 상태 결정
    let newStatus = ''
    let canPerformAction = false

    switch (action) {
      case 'accept':
        // 대상 직원만 수락 가능
        canPerformAction = swapRequest.target_employee_id === currentEmployee.id
        newStatus = admin_approval_required ? 'target_accepted' : 'approved'
        break

      case 'reject':
        // 대상 직원이 거부하거나 요청자가 취소
        canPerformAction = 
          swapRequest.target_employee_id === currentEmployee.id ||
          swapRequest.requester_id === currentEmployee.id
        newStatus = 'rejected'
        break

      case 'cancel':
        // 요청자만 취소 가능
        canPerformAction = swapRequest.requester_id === currentEmployee.id
        newStatus = 'cancelled'
        break

      case 'approve':
        // 관리자/매니저만 최종 승인 가능
        canPerformAction = ['admin', 'manager'].includes(currentEmployee.role)
        newStatus = 'approved'
        break
    }

    if (!canPerformAction) {
      return NextResponse.json({ 
        error: 'You do not have permission to perform this action' 
      }, { status: 403 })
    }

    // 교환 요청 상태 업데이트
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (action === 'accept') {
      updateData.target_accepted_at = new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = currentEmployee.id
    }

    if (['reject', 'cancel'].includes(action) && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('swap_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        requester:requester_id(name),
        target_employee:target_employee_id(name)
      `)
      .single()

    if (updateError) throw updateError

    // 승인된 경우 실제 스케줄 교환 처리
    let scheduleSwapped = false
    if (newStatus === 'approved') {
      await performScheduleSwap(supabase, swapRequest, currentEmployee)
      scheduleSwapped = true
    }

    // 알림 생성
    await createSwapNotifications(supabase, action, swapRequest, currentEmployee, admin_approval_required, rejection_reason)

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: `swap_request_${action}`,
      resource_type: 'swap_request',
      resource_id: id,
      details: {
        original_status: swapRequest.status,
        new_status: newStatus,
        requester_name: swapRequest.requester.name,
        target_name: swapRequest.target_employee.name,
        schedule_swapped: scheduleSwapped,
        ...(rejection_reason && { rejection_reason })
      }
    })

    return NextResponse.json({
      success: true,
      swapRequest: updatedRequest,
      message: getActionMessage(action, newStatus),
      schedule_swapped: scheduleSwapped
    })

  } catch (error) {
    console.error('Error processing swap request:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process swap request' 
    }, { status: 500 })
  }
}

// 실제 스케줄 교환 처리 함수
async function performScheduleSwap(supabase: any, swapRequest: any, currentEmployee: any) {
  try {
    // 두 일정을 서로 교환
    const [updateOriginal, updateTarget] = await Promise.all([
      // 요청자의 원래 일정을 대상자 ID로 변경
      supabase
        .from('schedule_assignments')
        .update({ 
          employee_id: swapRequest.target_employee_id,
          updated_at: new Date().toISOString(),
          updated_by: currentEmployee.id
        })
        .eq('id', swapRequest.original_assignment_id),
      
      // 대상자의 원래 일정을 요청자 ID로 변경
      supabase
        .from('schedule_assignments')
        .update({ 
          employee_id: swapRequest.requester_id,
          updated_at: new Date().toISOString(),
          updated_by: currentEmployee.id
        })
        .eq('id', swapRequest.target_assignment_id)
    ])

    if (updateOriginal.error || updateTarget.error) {
      throw new Error('Failed to swap schedule assignments')
    }

    // 스케줄 버전 생성
    await createScheduleVersion(supabase, swapRequest, currentEmployee)

  } catch (error) {
    console.error('Error performing schedule swap:', error)
    throw error
  }
}

// 스케줄 버전 생성 함수
async function createScheduleVersion(supabase: any, swapRequest: any, currentEmployee: any) {
  try {
    // 현재 스케줄 찾기
    const { data: schedule } = await supabase
      .from('schedules')
      .select('id')
      .gte('start_date', swapRequest.original_date)
      .lte('end_date', swapRequest.original_date)
      .single()

    if (schedule) {
      // 새 버전 생성
      const { data: versions } = await supabase
        .from('schedule_versions')
        .select('version_number')
        .eq('schedule_id', schedule.id)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = (versions?.[0]?.version_number || 0) + 1

      await supabase
        .from('schedule_versions')
        .insert({
          schedule_id: schedule.id,
          version_number: nextVersion,
          created_by: currentEmployee.id,
          change_type: 'swap',
          change_description: `교환 요청 승인: ${swapRequest.original_date} ${swapRequest.original_shift_type} ↔ ${swapRequest.target_date} ${swapRequest.target_shift_type}`,
          snapshot: { 
            swap_request_id: swapRequest.id,
            swapped_assignments: [
              swapRequest.original_assignment_id,
              swapRequest.target_assignment_id
            ]
          },
          affected_employees: [swapRequest.requester_id, swapRequest.target_employee_id],
          is_published: true,
          published_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error creating schedule version:', error)
    // 버전 생성 실패는 교환 자체에 영향을 주지 않음
  }
}

// 알림 생성 함수
async function createSwapNotifications(supabase: any, action: string, swapRequest: any, currentEmployee: any, adminApprovalRequired: boolean, rejectionReason?: string) {
  const notifications = []
  
  switch (action) {
    case 'accept':
      // 요청자에게 수락 알림
      notifications.push({
        tenant_id: currentEmployee.tenant_id,
        recipient_id: swapRequest.requester_id,
        type: 'swap_accepted',
        title: '교환 요청이 수락되었습니다',
        message: adminApprovalRequired 
          ? `${swapRequest.target_employee.name}님이 교환 요청을 수락했습니다. 관리자 승인을 기다리고 있습니다.`
          : `${swapRequest.target_employee.name}님이 교환 요청을 수락했습니다. 교환이 완료되었습니다.`,
        data: { swap_request_id: swapRequest.id, auto_approved: !adminApprovalRequired }
      })

      // 관리자 승인이 필요한 경우 관리자에게 알림
      if (adminApprovalRequired) {
        const { data: managers } = await supabase
          .from('employees')
          .select('id')
          .eq('tenant_id', currentEmployee.tenant_id)
          .in('role', ['admin', 'manager'])

        managers?.forEach(manager => {
          notifications.push({
            tenant_id: currentEmployee.tenant_id,
            recipient_id: manager.id,
            type: 'swap_pending_approval',
            title: '교환 요청 승인 대기',
            message: `${swapRequest.requester.name}님과 ${swapRequest.target_employee.name}님의 교환 요청이 승인을 기다리고 있습니다.`,
            data: { swap_request_id: swapRequest.id }
          })
        })
      }
      break

    case 'approve':
      // 양쪽 직원에게 최종 승인 알림
      notifications.push(
        {
          tenant_id: currentEmployee.tenant_id,
          recipient_id: swapRequest.requester_id,
          type: 'swap_approved',
          title: '교환 요청이 승인되었습니다',
          message: `관리자가 교환 요청을 승인했습니다. 스케줄이 교환되었습니다.`,
          data: { swap_request_id: swapRequest.id }
        },
        {
          tenant_id: currentEmployee.tenant_id,
          recipient_id: swapRequest.target_employee_id,
          type: 'swap_approved',
          title: '교환 요청이 승인되었습니다',
          message: `관리자가 교환 요청을 승인했습니다. 스케줄이 교환되었습니다.`,
          data: { swap_request_id: swapRequest.id }
        }
      )
      break

    case 'reject':
    case 'cancel':
      // 관련자들에게 거부/취소 알림
      const recipientId = swapRequest.target_employee_id === currentEmployee.id
        ? swapRequest.requester_id
        : swapRequest.target_employee_id

      const actionText = action === 'cancel' ? '취소' : '거부'
      notifications.push({
        tenant_id: currentEmployee.tenant_id,
        recipient_id: recipientId,
        type: `swap_${action === 'cancel' ? 'cancelled' : 'rejected'}`,
        title: `교환 요청이 ${actionText}되었습니다`,
        message: `${currentEmployee.name}님이 교환 요청을 ${actionText}했습니다.${rejectionReason ? ` 사유: ${rejectionReason}` : ''}`,
        data: { swap_request_id: swapRequest.id, rejection_reason: rejectionReason }
      })
      break
  }

  // 알림 일괄 생성
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }
}

function getActionMessage(action: string, newStatus: string): string {
  const messages: Record<string, string> = {
    'accept': newStatus === 'approved' ? '교환 요청을 수락했습니다. 교환이 완료되었습니다.' : '교환 요청을 수락했습니다. 관리자 승인을 기다리고 있습니다.',
    'reject': '교환 요청을 거부했습니다.',
    'cancel': '교환 요청을 취소했습니다.',
    'approve': '교환 요청을 승인했습니다. 스케줄이 성공적으로 교환되었습니다.'
  }
  return messages[action] || '교환 요청이 처리되었습니다.'
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
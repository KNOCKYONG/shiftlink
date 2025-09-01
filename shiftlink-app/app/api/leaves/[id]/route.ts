import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 특정 휴가 신청 조회
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
      .select('id, tenant_id, role, team_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { data: leaveRequest, error } = await supabase
      .from('leaves')
      .select(`
        *,
        employee:employee_id(id, name, employee_code, team_id),
        approver:approved_by(id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // 권한 확인 (본인 신청이거나 관리자/매니저)
    const hasAccess = 
      leaveRequest.employee_id === currentEmployee.id ||
      ['admin', 'manager'].includes(currentEmployee.role)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: leaveRequest
    })

  } catch (error) {
    console.error('Error fetching leave request:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch leave request' 
    }, { status: 500 })
  }
}

// 휴가 신청 승인/거부
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ 
        error: 'Valid action is required (approve, reject, cancel)' 
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

    // 휴가 신청 조회
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leaves')
      .select(`
        *,
        employee:employee_id(id, name, employee_code)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending leave requests can be modified' 
      }, { status: 400 })
    }

    // 권한 확인 및 상태 결정
    let newStatus = ''
    let canPerformAction = false

    switch (action) {
      case 'approve':
        // 관리자/매니저만 승인 가능
        canPerformAction = ['admin', 'manager'].includes(currentEmployee.role)
        newStatus = 'approved'
        break

      case 'reject':
        // 관리자/매니저만 거부 가능
        canPerformAction = ['admin', 'manager'].includes(currentEmployee.role)
        newStatus = 'rejected'
        break

      case 'cancel':
        // 신청자만 취소 가능
        canPerformAction = leaveRequest.employee_id === currentEmployee.id
        newStatus = 'cancelled'
        break
    }

    if (!canPerformAction) {
      return NextResponse.json({ 
        error: 'You do not have permission to perform this action' 
      }, { status: 403 })
    }

    // 휴가 신청 상태 업데이트
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = currentEmployee.id
    }

    if (['reject', 'cancel'].includes(action) && rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('leaves')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employee_id(id, name, employee_code),
        approver:approved_by(id, name)
      `)
      .single()

    if (updateError) throw updateError

    // 알림 생성
    await createLeaveNotifications(supabase, updatedRequest, currentEmployee, action, rejection_reason)

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: `leave_${action}`,
      resource_type: 'leave',
      resource_id: id,
      details: {
        original_status: leaveRequest.status,
        new_status: newStatus,
        employee_name: leaveRequest.employee.name,
        leave_type: leaveRequest.leave_type,
        start_date: leaveRequest.start_date,
        end_date: leaveRequest.end_date,
        ...(rejection_reason && { rejection_reason })
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: getActionMessage(action, newStatus)
    })

  } catch (error) {
    console.error('Error processing leave request:', error)
    return NextResponse.json({ 
      error: 'Failed to process leave request' 
    }, { status: 500 })
  }
}

// 알림 생성 함수
async function createLeaveNotifications(
  supabase: any,
  leaveRequest: any,
  currentEmployee: any,
  action: string,
  rejectionReason?: string
) {
  const notifications = []

  switch (action) {
    case 'approve':
      // 신청자에게 승인 알림
      notifications.push({
        tenant_id: currentEmployee.tenant_id,
        recipient_id: leaveRequest.employee_id,
        type: 'leave_approved',
        title: '휴가 신청이 승인되었습니다',
        message: `${leaveRequest.leave_type} 휴가가 승인되었습니다. (${leaveRequest.start_date} ~ ${leaveRequest.end_date})`,
        data: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          approved_by: currentEmployee.name
        }
      })
      break

    case 'reject':
      // 신청자에게 거부 알림
      notifications.push({
        tenant_id: currentEmployee.tenant_id,
        recipient_id: leaveRequest.employee_id,
        type: 'leave_rejected',
        title: '휴가 신청이 거부되었습니다',
        message: `${leaveRequest.leave_type} 휴가 신청이 거부되었습니다.${rejectionReason ? ` 사유: ${rejectionReason}` : ''}`,
        data: {
          leave_request_id: leaveRequest.id,
          leave_type: leaveRequest.leave_type,
          rejection_reason: rejectionReason,
          rejected_by: currentEmployee.name
        }
      })
      break

    case 'cancel':
      // 관리자들에게 취소 알림
      const { data: managers } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', currentEmployee.tenant_id)
        .in('role', ['admin', 'manager'])

      managers?.forEach((manager: any) => {
        notifications.push({
          tenant_id: currentEmployee.tenant_id,
          recipient_id: manager.id,
          type: 'leave_cancelled',
          title: '휴가 신청이 취소되었습니다',
          message: `${leaveRequest.employee.name}님이 ${leaveRequest.leave_type} 휴가 신청을 취소했습니다.`,
          data: {
            leave_request_id: leaveRequest.id,
            employee_name: leaveRequest.employee.name,
            leave_type: leaveRequest.leave_type,
            cancelled_by: currentEmployee.name
          }
        })
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
    'approve': '휴가 신청을 승인했습니다.',
    'reject': '휴가 신청을 거부했습니다.',
    'cancel': '휴가 신청을 취소했습니다.'
  }
  return messages[action] || 'Leave request processed'
}
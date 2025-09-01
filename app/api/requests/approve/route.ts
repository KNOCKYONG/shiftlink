import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { request_id, action, rejection_reason } = body

    if (!request_id || !action) {
      return NextResponse.json({ 
        error: 'Request ID and action are required' 
      }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be either approve or reject' 
      }, { status: 400 })
    }

    // 현재 사용자 확인 (관리자/매니저만 승인 가능)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, role, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee || !['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Only managers and admins can approve/reject requests' 
      }, { status: 403 })
    }

    // 요청 존재 확인
    const { data: existingRequest } = await supabase
      .from('default_requests')
      .select(`
        *,
        employees(id, name, email)
      `)
      .eq('id', request_id)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (existingRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Only pending requests can be approved or rejected' 
      }, { status: 400 })
    }

    // 승인/거부 처리
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: currentEmployee.id,
      approved_at: new Date().toISOString(),
      ...(action === 'reject' && rejection_reason && { rejection_reason })
    }

    const { data: updatedRequest, error } = await supabase
      .from('default_requests')
      .update(updateData)
      .eq('id', request_id)
      .select(`
        *,
        employees(id, name, email),
        approved_by:approved_by(name)
      `)
      .single()

    if (error) throw error

    // 알림 생성 (선택사항)
    try {
      await supabase.from('notifications').insert({
        tenant_id: existingRequest.tenant_id,
        recipient_id: existingRequest.employee_id,
        type: action === 'approve' ? 'request_approved' : 'request_rejected',
        title: `요청이 ${action === 'approve' ? '승인' : '거부'}되었습니다`,
        message: `"${existingRequest.title}" 요청이 ${currentEmployee.name}에 의해 ${action === 'approve' ? '승인' : '거부'}되었습니다.`,
        data: {
          request_id: request_id,
          request_type: existingRequest.request_type,
          approved_by: currentEmployee.name,
          ...(rejection_reason && { rejection_reason })
        }
      })
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // 알림 실패는 전체 작업에 영향을 주지 않음
    }

    // 승인 후 충돌 검사 (선택사항)
    let conflicts = null
    if (action === 'approve' && updatedRequest.auto_apply) {
      conflicts = await checkForConflicts(supabase, updatedRequest)
    }

    return NextResponse.json({ 
      message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      request: updatedRequest,
      ...(conflicts && { conflicts })
    })

  } catch (error) {
    console.error('Error processing request approval:', error)
    return NextResponse.json({ 
      error: 'Failed to process request approval' 
    }, { status: 500 })
  }
}

// 배치 승인/거부
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { request_ids, action, rejection_reason } = body

    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0 || !action) {
      return NextResponse.json({ 
        error: 'Request IDs array and action are required' 
      }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be either approve or reject' 
      }, { status: 400 })
    }

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, role, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee || !['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Only managers and admins can approve/reject requests' 
      }, { status: 403 })
    }

    // 배치 업데이트
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: currentEmployee.id,
      approved_at: new Date().toISOString(),
      ...(action === 'reject' && rejection_reason && { rejection_reason })
    }

    const { data: updatedRequests, error } = await supabase
      .from('default_requests')
      .update(updateData)
      .in('id', request_ids)
      .eq('status', 'pending') // pending 상태인 것만 업데이트
      .select(`
        *,
        employees(id, name, email)
      `)

    if (error) throw error

    // 각 직원에게 알림 발송
    if (updatedRequests?.length > 0) {
      const notifications = updatedRequests.map(req => ({
        tenant_id: req.tenant_id,
        recipient_id: req.employee_id,
        type: action === 'approve' ? 'request_approved' : 'request_rejected',
        title: `요청이 ${action === 'approve' ? '승인' : '거부'}되었습니다`,
        message: `"${req.title}" 요청이 ${currentEmployee.name}에 의해 ${action === 'approve' ? '승인' : '거부'}되었습니다.`,
        data: {
          request_id: req.id,
          request_type: req.request_type,
          approved_by: currentEmployee.name,
          ...(rejection_reason && { rejection_reason })
        }
      }))

      try {
        await supabase.from('notifications').insert(notifications)
      } catch (notificationError) {
        console.error('Failed to create batch notifications:', notificationError)
      }
    }

    return NextResponse.json({ 
      message: `${updatedRequests?.length || 0} requests ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      processed_count: updatedRequests?.length || 0,
      total_requested: request_ids.length
    })

  } catch (error) {
    console.error('Error processing batch approval:', error)
    return NextResponse.json({ 
      error: 'Failed to process batch approval' 
    }, { status: 500 })
  }
}

// 충돌 검사 함수
async function checkForConflicts(supabase: any, request: any) {
  try {
    // 같은 직원의 다른 승인된 요청들과 충돌 검사
    const { data: conflictingRequests } = await supabase
      .from('default_requests')
      .select('*')
      .eq('employee_id', request.employee_id)
      .eq('status', 'approved')
      .neq('id', request.id)

    const conflicts = []

    for (const other of conflictingRequests || []) {
      // 같은 날짜나 요일에 다른 타입의 요청이 있는지 확인
      if (request.is_recurring && other.is_recurring && 
          request.day_of_week === other.day_of_week &&
          request.request_type !== other.request_type) {
        conflicts.push({
          type: 'recurring_conflict',
          conflicting_request: other,
          description: `매주 ${getDayName(request.day_of_week)}에 다른 요청이 이미 승인됨`
        })
      }

      if (!request.is_recurring && !other.is_recurring &&
          request.specific_date === other.specific_date &&
          request.request_type !== other.request_type) {
        conflicts.push({
          type: 'date_conflict',
          conflicting_request: other,
          description: `${request.specific_date}에 다른 요청이 이미 승인됨`
        })
      }
    }

    return conflicts

  } catch (error) {
    console.error('Error checking conflicts:', error)
    return null
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  return days[dayOfWeek] || '알 수 없음'
}
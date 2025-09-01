import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const requestType = searchParams.get('requestType')

    let query = supabase
      .from('default_requests')
      .select(`
        *,
        employees(id, name, employee_code),
        approved_by:approved_by(name)
      `)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    // 필터 적용
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (requestType) {
      query = query.eq('request_type', requestType)
    }

    const { data: requests, error } = await query

    if (error) throw error

    // 요청 타입별 집계 정보 추가
    const summary = {
      total: requests?.length || 0,
      by_status: {},
      by_type: {},
      by_priority: {}
    }

    requests?.forEach(request => {
      // 상태별 집계
      summary.by_status[request.status] = (summary.by_status[request.status] || 0) + 1
      
      // 유형별 집계
      summary.by_type[request.request_type] = (summary.by_type[request.request_type] || 0) + 1
      
      // 우선순위별 집계
      const priorityGroup = request.priority <= 3 ? 'high' : request.priority <= 7 ? 'medium' : 'low'
      summary.by_priority[priorityGroup] = (summary.by_priority[priorityGroup] || 0) + 1
    })

    return NextResponse.json({
      requests: requests || [],
      summary
    })

  } catch (error) {
    console.error('Error fetching default requests:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch default requests' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
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

    const {
      employee_id,
      request_type,
      title,
      description,
      day_of_week,
      specific_date,
      start_date,
      end_date,
      shift_type,
      is_recurring,
      recurrence_pattern,
      priority,
      auto_apply,
      apply_from_date,
      apply_until_date,
      conflict_resolution,
      additional_info
    } = body

    // 필수 필드 검증
    if (!employee_id || !request_type || !title) {
      return NextResponse.json({ 
        error: 'Employee ID, request type, and title are required' 
      }, { status: 400 })
    }

    // 권한 확인 (본인 요청이거나 관리자인지)
    if (employee_id !== currentEmployee.id && !['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'You can only create requests for yourself' 
      }, { status: 403 })
    }

    const requestData = {
      employee_id,
      tenant_id: currentEmployee.tenant_id,
      request_type,
      title,
      description: description || null,
      day_of_week: day_of_week || null,
      specific_date: specific_date || null,
      start_date: start_date || null,
      end_date: end_date || null,
      shift_type: shift_type || null,
      is_recurring: is_recurring || false,
      recurrence_pattern: recurrence_pattern || null,
      priority: priority || 5,
      auto_apply: auto_apply !== undefined ? auto_apply : true,
      apply_from_date: apply_from_date || null,
      apply_until_date: apply_until_date || null,
      conflict_resolution: conflict_resolution || 'manual',
      additional_info: additional_info || null,
      created_by: currentEmployee.id
    }

    const { data: newRequest, error } = await supabase
      .from('default_requests')
      .insert(requestData)
      .select(`
        *,
        employees(id, name, employee_code)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Default request created successfully',
      request: newRequest 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating default request:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create default request' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'Request ID is required' 
      }, { status: 400 })
    }

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    // 기존 요청 확인
    const { data: existingRequest } = await supabase
      .from('default_requests')
      .select('employee_id, status')
      .eq('id', id)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 권한 확인
    const canEdit = existingRequest.employee_id === currentEmployee.id || 
                   ['admin', 'manager'].includes(currentEmployee.role)
    
    if (!canEdit) {
      return NextResponse.json({ 
        error: 'You can only edit your own requests' 
      }, { status: 403 })
    }

    // 승인된 요청은 관리자만 수정 가능
    if (existingRequest.status === 'approved' && !['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Approved requests can only be modified by managers' 
      }, { status: 403 })
    }

    const { data: updatedRequest, error } = await supabase
      .from('default_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employees(id, name, employee_code)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ 
      message: 'Default request updated successfully',
      request: updatedRequest 
    })

  } catch (error) {
    console.error('Error updating default request:', error)
    return NextResponse.json({ 
      error: 'Failed to update default request' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({ 
        error: 'Request ID is required' 
      }, { status: 400 })
    }

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    // 기존 요청 확인
    const { data: existingRequest } = await supabase
      .from('default_requests')
      .select('employee_id, status')
      .eq('id', requestId)
      .single()

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // 권한 확인
    const canDelete = existingRequest.employee_id === currentEmployee.id || 
                     ['admin', 'manager'].includes(currentEmployee.role)
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'You can only delete your own requests' 
      }, { status: 403 })
    }

    const { error } = await supabase
      .from('default_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error

    return NextResponse.json({ 
      message: 'Default request deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting default request:', error)
    return NextResponse.json({ 
      error: 'Failed to delete default request' 
    }, { status: 500 })
  }
}
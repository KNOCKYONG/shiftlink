import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 휴가 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const leaveType = searchParams.get('leaveType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))

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

    // 기본 쿼리 구성
    let query = supabase
      .from('leaves')
      .select(`
        *,
        employee:employee_id(id, name, employee_code, team_id),
        approver:approved_by(id, name)
      `, { count: 'exact' })

    // 권한에 따른 필터링
    if (currentEmployee.role === 'employee') {
      query = query.eq('employee_id', currentEmployee.id)
    } else if (currentEmployee.role === 'manager') {
      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      } else {
        const { data: teamEmployees } = await supabase
          .from('employees')
          .select('id')
          .eq('team_id', currentEmployee.team_id)
        
        const employeeIds = teamEmployees?.map(emp => emp.id) || [currentEmployee.id]
        query = query.in('employee_id', employeeIds)
      }
    } else {
      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      }
    }

    // 추가 필터 적용
    if (status) query = query.eq('status', status)
    if (leaveType) query = query.eq('leave_type', leaveType)
    if (startDate) query = query.gte('start_date', startDate)
    if (endDate) query = query.lte('end_date', endDate)

    // 페이지네이션 및 정렬
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: leaves, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: leaves || [],
      meta: {
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching leaves:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch leaves' 
    }, { status: 500 })
  }
}

// 새 휴가 신청
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
      .select('id, tenant_id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const {
      leave_type,
      start_date,
      end_date,
      reason,
      is_emergency = false,
      attachment_url
    } = body

    // 필수 필드 검증
    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json({
        error: 'leave_type, start_date, and end_date are required'
      }, { status: 400 })
    }

    // 날짜 유효성 검증
    const startDateObj = new Date(start_date)
    const endDateObj = new Date(end_date)
    
    if (startDateObj >= endDateObj) {
      return NextResponse.json({
        error: 'End date must be after start date'
      }, { status: 400 })
    }

    if (startDateObj < new Date()) {
      return NextResponse.json({
        error: 'Start date cannot be in the past'
      }, { status: 400 })
    }

    // 일수 계산
    const daysCount = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 중복 신청 확인
    const { data: existingLeave } = await supabase
      .from('leaves')
      .select('id')
      .eq('employee_id', currentEmployee.id)
      .eq('status', 'pending')
      .gte('start_date', start_date)
      .lte('end_date', end_date)
      .single()

    if (existingLeave) {
      return NextResponse.json({
        error: 'A leave request already exists for this period'
      }, { status: 409 })
    }

    // 휴가 신청 생성
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leaves')
      .insert({
        employee_id: currentEmployee.id,
        leave_type,
        start_date,
        end_date,
        days_count: daysCount,
        reason,
        is_emergency,
        attachment_url,
        status: 'pending'
      })
      .select(`
        *,
        employee:employee_id(id, name, employee_code),
        approver:approved_by(id, name)
      `)
      .single()

    if (leaveError) throw leaveError

    // 관리자/매니저에게 알림 생성
    const { data: managers } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', currentEmployee.tenant_id)
      .in('role', ['admin', 'manager'])

    if (managers && managers.length > 0) {
      const notifications = managers.map((manager: any) => ({
        tenant_id: currentEmployee.tenant_id,
        recipient_id: manager.id,
        type: 'leave_requested',
        title: '휴가 신청이 도착했습니다',
        message: `${currentEmployee.name}님이 ${leave_type} 휴가를 신청했습니다. (${start_date} ~ ${end_date})`,
        data: {
          leave_request_id: leaveRequest.id,
          employee_name: currentEmployee.name,
          leave_type: leave_type,
          start_date: start_date,
          end_date: end_date,
          days_count: daysCount
        }
      }))

      await supabase.from('notifications').insert(notifications)
    }

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'leave_requested',
      resource_type: 'leave',
      resource_id: leaveRequest.id,
      details: {
        leave_type,
        start_date,
        end_date,
        days_count: daysCount,
        is_emergency
      }
    })

    return NextResponse.json({
      success: true,
      data: leaveRequest,
      message: 'Leave request submitted successfully'
    })

  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json({ 
      error: 'Failed to create leave request' 
    }, { status: 500 })
  }
}

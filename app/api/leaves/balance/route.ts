import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentEmployee } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 직원의 휴가 잔액 조회
    const { data: balances, error: balanceError } = await supabase
      .from('leave_balances')
      .select(`
        leave_type,
        total_days,
        used_days,
        remaining_days,
        year,
        expires_at
      `)
      .eq('employee_id', currentEmployee.id)
      .eq('year', new Date().getFullYear())
      .order('leave_type')

    if (balanceError) {
      console.error('Error fetching leave balances:', balanceError)
      return NextResponse.json({ 
        error: 'Failed to fetch leave balances' 
      }, { status: 500 })
    }

    // 휴가 정책 조회 (기본값 제공)
    const { data: policies } = await supabase
      .from('leave_policies')
      .select(`
        leave_type,
        default_days_per_year,
        max_consecutive_days,
        requires_approval,
        auto_approve_threshold
      `)
      .eq('tenant_id', currentEmployee.tenant_id)
      .eq('is_active', true)

    // 휴가 잔액이 없는 경우 기본값으로 생성
    if (!balances || balances.length === 0) {
      const defaultBalances = policies?.map(policy => ({
        leave_type: policy.leave_type,
        total_days: policy.default_days_per_year,
        used_days: 0,
        remaining_days: policy.default_days_per_year,
        year: new Date().getFullYear(),
        expires_at: `${new Date().getFullYear()}-12-31`
      })) || []

      return NextResponse.json({
        success: true,
        data: defaultBalances
      })
    }

    // 정책과 결합하여 완전한 정보 제공
    const enrichedBalances = balances.map(balance => {
      const policy = policies?.find(p => p.leave_type === balance.leave_type)
      return {
        ...balance,
        max_consecutive_days: policy?.max_consecutive_days || null,
        requires_approval: policy?.requires_approval || true,
        auto_approve_threshold: policy?.auto_approve_threshold || 0
      }
    })

    // 사용률 계산 및 경고 수준 추가
    const balancesWithStatus = enrichedBalances.map(balance => {
      const usagePercentage = balance.total_days > 0 
        ? (balance.used_days / balance.total_days) * 100 
        : 0

      let status = 'sufficient'
      if (usagePercentage >= 90) status = 'critical'
      else if (usagePercentage >= 70) status = 'warning'

      return {
        ...balance,
        usage_percentage: Math.round(usagePercentage),
        status,
        days_until_expiry: balance.expires_at ? 
          Math.ceil((new Date(balance.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
          null
      }
    })

    return NextResponse.json({
      success: true,
      data: balancesWithStatus,
      meta: {
        year: new Date().getFullYear(),
        total_leave_types: balancesWithStatus.length,
        critical_count: balancesWithStatus.filter(b => b.status === 'critical').length,
        warning_count: balancesWithStatus.filter(b => b.status === 'warning').length
      }
    })

  } catch (error) {
    console.error('Error in leave balance API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// 휴가 잔액 업데이트 (관리자 전용)
export async function PATCH(request: NextRequest) {
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

    // 관리자 권한 확인
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions' 
      }, { status: 403 })
    }

    const { employee_id, adjustments } = body

    if (!employee_id || !Array.isArray(adjustments)) {
      return NextResponse.json({ 
        error: 'employee_id and adjustments array are required' 
      }, { status: 400 })
    }

    // 휴가 잔액 업데이트
    const updates = adjustments.map(async (adjustment: any) => {
      const { leave_type, total_days, reason } = adjustment

      // 현재 잔액 조회
      const { data: currentBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('leave_type', leave_type)
        .eq('year', new Date().getFullYear())
        .single()

      if (currentBalance) {
        // 기존 잔액 업데이트
        const newRemainingDays = total_days - currentBalance.used_days
        return supabase
          .from('leave_balances')
          .update({
            total_days,
            remaining_days: newRemainingDays,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentBalance.id)
      } else {
        // 새 잔액 생성
        return supabase
          .from('leave_balances')
          .insert({
            employee_id,
            leave_type,
            total_days,
            used_days: 0,
            remaining_days: total_days,
            year: new Date().getFullYear(),
            expires_at: `${new Date().getFullYear()}-12-31`
          })
      }
    })

    await Promise.all(updates)

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'leave_balance_adjustment',
      resource_type: 'leave_balance',
      resource_id: employee_id,
      details: {
        adjustments,
        adjusted_by: currentEmployee.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Leave balances updated successfully'
    })

  } catch (error) {
    console.error('Error updating leave balances:', error)
    return NextResponse.json({ 
      error: 'Failed to update leave balances' 
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 교환 설정 조회
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
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 교환 설정 조회
    const { data: settings, error } = await supabase
      .from('swap_settings')
      .select('*')
      .eq('tenant_id', currentEmployee.tenant_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw error
    }

    // 설정이 없으면 기본값 반환
    if (!settings) {
      const defaultSettings = {
        tenant_id: currentEmployee.tenant_id,
        admin_approval_required: false,
        allow_cross_shift_type: true,
        allow_cross_team: false,
        max_advance_days: 30,
        auto_approve_same_level: true,
        auto_approve_same_team: true,
        auto_approve_within_hours: 24,
        max_pending_requests_per_employee: 5,
        cooldown_hours: 24,
        notify_managers: true,
        notify_team_members: false,
        send_email_notifications: true,
        send_kakao_notifications: false
      }
      
      return NextResponse.json({ settings: defaultSettings })
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Error fetching swap settings:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch swap settings' 
    }, { status: 500 })
  }
}

// 교환 설정 생성/수정
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

    // 관리자/매니저만 설정 수정 가능
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Only admins and managers can modify swap settings' 
      }, { status: 403 })
    }

    const {
      admin_approval_required,
      allow_cross_shift_type,
      allow_cross_team,
      max_advance_days,
      auto_approve_same_level,
      auto_approve_same_team,
      auto_approve_within_hours,
      max_pending_requests_per_employee,
      cooldown_hours,
      notify_managers,
      notify_team_members,
      send_email_notifications,
      send_kakao_notifications
    } = body

    // 입력값 검증
    if (max_advance_days && (max_advance_days <= 0 || max_advance_days > 90)) {
      return NextResponse.json({ 
        error: 'max_advance_days must be between 1 and 90' 
      }, { status: 400 })
    }

    if (max_pending_requests_per_employee && (max_pending_requests_per_employee <= 0 || max_pending_requests_per_employee > 20)) {
      return NextResponse.json({ 
        error: 'max_pending_requests_per_employee must be between 1 and 20' 
      }, { status: 400 })
    }

    if (cooldown_hours && (cooldown_hours < 0 || cooldown_hours > 168)) {
      return NextResponse.json({ 
        error: 'cooldown_hours must be between 0 and 168' 
      }, { status: 400 })
    }

    if (auto_approve_within_hours && (auto_approve_within_hours <= 0 || auto_approve_within_hours > 720)) {
      return NextResponse.json({ 
        error: 'auto_approve_within_hours must be between 1 and 720' 
      }, { status: 400 })
    }

    // UPSERT 실행
    const { data: settings, error } = await supabase
      .from('swap_settings')
      .upsert({
        tenant_id: currentEmployee.tenant_id,
        admin_approval_required: admin_approval_required ?? false,
        allow_cross_shift_type: allow_cross_shift_type ?? true,
        allow_cross_team: allow_cross_team ?? false,
        max_advance_days: max_advance_days ?? 30,
        auto_approve_same_level: auto_approve_same_level ?? true,
        auto_approve_same_team: auto_approve_same_team ?? true,
        auto_approve_within_hours: auto_approve_within_hours ?? 24,
        max_pending_requests_per_employee: max_pending_requests_per_employee ?? 5,
        cooldown_hours: cooldown_hours ?? 24,
        notify_managers: notify_managers ?? true,
        notify_team_members: notify_team_members ?? false,
        send_email_notifications: send_email_notifications ?? true,
        send_kakao_notifications: send_kakao_notifications ?? false,
        updated_by: currentEmployee.id
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single()

    if (error) throw error

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'swap_settings_updated',
      resource_type: 'swap_settings',
      resource_id: settings.id,
      details: {
        admin_approval_required,
        allow_cross_shift_type,
        allow_cross_team,
        max_advance_days,
        auto_approve_same_level,
        auto_approve_same_team
      }
    })

    return NextResponse.json({
      success: true,
      settings,
      message: 'Swap settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating swap settings:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update swap settings' 
    }, { status: 500 })
  }
}
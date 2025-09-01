import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 스케줄 공유 토큰 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
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

    // 스케줄 확인
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', currentEmployee.tenant_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const {
      share_type = 'view', // view, download, subscribe
      expires_in_hours = 168, // 7일 기본
      allowed_viewers = [], // 특정 사용자들만
      require_password = false,
      password = null,
      include_personal_info = false
    } = body

    // 공유 토큰 생성
    const shareToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

    const { data: shareRecord, error: shareError } = await supabase
      .from('schedule_shares')
      .insert({
        schedule_id: id,
        tenant_id: currentEmployee.tenant_id,
        created_by: currentEmployee.id,
        share_token: shareToken,
        share_type,
        expires_at: expiresAt.toISOString(),
        allowed_viewers: allowed_viewers.length > 0 ? allowed_viewers : null,
        require_password,
        password_hash: password ? await hashPassword(password) : null,
        include_personal_info,
        access_count: 0,
        is_active: true
      })
      .select()
      .single()

    if (shareError) throw shareError

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'schedule_shared',
      resource_type: 'schedule',
      resource_id: id,
      details: {
        share_type,
        expires_in_hours,
        allowed_viewers_count: allowed_viewers.length,
        require_password,
        include_personal_info
      }
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/schedule/${shareToken}`

    return NextResponse.json({
      success: true,
      share_token: shareToken,
      share_url: shareUrl,
      expires_at: expiresAt.toISOString(),
      share_record: shareRecord
    })

  } catch (error) {
    console.error('Error creating schedule share:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create share' 
    }, { status: 500 })
  }
}

// 공유 정보 조회
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

    // 관리자/매니저만 공유 정보 조회 가능
    if (!['admin', 'manager'].includes(currentEmployee.role)) {
      return NextResponse.json({ 
        error: 'Only managers and admins can view share information' 
      }, { status: 403 })
    }

    // 공유 기록 조회
    const { data: shares, error } = await supabase
      .from('schedule_shares')
      .select(`
        *,
        creator:created_by(name, employee_code)
      `)
      .eq('schedule_id', id)
      .eq('tenant_id', currentEmployee.tenant_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      shares: shares || []
    })

  } catch (error) {
    console.error('Error fetching schedule shares:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch share information' 
    }, { status: 500 })
  }
}

// 공유 비활성화
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('token')

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 })
    }

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

    // 공유 기록 확인 및 비활성화
    const { data: share, error: shareError } = await supabase
      .from('schedule_shares')
      .update({ 
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: currentEmployee.id
      })
      .eq('schedule_id', id)
      .eq('share_token', shareToken)
      .eq('tenant_id', currentEmployee.tenant_id)
      .select()
      .single()

    if (shareError) throw shareError

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // 감사 로그 생성
    await supabase.from('audit_logs').insert({
      tenant_id: currentEmployee.tenant_id,
      user_id: currentEmployee.id,
      action: 'schedule_share_deactivated',
      resource_type: 'schedule_share',
      resource_id: share.id,
      details: {
        schedule_id: id,
        share_token: shareToken
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Share deactivated successfully'
    })

  } catch (error) {
    console.error('Error deactivating schedule share:', error)
    return NextResponse.json({ 
      error: 'Failed to deactivate share' 
    }, { status: 500 })
  }
}

// 비밀번호 해싱 함수 (실제로는 bcrypt 등 사용 권장)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.SHARE_PASSWORD_SALT || 'default-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
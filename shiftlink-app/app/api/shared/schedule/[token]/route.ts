import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 공유된 스케줄 조회 (인증 불필요)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const { token } = params
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')
    const format = searchParams.get('format') || 'json' // json, csv, ical

    // 공유 기록 확인
    const { data: share, error: shareError } = await supabase
      .from('schedule_shares')
      .select(`
        *,
        schedule:schedule_id(*)
      `)
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 })
    }

    // 만료 확인
    if (new Date() > new Date(share.expires_at)) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 })
    }

    // 비밀번호 확인
    if (share.require_password) {
      if (!password) {
        return NextResponse.json({ error: 'Password required' }, { status: 401 })
      }

      const passwordHash = await hashPassword(password)
      if (passwordHash !== share.password_hash) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    }

    // 조회수 증가
    await supabase
      .from('schedule_shares')
      .update({ 
        access_count: share.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', share.id)

    // 스케줄 데이터 조회
    const assignmentsQuery = supabase
      .from('schedule_assignments')
      .select(`
        *,
        employees(
          ${share.include_personal_info 
            ? 'id, name, employee_code, level, phone, email' 
            : 'id, name, employee_code, level'
          }
        ),
        shift_templates(name, type, start_time, end_time, color)
      `)
      .eq('schedule_id', share.schedule_id)
      .order('date', { ascending: true })
      .order('employees.name', { ascending: true })

    const { data: assignments, error: assignmentsError } = await assignmentsQuery

    if (assignmentsError) throw assignmentsError

    // 포맷에 따른 응답
    switch (format) {
      case 'csv':
        return generateCSVResponse(assignments, share)
      
      case 'ical':
        return generateICalResponse(assignments, share)
      
      default:
        return NextResponse.json({
          schedule: share.schedule,
          assignments: assignments || [],
          share_info: {
            share_type: share.share_type,
            created_at: share.created_at,
            expires_at: share.expires_at,
            access_count: share.access_count + 1,
            include_personal_info: share.include_personal_info
          }
        })
    }

  } catch (error) {
    console.error('Error fetching shared schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch shared schedule' 
    }, { status: 500 })
  }
}

// 공유 통계 업데이트 (접근 로그)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient()
    const { token } = params
    const body = await request.json()
    const { action, user_agent, ip_address } = body

    // 공유 기록 확인
    const { data: share } = await supabase
      .from('schedule_shares')
      .select('id, schedule_id, tenant_id')
      .eq('share_token', token)
      .eq('is_active', true)
      .single()

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // 접근 로그 생성
    await supabase.from('share_access_logs').insert({
      share_id: share.id,
      schedule_id: share.schedule_id,
      tenant_id: share.tenant_id,
      action: action || 'view',
      user_agent: user_agent || request.headers.get('user-agent'),
      ip_address: ip_address || request.headers.get('x-forwarded-for') || 'unknown',
      accessed_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error logging share access:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

// CSV 형태로 응답 생성
function generateCSVResponse(assignments: any[], share: any) {
  const headers = [
    '날짜', '요일', '직원명', '직원코드', '근무시간대', '시작시간', '종료시간'
  ]

  if (share.include_personal_info) {
    headers.push('전화번호', '이메일')
  }

  const csvData = [headers]

  assignments.forEach(assignment => {
    const date = new Date(assignment.date)
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    
    const row = [
      assignment.date,
      dayOfWeek,
      assignment.employees?.name || '',
      assignment.employees?.employee_code || '',
      getShiftTypeName(assignment.shift_type),
      assignment.shift_templates?.start_time || '',
      assignment.shift_templates?.end_time || ''
    ]

    if (share.include_personal_info) {
      row.push(
        assignment.employees?.phone || '',
        assignment.employees?.email || ''
      )
    }

    csvData.push(row)
  })

  const csvContent = csvData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedule_${share.schedule_id}.csv"`
    }
  })
}

// iCal 형태로 응답 생성
function generateICalResponse(assignments: any[], share: any) {
  const icalData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ShiftLink//Schedule//EN',
    'CALSCALE:GREGORIAN'
  ]

  assignments.forEach(assignment => {
    if (assignment.shift_type !== 'off' && assignment.shift_templates) {
      const startDate = new Date(assignment.date + 'T' + assignment.shift_templates.start_time)
      const endDate = new Date(assignment.date + 'T' + assignment.shift_templates.end_time)
      
      // 종료 시간이 시작 시간보다 이른 경우 (야간 근무) 다음날로 설정
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1)
      }

      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }

      icalData.push(
        'BEGIN:VEVENT',
        `UID:${assignment.id}@shiftlink.com`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${assignment.employees?.name} - ${getShiftTypeName(assignment.shift_type)}`,
        `DESCRIPTION:직원: ${assignment.employees?.name}\\n직원코드: ${assignment.employees?.employee_code}\\n근무시간대: ${getShiftTypeName(assignment.shift_type)}`,
        'END:VEVENT'
      )
    }
  })

  icalData.push('END:VCALENDAR')

  const icalContent = icalData.join('\r\n')

  return new NextResponse(icalContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="schedule_${share.schedule_id}.ics"`
    }
  })
}

// 근무시간대 한글 변환
function getShiftTypeName(shiftType: string): string {
  const names: Record<string, string> = {
    'day': '주간',
    'evening': '오후',
    'night': '야간',
    'off': '휴무'
  }
  return names[shiftType] || shiftType
}

// 비밀번호 해싱 함수
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.SHARE_PASSWORD_SALT || 'default-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
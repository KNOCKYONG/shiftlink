import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      authUserId,
      email, 
      name, 
      role,
      department
    } = body

    const supabase = await createClient()


    // Get or create default tenant (for simplicity, using a single tenant)
    let { data: tenant } = await supabase
      .from('tenants')
      .select('id, sites(id, teams(id))')
      .eq('slug', 'default')
      .single()

    let tenantId: string
    let siteId: string | null = null
    let teamId: string | null = null

    if (!tenant) {
      // Create default tenant if it doesn't exist
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Company',
          slug: 'default',
          settings: {
            features: {
              swap_requests: true,
              auto_schedule: true,
              email_notifications: true
            }
          }
        })
        .select()
        .single()

      if (tenantError) {
        console.error('Tenant creation error:', tenantError)
        return NextResponse.json(
          { error: '기본 회사 생성에 실패했습니다.' },
          { status: 400 }
        )
      }

      tenantId = newTenant.id

      // Create default site
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .insert({
          tenant_id: tenantId,
          name: '본사',
          timezone: 'Asia/Seoul'
        })
        .select()
        .single()

      if (!siteError && site) {
        siteId = site.id

        // Create default team
        const { data: team } = await supabase
          .from('teams')
          .insert({
            site_id: siteId,
            name: department || '기본 팀',
            description: `${department || '기본 팀'} 입니다.`
          })
          .select()
          .single()

        if (team) {
          teamId = team.id
        }
      }

      // Create default ruleset
      await supabase
        .from('rulesets')
        .insert({
          tenant_id: tenantId,
          name: '기본 규칙',
          rules: {
            min_rest_hours: { enabled: true, value: 11 },
            max_week_hours: { enabled: true, value: 52 },
            max_consec_nights: { enabled: true, value: 3 },
            fairness: { enabled: true, target_score: 0.7 },
            preferences: { enabled: true },
            public_holidays: { enabled: true, source: 'KR' }
          },
          is_default: true
        })

      // Create default shift templates
      await supabase
        .from('shift_templates')
        .insert([
          {
            tenant_id: tenantId,
            name: '주간 근무',
            type: 'day',
            start_time: '07:00',
            end_time: '15:00',
            duration_hours: 8,
            break_minutes: 60,
            color: '#3B82F6'
          },
          {
            tenant_id: tenantId,
            name: '저녁 근무',
            type: 'evening',
            start_time: '15:00',
            end_time: '23:00',
            duration_hours: 8,
            break_minutes: 60,
            color: '#F59E0B'
          },
          {
            tenant_id: tenantId,
            name: '야간 근무',
            type: 'night',
            start_time: '23:00',
            end_time: '07:00',
            duration_hours: 8,
            break_minutes: 60,
            color: '#8B5CF6'
          }
        ])
    } else {
      tenantId = tenant.id
      
      // Get first site and team
      if (tenant.sites && tenant.sites.length > 0) {
        siteId = tenant.sites[0].id
        if (tenant.sites[0].teams && tenant.sites[0].teams.length > 0) {
          teamId = tenant.sites[0].teams[0].id
        }
      }

      // If team doesn't exist, create one based on department
      if (!teamId && siteId && department) {
        const { data: team } = await supabase
          .from('teams')
          .insert({
            site_id: siteId,
            name: department,
            description: `${department} 팀입니다.`
          })
          .select()
          .single()

        if (team) {
          teamId = team.id
        }
      }
    }

    // Create employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        tenant_id: tenantId,
        team_id: teamId,
        auth_user_id: authUserId,
        email,
        name,
        role: role || 'employee',
        department: department || null,
        employee_code: `EMP${Date.now().toString(36).toUpperCase()}`,
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
        skills: [],
        preferences: {}
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      return NextResponse.json(
        { error: '직원 정보 생성에 실패했습니다.' },
        { status: 400 }
      )
    }

    // Create welcome notification
    if (employee) {
      await supabase
        .from('notifications')
        .insert({
          recipient_id: employee.id,
          type: 'welcome',
          title: 'ShiftLink에 오신 것을 환영합니다!',
          message: `안녕하세요 ${name}님, ShiftLink에 가입해주셔서 감사합니다. 스케줄 관리를 시작해보세요!`,
          data: {
            type: 'welcome',
            user_role: role
          }
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        employeeId: employee.id,
        role: role || 'employee'
      }
    })

  } catch (error) {
    console.error('Complete signup error:', error)
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
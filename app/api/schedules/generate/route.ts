import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CoreSchedulingEngine } from '@/lib/scheduler/core-scheduling-engine'
import { AutoReportingSystem } from '@/lib/scheduler/auto-reporting-system'
import { requireManagerOrAdmin } from '@/lib/auth/utils'
import { getTenantIndustryConfig, getSchedulingOptions, isNursingMode } from '@/lib/utils/industry'

export interface GenerateScheduleRequest {
  schedule_name: string
  start_date: string
  end_date: string
  site_id?: string
  team_ids?: string[]
  coverage_requirements: CoverageRequirement[]
  generation_options?: {
    respect_preferences?: boolean
    minimize_consecutive_nights?: boolean
    balance_workload?: boolean
    avoid_dangerous_patterns?: boolean
  }
}

export interface CoverageRequirement {
  date: string
  shift_type: string
  required_count: number
  minimum_experience_level?: number
}

export async function POST(request: NextRequest) {
  try {
    // 권한 확인 - 관리자/매니저만 스케줄 생성 가능
    const user = await requireManagerOrAdmin()
    const supabase = createClient()

    const body: GenerateScheduleRequest = await request.json()

    const {
      schedule_name,
      start_date,
      end_date,
      site_id,
      team_ids,
      coverage_requirements,
      generation_options = {}
    } = body

    // 입력 검증
    if (!schedule_name || !start_date || !end_date || !coverage_requirements) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 날짜 검증
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: '시작일은 종료일보다 이전이어야 합니다.' },
        { status: 400 }
      )
    }

    // 최대 3개월 제한 (한국 간호사 스케줄링 특성상)
    const dayDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (dayDiff > 90) {
      return NextResponse.json(
        { error: '한 번에 최대 3개월까지만 스케줄을 생성할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 스케줄 레코드 생성
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        name: schedule_name,
        start_date,
        end_date,
        tenant_id: user.tenantId,
        site_id: site_id || null,
        created_by: user.employeeId,
        status: 'generating'
      })
      .select()
      .single()

    if (scheduleError) {
      console.error('Schedule creation error:', scheduleError)
      return NextResponse.json(
        { error: '스케줄 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 대상 직원들 조회 (팀별 필터링 지원)
    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        employee_preferences(*),
        default_requests(*)
      `)
      .eq('tenant_id', user.tenantId)
      .eq('is_active', true)

    if (site_id) {
      employeesQuery = employeesQuery.eq('site_id', site_id)
    }

    if (team_ids && team_ids.length > 0) {
      employeesQuery = employeesQuery.in('team_id', team_ids)
    }

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      return NextResponse.json(
        { error: '직원 정보 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: '스케줄을 생성할 직원이 없습니다.' },
        { status: 400 }
      )
    }

    try {
      // 스케줄 생성 엔진 초기화
      const engine = new CoreSchedulingEngine()

      // 테넌트 업종 설정 로드
      const industryConfig = await getTenantIndustryConfig(user.tenantId)
      const nursingMode = isNursingMode(industryConfig)
      
      // 업종에 맞는 스케줄링 옵션 설정
      const industryOptions = getSchedulingOptions(industryConfig)
      const defaultOptions = {
        ...industryOptions,
        ...generation_options
      }

      // 스케줄 생성 실행
      const generationResult = await engine.generateSchedule(
        schedule.id,
        user.tenantId,
        start_date,
        end_date,
        employees,
        coverage_requirements,
        defaultOptions
      )

      if (!generationResult.success) {
        // 실패한 경우 스케줄 상태 업데이트
        await supabase
          .from('schedules')
          .update({ 
            status: 'failed',
            generation_log: generationResult.error
          })
          .eq('id', schedule.id)

        return NextResponse.json(
          { 
            error: '스케줄 생성에 실패했습니다.',
            details: generationResult.error,
            coverage_gaps: generationResult.coverage_gaps
          },
          { status: 400 }
        )
      }

      // 생성된 배정 저장
      const assignmentInserts = generationResult.assignments.map(assignment => ({
        schedule_id: schedule.id,
        employee_id: assignment.employee_id,
        date: assignment.date,
        shift_type: assignment.shift_type,
        assignment_reason: assignment.reason || '자동 배정',
        is_confirmed: false,
        tenant_id: user.tenantId
      }))

      const { error: assignmentError } = await supabase
        .from('schedule_assignments')
        .insert(assignmentInserts)

      if (assignmentError) {
        console.error('Assignment insertion error:', assignmentError)
        
        // 실패한 경우 스케줄 상태 업데이트
        await supabase
          .from('schedules')
          .update({ status: 'failed' })
          .eq('id', schedule.id)

        return NextResponse.json(
          { error: '스케줄 배정 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      // 스케줄 상태를 '초안'으로 업데이트
      await supabase
        .from('schedules')
        .update({ 
          status: 'draft',
          generation_stats: {
            total_assignments: generationResult.assignments.length,
            coverage_rate: generationResult.coverage_rate,
            fairness_score: generationResult.fairness_metrics?.overall_score || 0,
            pattern_violations: generationResult.pattern_analysis?.violations || 0,
            generation_time_ms: generationResult.generation_time_ms
          }
        })
        .eq('id', schedule.id)

      // 자동 리포팅 시스템 트리거 (백그라운드에서 실행)
      if (defaultOptions.avoid_dangerous_patterns) {
        const reportingSystem = new AutoReportingSystem()
        
        // 비동기로 리포트 생성 (응답 속도에 영향 없게)
        reportingSystem.triggerScheduleReporting(
          schedule.id,
          user.tenantId,
          {
            generate_individual_explanations: true,
            generate_team_fairness_analysis: true,
            generate_pattern_risk_report: true,
            auto_send_notifications: false // 초안 상태에서는 알림 발송하지 않음
          }
        ).catch(error => {
          console.error('Auto reporting failed:', error)
        })
      }

      // 감사 로그 생성
      await supabase.from('audit_logs').insert({
        tenant_id: user.tenantId,
        user_id: user.employeeId,
        action: 'schedule_generated',
        resource_type: 'schedule',
        resource_id: schedule.id,
        details: {
          schedule_name,
          start_date,
          end_date,
          site_id,
          team_ids,
          assignments_count: generationResult.assignments.length,
          generation_time_ms: generationResult.generation_time_ms,
          fairness_score: generationResult.fairness_metrics?.overall_score || 0
        }
      })

      return NextResponse.json({
        success: true,
        schedule_id: schedule.id,
        generation_stats: {
          total_assignments: generationResult.assignments.length,
          total_employees: employees.length,
          date_range_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          coverage_rate: generationResult.coverage_rate,
          fairness_score: generationResult.fairness_metrics?.overall_score || 0,
          pattern_analysis: generationResult.pattern_analysis,
          generation_time_ms: generationResult.generation_time_ms
        },
        assignments: generationResult.assignments.map(assignment => ({
          employee_id: assignment.employee_id,
          employee_name: assignment.employee_name,
          date: assignment.date,
          shift_type: assignment.shift_type,
          korean_shift_name: getKoreanShiftName(assignment.shift_type),
          reason: assignment.reason
        })),
        message: `${employees.length}명 직원의 ${Math.ceil(dayDiff)}일 스케줄을 성공적으로 생성했습니다.`
      })

    } catch (engineError) {
      console.error('Schedule engine error:', engineError)
      
      // 엔진 오류 발생 시 스케줄 상태 업데이트
      await supabase
        .from('schedules')
        .update({ status: 'failed' })
        .eq('id', schedule.id)
        
      throw engineError
    }

  } catch (error) {
    console.error('스케줄 생성 API 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
    }, { status: 500 })
  }
}

function getKoreanShiftName(shiftType: string): string {
  switch (shiftType) {
    case 'day':
      return '데이'
    case 'evening':
      return '이브닝'
    case 'night':
      return '나이트'
    case 'off':
      return '오프'
    default:
      return shiftType
  }
}

// 스케줄 생성 상태 확인
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

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

    // 스케줄 조회
    let query = supabase
      .from('schedule_assignments')
      .select(`
        *,
        employees(id, name, employee_code),
        shift_templates(name, type, start_time, end_time)
      `)
      .gte('date', date)
      .lte('date', date)

    if (teamId) {
      query = query.eq('employees.team_id', teamId)
    }

    const { data: assignments, error } = await query
      .order('date', { ascending: true })
      .order('employees.name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      assignments: assignments || [],
      date,
      total: assignments?.length || 0
    })

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch schedule' 
    }, { status: 500 })
  }
}

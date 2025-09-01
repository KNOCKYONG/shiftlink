// API 엔드포인트: 배정 근거 조회
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AssignmentAuditTracker } from '@/lib/scheduler/assignment-audit-tracker'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const scheduleId = searchParams.get('schedule_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'employee_id parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // 사용자 권한 확인 (직원 본인 또는 관리자만 조회 가능)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 권한 확인: 직원 본인이거나 관리자인지 체크
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 본인의 기록이거나 관리자 권한이 있는지 확인
    const canViewAudit = 
      employee.id === employeeId || 
      ['admin', 'manager'].includes(employee.role)

    if (!canViewAudit) {
      // 요청된 직원이 같은 테넌트인지도 확인
      const { data: requestedEmployee } = await supabase
        .from('employees')
        .select('tenant_id')
        .eq('id', employeeId)
        .single()

      if (requestedEmployee?.tenant_id !== employee.tenant_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const auditTracker = new AssignmentAuditTracker()
    
    // 배정 근거 데이터 조회
    const auditRecords = await auditTracker.getEmployeeAssignmentReasons(
      employeeId,
      scheduleId || undefined,
      startDate || undefined,
      endDate || undefined
    )

    // 데이터 변환 (민감한 정보 제거 및 사용자 친화적 형태로 변환)
    const responseData = auditRecords.map(record => ({
      date: record.date,
      shift_type: record.shift_type,
      shift_display_name: getShiftDisplayName(record.shift_type),
      confidence_score: Math.round(record.confidence_score * 100),
      assignment_reasons: record.assignment_reasons.map((reason: any) => ({
        category: reason.category,
        category_display: getCategoryDisplayName(reason.category),
        priority: reason.priority,
        score: Math.round(reason.score),
        explanation: reason.explanation,
        details: sanitizeDetails(reason.details)
      })),
      fairness_context: {
        fairness_score: Math.round(record.fairness_context.employee_fairness_score),
        team_comparison: {
          night_shifts_comparison: record.fairness_context.team_average_comparison?.night_shifts_vs_avg || 0,
          weekend_shifts_comparison: record.fairness_context.team_average_comparison?.weekend_shifts_vs_avg || 0
        },
        equity_justification: record.fairness_context.equity_justification
      },
      safety_analysis: {
        safety_score: Math.round(record.safety_score * 100),
        consecutive_days: record.pattern_analysis.consecutive_days,
        consecutive_nights: record.pattern_analysis.consecutive_nights,
        detected_risks: record.pattern_analysis.detected_risks?.map((risk: any) => ({
          type: risk.risk_type,
          severity: risk.severity,
          description: risk.description
        })) || []
      },
      schedule_info: {
        schedule_name: record.schedules?.name,
        schedule_period: `${record.schedules?.start_date} ~ ${record.schedules?.end_date}`
      },
      decision_timestamp: record.decision_timestamp
    }))

    return NextResponse.json({
      success: true,
      data: responseData,
      total_records: responseData.length,
      query_params: {
        employee_id: employeeId,
        schedule_id: scheduleId,
        date_range: startDate && endDate ? `${startDate} ~ ${endDate}` : 'all'
      }
    })

  } catch (error) {
    console.error('Assignment audit API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 교대 종류 표시명 반환
 */
function getShiftDisplayName(shiftType: string): string {
  const displayNames: { [key: string]: string } = {
    'day': '데이',
    'evening': '이브닝', 
    'night': '나이트',
    'off': '오프'
  }
  return displayNames[shiftType] || shiftType
}

/**
 * 카테고리 표시명 반환
 */
function getCategoryDisplayName(category: string): string {
  const displayNames: { [key: string]: string } = {
    'preference': '개인 선호도',
    'fairness': '공정성 개선',
    'constraint': '제약사항 준수',
    'pattern_safety': '안전 패턴',
    'coverage': '인력 커버리지',
    'optimization': '종합 최적화'
  }
  return displayNames[category] || category
}

/**
 * 세부사항 민감정보 제거
 */
function sanitizeDetails(details: any): any {
  if (!details || typeof details !== 'object') return details
  
  // 민감한 필드 제거
  const sanitized = { ...details }
  delete sanitized.internal_score_calculation
  delete sanitized.algorithm_parameters
  delete sanitized.debug_info
  
  // 점수 값들 반올림
  if (sanitized.confidence_score) {
    sanitized.confidence_score = Math.round(sanitized.confidence_score)
  }
  if (sanitized.current_fairness) {
    sanitized.current_fairness = Math.round(sanitized.current_fairness)
  }
  if (sanitized.risk_score) {
    sanitized.risk_score = Math.round(sanitized.risk_score)
  }
  
  return sanitized
}
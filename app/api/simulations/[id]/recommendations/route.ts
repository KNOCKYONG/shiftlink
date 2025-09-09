import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface EmployeeScore {
  employee_id: string
  employee_name: string
  position: string
  hierarchy_level: number
  experience_years: number
  team_name: string
  score: number
  score_factors: {
    hierarchy_match: number
    preference_alignment: number
    fatigue_balance: number
    experience_match: number
    availability: number
    recent_workload: number
  }
  is_trade: boolean
  trade_info?: {
    date: string
    shift: string
    current_assignment: string
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, shift } = await request.json()

    if (!date || !shift) {
      return NextResponse.json({ error: 'Date and shift are required' }, { status: 400 })
    }

    // 현재 해당 슬롯의 배정 정보 조회
    const { data: currentAssignment } = await supabase
      .from('simulation_assignments')
      .select('*, employee:employees!employee_id(*)')
      .eq('simulation_id', params.id)
      .eq('date', date)
      .eq('shift_type', shift)
      .single()

    // 시뮬레이션의 tenant_id 조회
    const { data: simulation } = await supabase
      .from('schedule_simulations')
      .select('tenant_id')
      .eq('id', params.id)
      .single()

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 })
    }

    // 모든 활성 직원 조회
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        position,
        hierarchy_level,
        experience_years,
        team:teams!team_id(name),
        employee_preferences(preference_pattern)
      `)
      .eq('tenant_id', simulation.tenant_id)
      .eq('is_active', true)

    if (empError || !employees) {
      console.error('Error fetching employees:', empError)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    // 해당 날짜의 기존 배정 조회 (충돌 확인용)
    const { data: existingAssignments } = await supabase
      .from('simulation_assignments')
      .select('employee_id, shift_type')
      .eq('simulation_id', params.id)
      .eq('date', date)

    const assignedEmployeeIds = new Set(
      existingAssignments?.filter(a => a.shift_type !== 'off').map(a => a.employee_id) || []
    )

    // 직원별 점수 계산
    const recommendations: EmployeeScore[] = []

    for (const employee of employees) {
      // 이미 해당 날짜에 배정된 직원은 제외
      if (assignedEmployeeIds.has(employee.id)) continue
      
      // 현재 배정된 직원은 제외
      if (currentAssignment?.employee_id === employee.id) continue

      let scoreFactors = {
        hierarchy_match: 0,
        preference_alignment: 0,
        fatigue_balance: 0,
        experience_match: 0,
        availability: 0,
        recent_workload: 0
      }

      // 1. 계층 일치도 (40%)
      if (currentAssignment) {
        if (employee.hierarchy_level === currentAssignment.hierarchy_level) {
          scoreFactors.hierarchy_match = 0.4
        } else if (Math.abs(employee.hierarchy_level - currentAssignment.hierarchy_level) === 1) {
          scoreFactors.hierarchy_match = 0.2
        }
      } else {
        // 빈 슬롯인 경우 모든 레벨에 기본 점수
        scoreFactors.hierarchy_match = 0.3
      }

      // 2. 선호 패턴 일치도 (25%)
      const preferences = employee.employee_preferences?.[0]?.preference_pattern
      if (preferences && preferences.length > 0) {
        const dayOfWeek = new Date(date).getDay()
        const patternIndex = dayOfWeek % preferences.length
        const preferredShift = preferences[patternIndex]
        
        if (preferredShift === shift) {
          scoreFactors.preference_alignment = 0.25
        } else if (preferredShift !== 'off') {
          scoreFactors.preference_alignment = 0.1
        }
      }

      // 3. 피로도 균형 (15%)
      // 실제로는 fatigue_metrics 테이블에서 조회
      const simulatedFatigue = Math.random() * 10
      if (simulatedFatigue < 4) {
        scoreFactors.fatigue_balance = 0.15
      } else if (simulatedFatigue < 7) {
        scoreFactors.fatigue_balance = 0.08
      } else {
        scoreFactors.fatigue_balance = 0
      }

      // 4. 경력 일치도 (10%)
      if (currentAssignment?.employee) {
        const expDiff = Math.abs(employee.experience_years - currentAssignment.employee.experience_years)
        if (expDiff <= 2) {
          scoreFactors.experience_match = 0.1
        } else if (expDiff <= 5) {
          scoreFactors.experience_match = 0.05
        }
      } else {
        scoreFactors.experience_match = 0.08
      }

      // 5. 가용성 (10%)
      if (!assignedEmployeeIds.has(employee.id)) {
        scoreFactors.availability = 0.1
      }

      // 6. 최근 업무량 (보너스)
      // 실제로는 최근 배정 이력을 분석
      scoreFactors.recent_workload = Math.random() * 0.05

      const totalScore = Object.values(scoreFactors).reduce((sum, val) => sum + val, 0)

      if (totalScore > 0.2) { // 최소 점수 threshold
        recommendations.push({
          employee_id: employee.id,
          employee_name: employee.name,
          position: employee.position,
          hierarchy_level: employee.hierarchy_level,
          experience_years: employee.experience_years,
          team_name: employee.team?.name || '',
          score: totalScore,
          score_factors: scoreFactors,
          is_trade: false
        })
      }
    }

    // 트레이드 추천 추가 (동일 레벨 교환)
    if (currentAssignment) {
      const { data: tradeOpportunities } = await supabase
        .from('simulation_assignments')
        .select(`
          *,
          employee:employees!employee_id(*)
        `)
        .eq('simulation_id', params.id)
        .eq('hierarchy_level', currentAssignment.hierarchy_level)
        .neq('date', date)
        .eq('shift_type', 'off')
        .limit(5)

      if (tradeOpportunities) {
        for (const trade of tradeOpportunities) {
          // 상대방도 off인 날에 교환 가능한지 확인
          const { data: reciprocalCheck } = await supabase
            .from('simulation_assignments')
            .select('shift_type')
            .eq('simulation_id', params.id)
            .eq('employee_id', currentAssignment.employee_id)
            .eq('date', trade.date)
            .single()

          if (reciprocalCheck?.shift_type === 'off') {
            recommendations.push({
              employee_id: trade.employee_id,
              employee_name: trade.employee.name,
              position: trade.employee.position,
              hierarchy_level: trade.employee.hierarchy_level,
              experience_years: trade.employee.experience_years,
              team_name: trade.employee.team?.name || '',
              score: 0.85, // 트레이드는 높은 점수
              score_factors: {
                hierarchy_match: 0.4,
                preference_alignment: 0.2,
                fatigue_balance: 0.1,
                experience_match: 0.1,
                availability: 0.05,
                recent_workload: 0
              },
              is_trade: true,
              trade_info: {
                date: trade.date,
                shift: trade.shift_type,
                current_assignment: currentAssignment.shift_type
              }
            })
          }
        }
      }
    }

    // 점수 순으로 정렬
    recommendations.sort((a, b) => b.score - a.score)

    // 상위 10개만 반환
    const topRecommendations = recommendations.slice(0, 10).map(rec => ({
      employee_id: rec.employee_id,
      employee_name: rec.employee_name,
      recommendation_type: rec.is_trade ? 'trade' : 
                          rec.score_factors.hierarchy_match >= 0.4 ? 'same_level' :
                          rec.score_factors.preference_alignment >= 0.2 ? 'preference_match' :
                          'availability',
      score: rec.score,
      is_trade: rec.is_trade,
      trade_date: rec.trade_info?.date,
      trade_shift: rec.trade_info?.shift
    }))

    // 추천 결과 캐싱 (선택적)
    if (currentAssignment && topRecommendations.length > 0) {
      const recommendationsToCache = topRecommendations.map(rec => ({
        simulation_id: params.id,
        target_assignment_id: currentAssignment.id,
        target_employee_id: currentAssignment.employee_id,
        target_date: date,
        target_shift_type: shift,
        recommended_employee_id: rec.employee_id,
        recommendation_type: rec.recommendation_type,
        recommendation_score: rec.score,
        is_trade: rec.is_trade,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1시간 후 만료
      }))

      const { error: cacheError } = await supabase
        .from('simulation_recommendations')
        .insert(recommendationsToCache)

      if (cacheError) {
        console.error('Error caching recommendations:', cacheError)
        // 캐싱 실패는 무시하고 계속 진행
      }
    }

    return NextResponse.json(topRecommendations)

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
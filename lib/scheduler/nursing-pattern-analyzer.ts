// 간호사 근무 패턴 위험도 분석 시스템
export interface NursingPatternAnalysis {
  employee_id: string
  employee_name: string
  pattern_sequence: string[] // ['N', 'N', 'N', 'Off', 'D'] 형태
  korean_pattern: string // "나나나오데" 형태
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_score: number // 0-100
  detected_issues: PatternIssue[]
  recommendations: string[]
  analysis_date: string
}

export interface PatternIssue {
  issue_type: 'consecutive_triple_shift' | 'alternating_chaos' | 'double_without_rest' | 'excessive_nights' | 'weekend_heavy' | 'fatigue_accumulation'
  severity: 'warning' | 'danger' | 'critical'
  description: string
  affected_dates: string[]
  impact_score: number // 0-100
}

// 위험 패턴 정의 (한국 간호사 특화)
export const DANGEROUS_PATTERNS = {
  // 최악의 패턴들
  triple_shift_rotation: {
    patterns: ['D-E-N', 'N-D-E', 'E-N-D'], // 데이나오, 나데이, 이나데
    risk_score: 95,
    description: '연속 3교대 - 생체리듬 완전 파괴',
    severity: 'critical' as const
  },

  alternating_chaos: {
    patterns: ['D-Off-N-Off-E', 'N-Off-D-Off-E', 'E-Off-N-Off-D'],
    risk_score: 90,
    description: '번갈아 패턴 - 적응 불가능',
    severity: 'critical' as const
  },

  // 위험한 패턴들
  consecutive_nights_over_limit: {
    patterns: ['N-N-N-N', 'N-N-N-N-N'], // 4연속 이상 나이트
    risk_score: 80,
    description: '연속 나이트 과다 (3회 초과)',
    severity: 'danger' as const
  },

  double_without_proper_rest: {
    patterns: ['D-E-Off-D', 'E-N-Off-E'], // 더블 후 하루 쉬고 바로 근무
    risk_score: 75,
    description: '더블 근무 후 불충분한 휴식',
    severity: 'danger' as const
  },

  // 경고 패턴들
  friday_night_weekend: {
    patterns: [], // 요일 기반 체크
    risk_score: 60,
    description: '금요일 나이트 + 주말 근무',
    severity: 'warning' as const
  },

  excessive_night_ratio: {
    patterns: [], // 월별 비율 기반 체크
    risk_score: 65,
    description: '나이트 근무 비율 과다 (40% 초과)',
    severity: 'warning' as const
  }
}

export class NursingPatternAnalyzer {
  /**
   * 직원의 근무 패턴 위험도 분석
   */
  analyzeEmployeePattern(
    employeeId: string,
    employeeName: string,
    assignments: Array<{
      date: string
      shift_type: string
      leave_type?: string
    }>
  ): NursingPatternAnalysis {
    const patternSequence = assignments.map(a => 
      a.leave_type ? 'Off' : this.mapShiftToPattern(a.shift_type)
    )
    
    const koreanPattern = this.generateKoreanPattern(assignments)
    const detectedIssues = this.detectPatternIssues(assignments)
    const riskScore = this.calculateRiskScore(detectedIssues)
    const riskLevel = this.determineRiskLevel(riskScore)
    const recommendations = this.generateRecommendations(detectedIssues, riskLevel)

    return {
      employee_id: employeeId,
      employee_name: employeeName,
      pattern_sequence: patternSequence,
      korean_pattern: koreanPattern,
      risk_level: riskLevel,
      risk_score: riskScore,
      detected_issues: detectedIssues,
      recommendations,
      analysis_date: new Date().toISOString()
    }
  }

  /**
   * 패턴 문제점 감지
   */
  private detectPatternIssues(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []

    // 1. 연속 3교대 패턴 체크
    issues.push(...this.detectTripleShiftRotation(assignments))

    // 2. 번갈아 패턴 체크
    issues.push(...this.detectAlternatingChaos(assignments))

    // 3. 연속 나이트 과다 체크
    issues.push(...this.detectExcessiveConsecutiveNights(assignments))

    // 4. 더블 근무 후 불충분한 휴식 체크
    issues.push(...this.detectDoubleWithoutRest(assignments))

    // 5. 금요일 나이트 + 주말 근무 체크
    issues.push(...this.detectWeekendHeavyPattern(assignments))

    // 6. 나이트 근무 비율 과다 체크
    issues.push(...this.detectExcessiveNightRatio(assignments))

    return issues
  }

  /**
   * 연속 3교대 패턴 감지 (데이나오 등)
   */
  private detectTripleShiftRotation(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []
    
    for (let i = 0; i <= assignments.length - 3; i++) {
      const threeDay = assignments.slice(i, i + 3)
      const shifts = threeDay.map(a => a.shift_type).filter(s => s !== 'off')
      
      // 3일 연속으로 서로 다른 3개 시프트가 나오는 경우
      if (shifts.length === 3) {
        const uniqueShifts = new Set(shifts)
        if (uniqueShifts.size === 3 && uniqueShifts.has('day') && uniqueShifts.has('evening') && uniqueShifts.has('night')) {
          issues.push({
            issue_type: 'consecutive_triple_shift',
            severity: 'critical',
            description: `연속 3교대 패턴: ${shifts.join('-')} (생체리듬 파괴 위험)`,
            affected_dates: threeDay.map(a => a.date),
            impact_score: 95
          })
        }
      }
    }

    return issues
  }

  /**
   * 번갈아 패턴 감지 (D-Off-N-Off-E 등)
   */
  private detectAlternatingChaos(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []
    
    // 5일 연속 체크해서 3개 이상의 서로 다른 시프트가 번갈아 나오는 패턴
    for (let i = 0; i <= assignments.length - 5; i++) {
      const fiveDay = assignments.slice(i, i + 5)
      const workDays = fiveDay.filter(a => a.shift_type !== 'off' && !a.leave_type)
      
      if (workDays.length >= 3) {
        const shiftTypes = workDays.map(a => a.shift_type)
        const uniqueShifts = new Set(shiftTypes)
        
        // 3개 이상의 서로 다른 시프트가 섞여있고, 연속성이 없는 경우
        if (uniqueShifts.size >= 3) {
          let isAlternating = true
          for (let j = 1; j < shiftTypes.length; j++) {
            if (shiftTypes[j] === shiftTypes[j - 1]) {
              isAlternating = false
              break
            }
          }
          
          if (isAlternating) {
            issues.push({
              issue_type: 'alternating_chaos',
              severity: 'critical',
              description: `번갈아 패턴: ${shiftTypes.join('-')} (적응 불가능)`,
              affected_dates: fiveDay.map(a => a.date),
              impact_score: 90
            })
          }
        }
      }
    }

    return issues
  }

  /**
   * 연속 나이트 과다 감지
   */
  private detectExcessiveConsecutiveNights(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []
    let consecutiveNights = 0
    let nightDates: string[] = []

    for (const assignment of assignments) {
      if (assignment.shift_type === 'night' && !assignment.leave_type) {
        consecutiveNights++
        nightDates.push(assignment.date)
        
        // 4회 이상 연속 나이트는 위험
        if (consecutiveNights >= 4) {
          issues.push({
            issue_type: 'excessive_nights',
            severity: 'danger',
            description: `연속 나이트 ${consecutiveNights}회 (권장: 최대 3회)`,
            affected_dates: [...nightDates],
            impact_score: 70 + (consecutiveNights - 4) * 5 // 4회부터 점수 증가
          })
        }
      } else {
        consecutiveNights = 0
        nightDates = []
      }
    }

    return issues
  }

  /**
   * 더블 근무 후 불충분한 휴식 감지
   */
  private detectDoubleWithoutRest(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []

    for (let i = 0; i <= assignments.length - 4; i++) {
      const fourDay = assignments.slice(i, i + 4)
      
      // 더블 패턴 체크: Day+Evening 또는 Evening+Night
      const isDouble = (
        (fourDay[0].shift_type === 'day' && fourDay[1].shift_type === 'evening') ||
        (fourDay[0].shift_type === 'evening' && fourDay[1].shift_type === 'night')
      )
      
      if (isDouble && fourDay[2].shift_type === 'off' && fourDay[3].shift_type !== 'off') {
        issues.push({
          issue_type: 'double_without_rest',
          severity: 'danger',
          description: `더블 근무 후 하루 휴식으로 복귀 (권장: 최소 2일)`,
          affected_dates: fourDay.map(a => a.date),
          impact_score: 75
        })
      }
    }

    return issues
  }

  /**
   * 주말 집중 패턴 감지
   */
  private detectWeekendHeavyPattern(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []
    const weekendNights: string[] = []

    for (const assignment of assignments) {
      const date = new Date(assignment.date)
      const dayOfWeek = date.getDay()
      
      // 금요일 나이트 또는 주말 근무
      if (assignment.shift_type === 'night' && dayOfWeek === 5) {
        weekendNights.push(assignment.date)
      }
    }

    if (weekendNights.length >= 2) {
      issues.push({
        issue_type: 'weekend_heavy',
        severity: 'warning',
        description: `금요일 나이트 ${weekendNights.length}회 (사회적 피로 증가)`,
        affected_dates: weekendNights,
        impact_score: 60
      })
    }

    return issues
  }

  /**
   * 나이트 근무 비율 과다 감지
   */
  private detectExcessiveNightRatio(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): PatternIssue[] {
    const issues: PatternIssue[] = []
    const workDays = assignments.filter(a => a.shift_type !== 'off' && !a.leave_type)
    const nightDays = workDays.filter(a => a.shift_type === 'night')
    
    if (workDays.length > 0) {
      const nightRatio = nightDays.length / workDays.length
      
      if (nightRatio > 0.4) { // 40% 초과
        issues.push({
          issue_type: 'excessive_nights',
          severity: 'warning',
          description: `나이트 근무 비율 ${Math.round(nightRatio * 100)}% (권장: 30% 이하)`,
          affected_dates: nightDays.map(a => a.date),
          impact_score: 50 + (nightRatio - 0.4) * 50
        })
      }
    }

    return issues
  }

  /**
   * 전체 위험 점수 계산
   */
  private calculateRiskScore(issues: PatternIssue[]): number {
    if (issues.length === 0) return 0
    
    // 최고 점수 위주로 계산 (가중 평균)
    const sortedScores = issues.map(i => i.impact_score).sort((a, b) => b - a)
    
    if (sortedScores.length === 0) return 0
    if (sortedScores.length === 1) return sortedScores[0]
    
    // 최고점 70% + 나머지 30%
    const topScore = sortedScores[0] * 0.7
    const otherScores = sortedScores.slice(1).reduce((sum, score) => sum + score, 0) / sortedScores.length * 0.3
    
    return Math.min(100, topScore + otherScores)
  }

  /**
   * 위험 레벨 결정
   */
  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical'
    if (riskScore >= 60) return 'high'
    if (riskScore >= 30) return 'medium'
    return 'low'
  }

  /**
   * 개선 권장사항 생성
   */
  private generateRecommendations(issues: PatternIssue[], riskLevel: string): string[] {
    const recommendations: string[] = []

    const hasTripleShift = issues.some(i => i.issue_type === 'consecutive_triple_shift')
    const hasAlternating = issues.some(i => i.issue_type === 'alternating_chaos')
    const hasExcessiveNights = issues.some(i => i.issue_type === 'excessive_nights')

    if (hasTripleShift) {
      recommendations.push('🚨 연속 3교대 패턴을 "나오오데" 형태로 변경 권장')
      recommendations.push('✅ 같은 시간대 2-3일 연속 후 충분한 휴식 제공')
    }

    if (hasAlternating) {
      recommendations.push('🔄 번갈아 패턴을 규칙적인 로테이션으로 변경')
      recommendations.push('💡 개인별 선호 패턴(짧은/긴 주기) 반영 필요')
    }

    if (hasExcessiveNights) {
      recommendations.push('🌙 연속 나이트는 최대 3회로 제한')
      recommendations.push('😴 나이트 후 최소 2일 휴식 보장')
    }

    if (riskLevel === 'critical') {
      recommendations.push('⚠️ 즉시 스케줄 재조정 필요 - 건강 위험 상태')
    } else if (riskLevel === 'high') {
      recommendations.push('🔍 다음 스케줄에서 우선 개선 필요')
    }

    return recommendations
  }

  /**
   * 시프트를 패턴 문자로 매핑
   */
  private mapShiftToPattern(shiftType: string): string {
    const mapping: { [key: string]: string } = {
      'day': 'D',
      'evening': 'E', 
      'night': 'N',
      'off': 'Off'
    }
    return mapping[shiftType] || shiftType.charAt(0).toUpperCase()
  }

  /**
   * 한국식 패턴 문자열 생성
   */
  private generateKoreanPattern(assignments: Array<{
    date: string
    shift_type: string
    leave_type?: string
  }>): string {
    return assignments.map(assignment => {
      if (assignment.leave_type) return '휴'
      
      const koreanMap: { [key: string]: string } = {
        'day': '데',
        'evening': '이',
        'night': '나',
        'off': '오'
      }
      
      return koreanMap[assignment.shift_type] || assignment.shift_type.charAt(0)
    }).join('')
  }

  /**
   * 팀 전체 위험 패턴 요약 분석
   */
  analyzeTeamPatterns(analyses: NursingPatternAnalysis[]): {
    total_employees: number
    risk_distribution: { [key: string]: number }
    critical_employees: string[]
    common_issues: { issue_type: string; count: number; employees: string[] }[]
    team_risk_score: number
    urgent_recommendations: string[]
  } {
    const riskDistribution = {
      low: analyses.filter(a => a.risk_level === 'low').length,
      medium: analyses.filter(a => a.risk_level === 'medium').length,
      high: analyses.filter(a => a.risk_level === 'high').length,
      critical: analyses.filter(a => a.risk_level === 'critical').length
    }

    const criticalEmployees = analyses
      .filter(a => a.risk_level === 'critical')
      .map(a => a.employee_name)

    // 공통 문제점 분석
    const issueMap = new Map<string, { count: number; employees: string[] }>()
    
    analyses.forEach(analysis => {
      analysis.detected_issues.forEach(issue => {
        const key = issue.issue_type
        if (!issueMap.has(key)) {
          issueMap.set(key, { count: 0, employees: [] })
        }
        const issueData = issueMap.get(key)!
        issueData.count++
        if (!issueData.employees.includes(analysis.employee_name)) {
          issueData.employees.push(analysis.employee_name)
        }
      })
    })

    const commonIssues = Array.from(issueMap.entries())
      .map(([issue_type, data]) => ({ issue_type, ...data }))
      .sort((a, b) => b.count - a.count)

    // 팀 전체 위험 점수
    const teamRiskScore = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.risk_score, 0) / analyses.length 
      : 0

    // 긴급 권장사항
    const urgentRecommendations: string[] = []
    
    if (riskDistribution.critical > 0) {
      urgentRecommendations.push(`🚨 긴급: ${riskDistribution.critical}명이 위험 상태 - 즉시 스케줄 재조정 필요`)
    }
    
    if (riskDistribution.high >= analyses.length * 0.3) {
      urgentRecommendations.push(`⚠️ 팀 전체 30% 이상이 고위험 - 스케줄링 정책 전면 검토 필요`)
    }

    return {
      total_employees: analyses.length,
      risk_distribution: riskDistribution,
      critical_employees: criticalEmployees,
      common_issues: commonIssues,
      team_risk_score: Math.round(teamRiskScore),
      urgent_recommendations: urgentRecommendations
    }
  }
}
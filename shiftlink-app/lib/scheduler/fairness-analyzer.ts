// 진정한 공정성 측정 시스템
export interface FairnessMetrics {
  employee_id: string
  employee_name: string
  period: string // "2024-03"
  
  // 부담 분배 지표
  burden_distribution: {
    night_shifts_count: number
    weekend_shifts_count: number
    consecutive_work_days_avg: number
    unwanted_shifts_count: number // 선호하지 않는 시프트
    total_work_hours: number
  }
  
  // 기회 분배 지표  
  opportunity_distribution: {
    preferred_shifts_count: number
    holiday_off_count: number
    day_shifts_ratio: number // 선호도 높은 데이 시프트 비율
  }
  
  // 건강 형평성 지표
  health_equity: {
    fatigue_score_avg: number // 평균 피로도
    dangerous_patterns_count: number // 위험 패턴 노출 횟수
    recovery_time_avg: number // 평균 회복 시간
  }
  
  // 공정성 점수 (팀 내 상대적)
  fairness_scores: {
    burden_fairness: number // 0-100 (100이 가장 공정)
    opportunity_fairness: number
    health_fairness: number
    overall_fairness: number
  }
  
  analysis_date: string
}

export interface TeamFairnessAnalysis {
  team_id: string
  period: string
  total_employees: number
  
  // 팀 전체 불평등 지표
  inequality_metrics: {
    gini_coefficient: {
      night_shifts: number // 0-1 (0이 완전 평등)
      weekend_shifts: number
      work_hours: number
      preferred_shifts: number
    }
    standard_deviation: {
      night_shifts: number
      weekend_shifts: number
      work_hours: number
    }
    range_analysis: {
      night_shifts: { min: number, max: number, range: number }
      weekend_shifts: { min: number, max: number, range: number }
      work_hours: { min: number, max: number, range: number }
    }
  }
  
  // 팀 공정성 등급
  fairness_grade: 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable'
  fairness_score: number // 0-100
  
  // 문제 영역 식별
  problem_areas: {
    area: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    affected_employees: string[]
    description: string
    recommendations: string[]
  }[]
  
  // 개선 우선순위
  improvement_priorities: {
    priority: number
    action: string
    expected_impact: string
    target_employees?: string[]
  }[]
}

export class FairnessAnalyzer {
  /**
   * 개별 직원의 공정성 지표 분석
   */
  analyzeEmployeeFairness(
    employee: { id: string, name: string },
    assignments: Array<{
      date: string
      shift_type: string
      leave_type?: string
      is_preferred?: boolean
    }>,
    teamAverages: {
      avg_night_shifts: number
      avg_weekend_shifts: number
      avg_work_hours: number
      avg_preferred_ratio: number
    }
  ): FairnessMetrics {
    
    const workDays = assignments.filter(a => a.shift_type !== 'off' && !a.leave_type)
    const nightShifts = workDays.filter(a => a.shift_type === 'night')
    const weekendShifts = this.getWeekendShifts(workDays)
    const preferredShifts = workDays.filter(a => a.is_preferred === true)
    const unwantedShifts = workDays.filter(a => a.is_preferred === false)
    
    // 부담 분배 분석
    const burdenDistribution = {
      night_shifts_count: nightShifts.length,
      weekend_shifts_count: weekendShifts.length,
      consecutive_work_days_avg: this.calculateAvgConsecutiveWorkDays(assignments),
      unwanted_shifts_count: unwantedShifts.length,
      total_work_hours: workDays.length * 8 // 8시간 기준
    }
    
    // 기회 분배 분석
    const opportunityDistribution = {
      preferred_shifts_count: preferredShifts.length,
      holiday_off_count: this.getHolidayOffCount(assignments),
      day_shifts_ratio: workDays.filter(a => a.shift_type === 'day').length / workDays.length
    }
    
    // 건강 형평성 분석 (간단화)
    const healthEquity = {
      fatigue_score_avg: this.calculateFatigueScore(assignments),
      dangerous_patterns_count: this.countDangerousPatterns(assignments),
      recovery_time_avg: this.calculateAvgRecoveryTime(assignments)
    }
    
    // 공정성 점수 계산
    const fairnessScores = this.calculateFairnessScores(
      burdenDistribution,
      opportunityDistribution,
      healthEquity,
      teamAverages
    )
    
    return {
      employee_id: employee.id,
      employee_name: employee.name,
      period: new Date().toISOString().substring(0, 7), // YYYY-MM
      burden_distribution: burdenDistribution,
      opportunity_distribution: opportunityDistribution,
      health_equity: healthEquity,
      fairness_scores: fairnessScores,
      analysis_date: new Date().toISOString()
    }
  }
  
  /**
   * 팀 전체 공정성 분석
   */
  analyzeTeamFairness(employeeMetrics: FairnessMetrics[]): TeamFairnessAnalysis {
    if (employeeMetrics.length === 0) {
      throw new Error('No employee metrics provided')
    }
    
    // 각 지표별 배열 추출
    const nightShiftCounts = employeeMetrics.map(m => m.burden_distribution.night_shifts_count)
    const weekendShiftCounts = employeeMetrics.map(m => m.burden_distribution.weekend_shifts_count)
    const workHours = employeeMetrics.map(m => m.burden_distribution.total_work_hours)
    const preferredShiftCounts = employeeMetrics.map(m => m.opportunity_distribution.preferred_shifts_count)
    
    // 불평등 지표 계산
    const inequalityMetrics = {
      gini_coefficient: {
        night_shifts: this.calculateGiniCoefficient(nightShiftCounts),
        weekend_shifts: this.calculateGiniCoefficient(weekendShiftCounts),
        work_hours: this.calculateGiniCoefficient(workHours),
        preferred_shifts: this.calculateGiniCoefficient(preferredShiftCounts)
      },
      standard_deviation: {
        night_shifts: this.calculateStandardDeviation(nightShiftCounts),
        weekend_shifts: this.calculateStandardDeviation(weekendShiftCounts),
        work_hours: this.calculateStandardDeviation(workHours)
      },
      range_analysis: {
        night_shifts: this.calculateRange(nightShiftCounts),
        weekend_shifts: this.calculateRange(weekendShiftCounts),
        work_hours: this.calculateRange(workHours)
      }
    }
    
    // 팀 공정성 점수 계산
    const fairnessScore = this.calculateTeamFairnessScore(inequalityMetrics)
    const fairnessGrade = this.determineFairnessGrade(fairnessScore)
    
    // 문제 영역 식별
    const problemAreas = this.identifyProblemAreas(employeeMetrics, inequalityMetrics)
    
    // 개선 우선순위 생성
    const improvementPriorities = this.generateImprovementPriorities(problemAreas)
    
    return {
      team_id: employeeMetrics[0]?.employee_id || 'unknown', // 임시
      period: employeeMetrics[0]?.period || new Date().toISOString().substring(0, 7),
      total_employees: employeeMetrics.length,
      inequality_metrics: inequalityMetrics,
      fairness_grade: fairnessGrade,
      fairness_score: fairnessScore,
      problem_areas: problemAreas,
      improvement_priorities: improvementPriorities
    }
  }
  
  /**
   * 지니 계수 계산 (불평등 측정)
   */
  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0
    
    const sortedValues = values.slice().sort((a, b) => a - b)
    const n = sortedValues.length
    const sum = sortedValues.reduce((a, b) => a + b, 0)
    
    if (sum === 0) return 0
    
    let gini = 0
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sortedValues[i]
    }
    
    return gini / (n * sum)
  }
  
  /**
   * 표준편차 계산
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2))
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / values.length
    
    return Math.sqrt(variance)
  }
  
  /**
   * 범위 분석
   */
  private calculateRange(values: number[]): { min: number, max: number, range: number } {
    if (values.length === 0) return { min: 0, max: 0, range: 0 }
    
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    return { min, max, range: max - min }
  }
  
  /**
   * 주말 근무 추출
   */
  private getWeekendShifts(assignments: Array<{ date: string, shift_type: string }>): Array<{ date: string, shift_type: string }> {
    return assignments.filter(assignment => {
      const date = new Date(assignment.date)
      const dayOfWeek = date.getDay()
      return dayOfWeek === 0 || dayOfWeek === 6 // 일요일(0) 또는 토요일(6)
    })
  }
  
  /**
   * 평균 연속 근무일 계산
   */
  private calculateAvgConsecutiveWorkDays(assignments: Array<{ date: string, shift_type: string, leave_type?: string }>): number {
    const workStreaks: number[] = []
    let currentStreak = 0
    
    const sortedAssignments = assignments
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    for (const assignment of sortedAssignments) {
      if (assignment.shift_type !== 'off' && !assignment.leave_type) {
        currentStreak++
      } else {
        if (currentStreak > 0) {
          workStreaks.push(currentStreak)
          currentStreak = 0
        }
      }
    }
    
    if (currentStreak > 0) {
      workStreaks.push(currentStreak)
    }
    
    return workStreaks.length > 0 ? workStreaks.reduce((a, b) => a + b, 0) / workStreaks.length : 0
  }
  
  /**
   * 휴일 휴무 횟수 계산
   */
  private getHolidayOffCount(assignments: Array<{ date: string, shift_type: string }>): number {
    // 간단화: 주말 휴무 횟수로 계산
    const weekendOffs = assignments.filter(assignment => {
      const date = new Date(assignment.date)
      const dayOfWeek = date.getDay()
      return (dayOfWeek === 0 || dayOfWeek === 6) && assignment.shift_type === 'off'
    })
    
    return weekendOffs.length
  }
  
  /**
   * 피로도 점수 계산 (간단화)
   */
  private calculateFatigueScore(assignments: Array<{ date: string, shift_type: string, leave_type?: string }>): number {
    let fatigueScore = 0
    let consecutiveWorkDays = 0
    
    const sortedAssignments = assignments
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    for (const assignment of sortedAssignments) {
      if (assignment.shift_type !== 'off' && !assignment.leave_type) {
        consecutiveWorkDays++
        
        // 시프트별 피로도
        const shiftFatigue = {
          'night': 3,
          'evening': 2,
          'day': 1,
          'off': 0
        }[assignment.shift_type] || 1
        
        // 연속 근무에 따른 피로도 증가
        const consecutiveFatigue = consecutiveWorkDays > 3 ? (consecutiveWorkDays - 3) * 0.5 : 0
        
        fatigueScore += shiftFatigue + consecutiveFatigue
      } else {
        consecutiveWorkDays = 0
        fatigueScore = Math.max(0, fatigueScore - 1) // 휴식으로 피로도 회복
      }
    }
    
    return assignments.length > 0 ? fatigueScore / assignments.length : 0
  }
  
  /**
   * 위험 패턴 횟수 계산
   */
  private countDangerousPatterns(assignments: Array<{ date: string, shift_type: string, leave_type?: string }>): number {
    // NursingPatternAnalyzer와 연동하여 위험 패턴 감지
    // 간단화: 연속 나이트 4회 이상과 3교대 패턴 카운트
    let dangerousCount = 0
    let consecutiveNights = 0
    
    const workAssignments = assignments.filter(a => a.shift_type !== 'off' && !a.leave_type)
    
    // 연속 나이트 체크
    for (const assignment of workAssignments) {
      if (assignment.shift_type === 'night') {
        consecutiveNights++
        if (consecutiveNights >= 4) {
          dangerousCount++
        }
      } else {
        consecutiveNights = 0
      }
    }
    
    // 3교대 패턴 체크 (간단화)
    for (let i = 0; i <= workAssignments.length - 3; i++) {
      const threeShifts = workAssignments.slice(i, i + 3).map(a => a.shift_type)
      const uniqueShifts = new Set(threeShifts)
      if (uniqueShifts.size === 3 && 
          uniqueShifts.has('day') && 
          uniqueShifts.has('evening') && 
          uniqueShifts.has('night')) {
        dangerousCount++
      }
    }
    
    return dangerousCount
  }
  
  /**
   * 평균 회복 시간 계산
   */
  private calculateAvgRecoveryTime(assignments: Array<{ date: string, shift_type: string, leave_type?: string }>): number {
    const restPeriods: number[] = []
    let currentRest = 0
    let inRestPeriod = false
    
    const sortedAssignments = assignments
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    for (const assignment of sortedAssignments) {
      if (assignment.shift_type === 'off' || assignment.leave_type) {
        if (!inRestPeriod) {
          inRestPeriod = true
          currentRest = 1
        } else {
          currentRest++
        }
      } else {
        if (inRestPeriod) {
          restPeriods.push(currentRest)
          inRestPeriod = false
          currentRest = 0
        }
      }
    }
    
    return restPeriods.length > 0 ? restPeriods.reduce((a, b) => a + b, 0) / restPeriods.length : 0
  }
  
  /**
   * 개별 공정성 점수 계산
   */
  private calculateFairnessScores(
    burdenDistribution: any,
    opportunityDistribution: any,
    healthEquity: any,
    teamAverages: any
  ): { burden_fairness: number, opportunity_fairness: number, health_fairness: number, overall_fairness: number } {
    
    // 부담 공정성: 평균 대비 편차가 적을수록 높은 점수
    const burdenFairness = Math.max(0, 100 - Math.abs(burdenDistribution.night_shifts_count - teamAverages.avg_night_shifts) * 10)
    
    // 기회 공정성: 선호 시프트 비율이 평균에 가까울수록 높은 점수
    const currentPreferredRatio = opportunityDistribution.preferred_shifts_count / (burdenDistribution.total_work_hours / 8)
    const opportunityFairness = Math.max(0, 100 - Math.abs(currentPreferredRatio - teamAverages.avg_preferred_ratio) * 100)
    
    // 건강 공정성: 피로도와 위험 패턴이 적을수록 높은 점수
    const healthFairness = Math.max(0, 100 - healthEquity.fatigue_score_avg * 10 - healthEquity.dangerous_patterns_count * 20)
    
    const overallFairness = (burdenFairness + opportunityFairness + healthFairness) / 3
    
    return {
      burden_fairness: Math.round(burdenFairness),
      opportunity_fairness: Math.round(opportunityFairness),
      health_fairness: Math.round(healthFairness),
      overall_fairness: Math.round(overallFairness)
    }
  }
  
  /**
   * 팀 공정성 점수 계산
   */
  private calculateTeamFairnessScore(inequalityMetrics: any): number {
    // 지니 계수를 공정성 점수로 변환 (지니 계수가 낮을수록 공정)
    const giniScore = (1 - inequalityMetrics.gini_coefficient.night_shifts) * 100
    
    // 표준편차 점수 (표준편차가 낮을수록 공정)
    const nightStdScore = Math.max(0, 100 - inequalityMetrics.standard_deviation.night_shifts * 20)
    const weekendStdScore = Math.max(0, 100 - inequalityMetrics.standard_deviation.weekend_shifts * 25)
    
    // 가중 평균
    return Math.round((giniScore * 0.5 + nightStdScore * 0.3 + weekendStdScore * 0.2))
  }
  
  /**
   * 공정성 등급 결정
   */
  private determineFairnessGrade(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable' {
    if (score >= 90) return 'excellent'
    if (score >= 80) return 'good'
    if (score >= 60) return 'fair'
    if (score >= 40) return 'poor'
    return 'unacceptable'
  }
  
  /**
   * 문제 영역 식별
   */
  private identifyProblemAreas(employeeMetrics: FairnessMetrics[], inequalityMetrics: any): any[] {
    const problemAreas: any[] = []
    
    // 나이트 시프트 불평등 체크
    if (inequalityMetrics.gini_coefficient.night_shifts > 0.3) {
      const nightShiftRange = inequalityMetrics.range_analysis.night_shifts
      problemAreas.push({
        area: 'night_shift_inequality',
        severity: nightShiftRange.range > 5 ? 'high' : 'medium',
        affected_employees: employeeMetrics
          .filter(m => m.burden_distribution.night_shifts_count > nightShiftRange.min + nightShiftRange.range * 0.8)
          .map(m => m.employee_name),
        description: `나이트 근무 배정에서 ${nightShiftRange.range}회의 차이가 발생하고 있습니다`,
        recommendations: [
          '나이트 근무 로테이션 주기 조정',
          '개인별 나이트 근무 상한선 설정',
          '다음 달 스케줄에서 균형 조정'
        ]
      })
    }
    
    // 주말 근무 불평등 체크
    if (inequalityMetrics.standard_deviation.weekend_shifts > 2) {
      problemAreas.push({
        area: 'weekend_shift_inequality',
        severity: 'medium',
        affected_employees: employeeMetrics
          .filter(m => m.burden_distribution.weekend_shifts_count > 3)
          .map(m => m.employee_name),
        description: '주말 근무 분배가 불균등합니다',
        recommendations: [
          '주말 근무 로테이션 규칙 재검토',
          '주말 수당 또는 보상휴가 고려'
        ]
      })
    }
    
    return problemAreas
  }
  
  /**
   * 개선 우선순위 생성
   */
  private generateImprovementPriorities(problemAreas: any[]): any[] {
    const priorities: any[] = []
    
    problemAreas.forEach((problem, index) => {
      if (problem.severity === 'high' || problem.severity === 'critical') {
        priorities.push({
          priority: index + 1,
          action: `${problem.area} 개선`,
          expected_impact: '팀 공정성 10-15점 향상 예상',
          target_employees: problem.affected_employees
        })
      }
    })
    
    return priorities
  }
}
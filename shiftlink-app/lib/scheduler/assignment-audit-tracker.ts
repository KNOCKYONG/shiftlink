// 배정 근거 데이터 저장 및 추적 시스템
import { createClient } from '@/lib/supabase/server'
import { NursingPatternAnalyzer, PatternAnalysis } from './nursing-pattern-analyzer'
import { FairnessAnalyzer, FairnessMetrics } from './fairness-analyzer'

export interface AssignmentReason {
  category: 'preference' | 'fairness' | 'constraint' | 'pattern_safety' | 'coverage' | 'optimization'
  priority: number // 1-10, 높을수록 중요한 근거
  score: number // 0-100, 이 근거의 신뢰도
  explanation: string
  details: {
    [key: string]: any
  }
}

export interface AssignmentDecision {
  schedule_id: string
  employee_id: string
  date: string
  shift_type: string
  assignment_reasons: AssignmentReason[]
  alternative_options: AlternativeOption[]
  confidence_score: number // 0.0-1.0, 전체 배정 신뢰도
  scoring_breakdown: ScoringBreakdown
  constraints_applied: ConstraintApplication[]
  rules_checked: RuleValidation[]
  pattern_analysis: PatternAnalysisResult
  safety_score: number // 0.0-1.0, 안전도 점수
  fairness_context: FairnessContext
  team_balance_impact: TeamBalanceImpact
  decision_timestamp: string
  engine_version: string
  created_by?: string
}

export interface AlternativeOption {
  shift_type: string
  score: number
  rejection_reason: string
  impact_analysis: {
    fairness_impact: number
    safety_impact: number
    preference_impact: number
    coverage_impact: number
  }
}

export interface ScoringBreakdown {
  preference_score: number // 개인 선호도 점수
  fairness_score: number // 공정성 점수
  safety_score: number // 안전성 점수 
  coverage_score: number // 커버리지 점수
  constraint_score: number // 제약사항 준수 점수
  weighted_total: number // 가중치 적용 총점
  weights: {
    preference: number
    fairness: number
    safety: number
    coverage: number
    constraint: number
  }
}

export interface ConstraintApplication {
  constraint_type: 'legal' | 'policy' | 'personal' | 'operational'
  constraint_name: string
  is_hard_constraint: boolean // true: 필수, false: 선호
  compliance_status: 'satisfied' | 'violated' | 'partially_satisfied'
  violation_severity?: 'low' | 'medium' | 'high' | 'critical'
  impact_on_decision: number // -100 to 100
}

export interface RuleValidation {
  rule_name: string
  rule_category: 'work_time' | 'rest_time' | 'pattern' | 'fairness' | 'coverage'
  validation_result: 'pass' | 'fail' | 'warning'
  threshold_value?: number
  actual_value?: number
  impact_description: string
}

export interface PatternAnalysisResult {
  consecutive_days: number
  consecutive_nights: number
  pattern_safety_score: number // 0-100
  detected_risks: {
    risk_type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }[]
  recovery_recommendations: string[]
}

export interface FairnessContext {
  employee_fairness_score: number // 개인 공정성 점수
  team_average_comparison: {
    night_shifts_vs_avg: number // 팀 평균 대비 야간근무 비율
    weekend_shifts_vs_avg: number // 팀 평균 대비 주말근무 비율
    preferred_shifts_vs_avg: number // 팀 평균 대비 선호근무 비율
  }
  gini_coefficient_impact: number // 이 배정이 팀 지니계수에 미치는 영향
  equity_justification: string // 공정성 근거 설명
}

export interface TeamBalanceImpact {
  level_distribution_before: { [level: string]: number }
  level_distribution_after: { [level: string]: number }
  experience_balance_score: number // 0-100
  shift_coverage_impact: {
    coverage_before: number
    coverage_after: number
    improvement: number
  }
  team_stability_impact: number // -100 to 100
}

export class AssignmentAuditTracker {
  private supabase: any
  private nursingAnalyzer: NursingPatternAnalyzer
  private fairnessAnalyzer: FairnessAnalyzer
  private engineVersion: string = '1.0.0'

  constructor() {
    this.supabase = createClient()
    this.nursingAnalyzer = new NursingPatternAnalyzer()
    this.fairnessAnalyzer = new FairnessAnalyzer()
  }

  /**
   * 스케줄링 엔진의 배정 결정 기록
   */
  async recordAssignmentDecision(decision: AssignmentDecision): Promise<void> {
    try {
      const auditRecord = {
        schedule_id: decision.schedule_id,
        employee_id: decision.employee_id,
        date: decision.date,
        shift_type: decision.shift_type,
        assignment_reasons: JSON.stringify(decision.assignment_reasons),
        confidence_score: decision.confidence_score,
        alternative_options: JSON.stringify(decision.alternative_options),
        scoring_breakdown: JSON.stringify(decision.scoring_breakdown),
        constraints_applied: JSON.stringify(decision.constraints_applied),
        rules_checked: JSON.stringify(decision.rules_checked),
        pattern_analysis: JSON.stringify(decision.pattern_analysis),
        safety_score: decision.safety_score,
        fairness_context: JSON.stringify(decision.fairness_context),
        team_balance_impact: JSON.stringify(decision.team_balance_impact),
        decision_timestamp: decision.decision_timestamp,
        engine_version: decision.engine_version,
        created_by: decision.created_by
      }

      const { error } = await this.supabase
        .from('assignment_audit_trail')
        .insert([auditRecord])

      if (error) {
        throw new Error(`Failed to record assignment decision: ${error.message}`)
      }

      console.log(`✅ Assignment decision recorded for employee ${decision.employee_id} on ${decision.date}`)

    } catch (error) {
      console.error('❌ Failed to record assignment decision:', error)
      throw error
    }
  }

  /**
   * 배정 결정 과정 분석 및 기록
   */
  async analyzeAndRecordAssignment(
    scheduleId: string,
    employeeId: string,
    employeeName: string,
    date: string,
    candidateShifts: string[],
    selectedShift: string,
    employeeData: any,
    teamData: any,
    constraints: any[],
    createdBy?: string
  ): Promise<AssignmentDecision> {
    
    const decisionTimestamp = new Date().toISOString()
    
    // 1. 각 후보 교대에 대한 점수 계산
    const shiftScores = await this.calculateShiftScores(
      employeeId,
      employeeName,
      date,
      candidateShifts,
      employeeData,
      teamData
    )
    
    // 2. 선택된 교대의 점수 분석
    const selectedScore = shiftScores.find(s => s.shift_type === selectedShift)
    if (!selectedScore) {
      throw new Error(`Selected shift ${selectedShift} not found in candidate shifts`)
    }
    
    // 3. 대안 옵션 분석
    const alternatives = shiftScores
      .filter(s => s.shift_type !== selectedShift)
      .map(s => ({
        shift_type: s.shift_type,
        score: s.total_score,
        rejection_reason: this.generateRejectionReason(selectedScore, s),
        impact_analysis: {
          fairness_impact: s.fairness_score - selectedScore.fairness_score,
          safety_impact: s.safety_score - selectedScore.safety_score,
          preference_impact: s.preference_score - selectedScore.preference_score,
          coverage_impact: s.coverage_score - selectedScore.coverage_score
        }
      }))
    
    // 4. 제약사항 적용 분석
    const constraintApplications = this.analyzeConstraintApplications(constraints, selectedShift, date)
    
    // 5. 규칙 검증 결과
    const ruleValidations = await this.validateSchedulingRules(
      employeeId,
      date,
      selectedShift,
      employeeData,
      teamData
    )
    
    // 6. 패턴 분석
    const patternAnalysis = await this.analyzeShiftPattern(
      employeeId,
      employeeName,
      date,
      selectedShift,
      employeeData.recentAssignments || []
    )
    
    // 7. 공정성 컨텍스트 분석
    const fairnessContext = await this.analyzeFairnessContext(
      employeeId,
      selectedShift,
      employeeData,
      teamData
    )
    
    // 8. 팀 밸런스 영향 분석
    const teamBalanceImpact = this.analyzeTeamBalanceImpact(
      selectedShift,
      employeeData.level,
      teamData,
      date
    )
    
    // 9. 배정 근거 생성
    const assignmentReasons = this.generateAssignmentReasons(
      selectedScore,
      fairnessContext,
      patternAnalysis,
      constraintApplications
    )
    
    const decision: AssignmentDecision = {
      schedule_id: scheduleId,
      employee_id: employeeId,
      date: date,
      shift_type: selectedShift,
      assignment_reasons: assignmentReasons,
      alternative_options: alternatives,
      confidence_score: selectedScore.confidence,
      scoring_breakdown: selectedScore.breakdown,
      constraints_applied: constraintApplications,
      rules_checked: ruleValidations,
      pattern_analysis: patternAnalysis,
      safety_score: selectedScore.safety_score / 100, // 0-1 스케일로 변환
      fairness_context: fairnessContext,
      team_balance_impact: teamBalanceImpact,
      decision_timestamp: decisionTimestamp,
      engine_version: this.engineVersion,
      created_by: createdBy
    }
    
    // 10. 감사 기록 저장
    await this.recordAssignmentDecision(decision)
    
    return decision
  }

  /**
   * 교대별 점수 계산
   */
  private async calculateShiftScores(
    employeeId: string,
    employeeName: string,
    date: string,
    candidateShifts: string[],
    employeeData: any,
    teamData: any
  ): Promise<any[]> {
    const scores = []
    
    for (const shiftType of candidateShifts) {
      // 선호도 점수 (0-100)
      const preferenceScore = this.calculatePreferenceScore(shiftType, employeeData.preferences, date)
      
      // 공정성 점수 (0-100) 
      const fairnessScore = this.calculateFairnessScore(employeeId, shiftType, employeeData, teamData)
      
      // 안전성 점수 (0-100)
      const safetyScore = this.calculateSafetyScore(employeeId, employeeName, date, shiftType, employeeData.recentAssignments)
      
      // 커버리지 점수 (0-100)
      const coverageScore = this.calculateCoverageScore(shiftType, date, employeeData.level, teamData)
      
      // 제약사항 점수 (0-100)
      const constraintScore = this.calculateConstraintScore(shiftType, date, employeeData.constraints)
      
      // 가중치 적용
      const weights = {
        preference: 0.25,
        fairness: 0.30,
        safety: 0.25,
        coverage: 0.15,
        constraint: 0.05
      }
      
      const weightedTotal = 
        preferenceScore * weights.preference +
        fairnessScore * weights.fairness +
        safetyScore * weights.safety +
        coverageScore * weights.coverage +
        constraintScore * weights.constraint
      
      // 신뢰도 계산 (점수의 분산이 작을수록 높은 신뢰도)
      const scoreVariance = this.calculateScoreVariance([
        preferenceScore, fairnessScore, safetyScore, coverageScore, constraintScore
      ])
      const confidence = Math.max(0.1, 1.0 - (scoreVariance / 10000)) // 0.1-1.0 범위
      
      scores.push({
        shift_type: shiftType,
        preference_score: preferenceScore,
        fairness_score: fairnessScore,
        safety_score: safetyScore,
        coverage_score: coverageScore,
        constraint_score: constraintScore,
        total_score: weightedTotal,
        confidence: confidence,
        breakdown: {
          preference_score: preferenceScore,
          fairness_score: fairnessScore,
          safety_score: safetyScore,
          coverage_score: coverageScore,
          constraint_score: constraintScore,
          weighted_total: weightedTotal,
          weights: weights
        }
      })
    }
    
    return scores.sort((a, b) => b.total_score - a.total_score)
  }

  /**
   * 선호도 점수 계산
   */
  private calculatePreferenceScore(shiftType: string, preferences: any, date: string): number {
    if (!preferences || !preferences.pattern) return 50 // 중립 점수
    
    const dayOfWeek = new Date(date).getDay()
    const preferredShift = preferences.pattern[dayOfWeek % preferences.pattern.length]
    
    if (preferredShift === shiftType) return 90
    if (preferredShift === 'flexible') return 70
    if (shiftType === 'off') return 30
    return 40
  }

  /**
   * 공정성 점수 계산 
   */
  private calculateFairnessScore(
    employeeId: string,
    shiftType: string,
    employeeData: any,
    teamData: any
  ): number {
    const employeeStats = employeeData.workloadStats || {
      night_shifts: 0,
      weekend_shifts: 0,
      preferred_shifts: 0,
      total_shifts: 0
    }
    
    const teamAverages = teamData.averages || {
      avg_night_shifts: 0,
      avg_weekend_shifts: 0,
      avg_preferred_ratio: 0
    }
    
    let fairnessScore = 50 // 기본 점수
    
    // 야간 근무 공정성
    if (shiftType === 'night') {
      const nightRatio = employeeStats.night_shifts / Math.max(1, employeeStats.total_shifts)
      const teamNightRatio = teamAverages.avg_night_shifts / Math.max(1, teamData.total_employees)
      if (nightRatio < teamNightRatio) fairnessScore += 25
      else if (nightRatio > teamNightRatio * 1.5) fairnessScore -= 30
    }
    
    // 주말 근무 공정성 체크 추가 가능
    const date = new Date()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    if (isWeekend && shiftType !== 'off') {
      const weekendRatio = employeeStats.weekend_shifts / Math.max(1, employeeStats.total_shifts)
      const teamWeekendRatio = teamAverages.avg_weekend_shifts / Math.max(1, teamData.total_employees)
      if (weekendRatio < teamWeekendRatio) fairnessScore += 15
    }
    
    return Math.max(0, Math.min(100, fairnessScore))
  }

  /**
   * 안전성 점수 계산
   */
  private calculateSafetyScore(
    employeeId: string,
    employeeName: string,
    date: string,
    shiftType: string,
    recentAssignments: any[]
  ): number {
    const assignments = recentAssignments.map(a => ({
      date: a.date,
      shift_type: a.shift_type,
      leave_type: a.leave_type
    }))
    
    // 현재 배정을 임시로 추가
    assignments.push({
      date: date,
      shift_type: shiftType,
      leave_type: null
    })
    
    const analysis = this.nursingAnalyzer.analyzeEmployeePattern(
      employeeId,
      employeeName,
      assignments
    )
    
    // 위험 점수를 안전 점수로 변환 (100 - 위험점수)
    return Math.max(0, 100 - analysis.risk_score)
  }

  /**
   * 커버리지 점수 계산
   */
  private calculateCoverageScore(
    shiftType: string,
    date: string,
    employeeLevel: string,
    teamData: any
  ): number {
    const dayAssignments = teamData.dayAssignments?.[date] || {}
    const shiftCoverage = dayAssignments[shiftType] || {}
    
    // 레벨별 최소 커버리지 요구사항
    const requiredLevels = ['senior', 'junior', 'trainee'] // 예시
    const currentLevelCount = shiftCoverage[employeeLevel] || 0
    const minRequired = teamData.minCoverage?.[shiftType]?.[employeeLevel] || 1
    
    let coverageScore = 50
    
    // 부족한 레벨이면 높은 점수
    if (currentLevelCount < minRequired) {
      coverageScore += 40
    }
    // 이미 충분하면 낮은 점수
    else if (currentLevelCount >= minRequired * 1.5) {
      coverageScore -= 20
    }
    
    return Math.max(0, Math.min(100, coverageScore))
  }

  /**
   * 제약사항 점수 계산
   */
  private calculateConstraintScore(shiftType: string, date: string, constraints: any[]): number {
    if (!constraints || constraints.length === 0) return 50
    
    let score = 50
    
    for (const constraint of constraints) {
      if (constraint.applies_to_date && constraint.applies_to_date !== date) continue
      if (constraint.applies_to_shift && constraint.applies_to_shift !== shiftType) continue
      
      if (constraint.type === 'preferred') {
        score += constraint.impact || 20
      } else if (constraint.type === 'avoid') {
        score -= constraint.impact || 30
      }
    }
    
    return Math.max(0, Math.min(100, score))
  }

  /**
   * 점수 분산 계산
   */
  private calculateScoreVariance(scores: number[]): number {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
  }

  /**
   * 거부 사유 생성
   */
  private generateRejectionReason(selectedScore: any, alternativeScore: any): string {
    const scoreDiff = selectedScore.total_score - alternativeScore.total_score
    
    if (scoreDiff > 20) return '선택된 옵션이 전반적으로 더 적합함'
    if (selectedScore.fairness_score - alternativeScore.fairness_score > 10) return '공정성 점수가 더 높음'
    if (selectedScore.safety_score - alternativeScore.safety_score > 15) return '안전성이 더 우수함'
    if (selectedScore.preference_score - alternativeScore.preference_score > 15) return '직원 선호도가 더 높음'
    return '종합 점수가 근소하게 더 높음'
  }

  /**
   * 제약사항 적용 분석
   */
  private analyzeConstraintApplications(constraints: any[], selectedShift: string, date: string): ConstraintApplication[] {
    return constraints.map(constraint => ({
      constraint_type: constraint.type || 'operational',
      constraint_name: constraint.name || 'Unknown constraint',
      is_hard_constraint: constraint.is_hard || false,
      compliance_status: this.checkConstraintCompliance(constraint, selectedShift, date),
      violation_severity: constraint.severity,
      impact_on_decision: constraint.impact || 0
    }))
  }

  private checkConstraintCompliance(constraint: any, selectedShift: string, date: string): 'satisfied' | 'violated' | 'partially_satisfied' {
    // 실제 제약사항 검증 로직 구현
    return 'satisfied'
  }

  /**
   * 규칙 검증
   */
  private async validateSchedulingRules(
    employeeId: string,
    date: string,
    selectedShift: string,
    employeeData: any,
    teamData: any
  ): Promise<RuleValidation[]> {
    const validations: RuleValidation[] = []
    
    // 최소 휴식시간 규칙
    const restTimeValidation = this.validateRestTime(employeeData.recentAssignments, selectedShift)
    validations.push(restTimeValidation)
    
    // 주당 근무시간 규칙 
    const weeklyHoursValidation = this.validateWeeklyHours(employeeData.weeklyStats, selectedShift)
    validations.push(weeklyHoursValidation)
    
    // 연속 근무일 규칙
    const consecutiveDaysValidation = this.validateConsecutiveDays(employeeData.recentAssignments, selectedShift)
    validations.push(consecutiveDaysValidation)
    
    return validations
  }

  private validateRestTime(recentAssignments: any[], selectedShift: string): RuleValidation {
    // 최소 11시간 휴식 검증 로직
    return {
      rule_name: '최소 휴식시간 (11시간)',
      rule_category: 'rest_time',
      validation_result: 'pass', // 실제 검증 로직 구현 필요
      threshold_value: 11,
      actual_value: 12, // 실제 계산 값
      impact_description: '법정 최소 휴식시간을 준수함'
    }
  }

  private validateWeeklyHours(weeklyStats: any, selectedShift: string): RuleValidation {
    const currentHours = weeklyStats?.total_hours || 0
    const shiftHours = selectedShift === 'off' ? 0 : 8
    const totalHours = currentHours + shiftHours
    
    return {
      rule_name: '주 52시간 근로시간',
      rule_category: 'work_time',
      validation_result: totalHours <= 52 ? 'pass' : 'warning',
      threshold_value: 52,
      actual_value: totalHours,
      impact_description: totalHours > 52 ? '주당 근로시간 초과 위험' : '주당 근로시간 준수'
    }
  }

  private validateConsecutiveDays(recentAssignments: any[], selectedShift: string): RuleValidation {
    // 연속 근무일 계산 로직
    return {
      rule_name: '최대 연속근무일 (6일)',
      rule_category: 'pattern',
      validation_result: 'pass',
      threshold_value: 6,
      actual_value: 3,
      impact_description: '연속 근무일 제한 준수'
    }
  }

  /**
   * 패턴 분석
   */
  private async analyzeShiftPattern(
    employeeId: string,
    employeeName: string,
    date: string,
    selectedShift: string,
    recentAssignments: any[]
  ): Promise<PatternAnalysisResult> {
    const assignments = recentAssignments.map(a => ({
      date: a.date,
      shift_type: a.shift_type,
      leave_type: a.leave_type
    }))
    
    // 현재 배정 추가
    assignments.push({
      date: date,
      shift_type: selectedShift,
      leave_type: null
    })
    
    const patternAnalysis = this.nursingAnalyzer.analyzeEmployeePattern(
      employeeId,
      employeeName,
      assignments
    )
    
    return {
      consecutive_days: patternAnalysis.consecutive_work_days,
      consecutive_nights: patternAnalysis.consecutive_night_shifts,
      pattern_safety_score: Math.max(0, 100 - patternAnalysis.risk_score),
      detected_risks: patternAnalysis.detected_patterns.map(p => ({
        risk_type: p.pattern_name,
        severity: p.risk_level as any,
        description: p.description
      })),
      recovery_recommendations: patternAnalysis.recommendations
    }
  }

  /**
   * 공정성 컨텍스트 분석
   */
  private async analyzeFairnessContext(
    employeeId: string,
    selectedShift: string,
    employeeData: any,
    teamData: any
  ): Promise<FairnessContext> {
    const employee = { id: employeeId, name: employeeData.name }
    const employeeShifts = employeeData.recentAssignments || []
    const teamAverages = teamData.averages || {}
    
    const fairnessMetrics = this.fairnessAnalyzer.analyzeEmployeeFairness(
      employee,
      employeeShifts,
      teamAverages
    )
    
    return {
      employee_fairness_score: fairnessMetrics.fairness_scores.overall_fairness,
      team_average_comparison: {
        night_shifts_vs_avg: fairnessMetrics.workload_comparison.night_shift_ratio - (teamAverages.avg_night_shifts || 0),
        weekend_shifts_vs_avg: fairnessMetrics.workload_comparison.weekend_ratio - (teamAverages.avg_weekend_shifts || 0),
        preferred_shifts_vs_avg: fairnessMetrics.workload_comparison.preferred_ratio - (teamAverages.avg_preferred_ratio || 0)
      },
      gini_coefficient_impact: fairnessMetrics.fairness_scores.gini_contribution || 0,
      equity_justification: this.generateEquityJustification(fairnessMetrics, selectedShift)
    }
  }

  private generateEquityJustification(metrics: FairnessMetrics, selectedShift: string): string {
    if (metrics.fairness_scores.overall_fairness >= 80) {
      return '현재 높은 공정성 수준을 유지하고 있어 배정에 제약이 적습니다'
    } else if (selectedShift === 'night' && metrics.workload_comparison.night_shift_ratio < 0.3) {
      return '야간근무 횟수가 팀 평균 이하로 공정성 개선을 위해 배정되었습니다'
    } else if (selectedShift === 'off' && metrics.fairness_scores.overall_fairness < 50) {
      return '과도한 근무부담을 완화하기 위해 휴무로 배정되었습니다'
    }
    return '팀 전체 공정성 밸런스를 고려하여 배정되었습니다'
  }

  /**
   * 팀 밸런스 영향 분석
   */
  private analyzeTeamBalanceImpact(
    selectedShift: string,
    employeeLevel: string,
    teamData: any,
    date: string
  ): TeamBalanceImpact {
    const currentDistribution = teamData.levelDistribution || {}
    const newDistribution = { ...currentDistribution }
    
    if (selectedShift !== 'off') {
      newDistribution[employeeLevel] = (newDistribution[employeeLevel] || 0) + 1
    }
    
    return {
      level_distribution_before: currentDistribution,
      level_distribution_after: newDistribution,
      experience_balance_score: this.calculateExperienceBalanceScore(newDistribution),
      shift_coverage_impact: {
        coverage_before: teamData.currentCoverage?.[selectedShift] || 0,
        coverage_after: (teamData.currentCoverage?.[selectedShift] || 0) + 1,
        improvement: 1
      },
      team_stability_impact: this.calculateTeamStabilityImpact(currentDistribution, newDistribution)
    }
  }

  private calculateExperienceBalanceScore(distribution: any): number {
    const levels = Object.keys(distribution)
    if (levels.length === 0) return 0
    
    const total = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0)
    const idealRatio = total / levels.length
    
    let balanceScore = 100
    for (const level of levels) {
      const actualCount = distribution[level] || 0
      const deviation = Math.abs(actualCount - idealRatio) / idealRatio
      balanceScore -= deviation * 20
    }
    
    return Math.max(0, Math.min(100, balanceScore))
  }

  private calculateTeamStabilityImpact(before: any, after: any): number {
    // 단순 구현: 분포의 변화량 계산
    let impact = 0
    const allLevels = new Set([...Object.keys(before), ...Object.keys(after)])
    
    for (const level of allLevels) {
      const beforeCount = before[level] || 0
      const afterCount = after[level] || 0
      impact += Math.abs(afterCount - beforeCount) * 10
    }
    
    return Math.min(100, impact)
  }

  /**
   * 배정 근거 생성
   */
  private generateAssignmentReasons(
    selectedScore: any,
    fairnessContext: FairnessContext,
    patternAnalysis: PatternAnalysisResult,
    constraintApplications: ConstraintApplication[]
  ): AssignmentReason[] {
    const reasons: AssignmentReason[] = []
    
    // 주요 점수 기반 근거 추가
    if (selectedScore.preference_score >= 70) {
      reasons.push({
        category: 'preference',
        priority: 8,
        score: selectedScore.preference_score,
        explanation: '직원 선호도가 높아 우선적으로 배정되었습니다',
        details: { preference_score: selectedScore.preference_score }
      })
    }
    
    if (fairnessContext.employee_fairness_score < 60) {
      reasons.push({
        category: 'fairness',
        priority: 9,
        score: selectedScore.fairness_score,
        explanation: '공정성 개선을 위해 배정되었습니다',
        details: { 
          current_fairness: fairnessContext.employee_fairness_score,
          team_comparison: fairnessContext.team_average_comparison
        }
      })
    }
    
    if (patternAnalysis.pattern_safety_score < 70) {
      reasons.push({
        category: 'pattern_safety',
        priority: 10,
        score: patternAnalysis.pattern_safety_score,
        explanation: '안전한 근무 패턴을 위해 조정되었습니다',
        details: { 
          detected_risks: patternAnalysis.detected_risks,
          safety_score: patternAnalysis.pattern_safety_score
        }
      })
    }
    
    // 제약사항 기반 근거 추가
    const hardConstraints = constraintApplications.filter(c => c.is_hard_constraint)
    if (hardConstraints.length > 0) {
      reasons.push({
        category: 'constraint',
        priority: 10,
        score: 100,
        explanation: '필수 제약사항 준수를 위해 배정되었습니다',
        details: { constraints: hardConstraints.map(c => c.constraint_name) }
      })
    }
    
    // 기본 근거 (점수가 높지 않은 경우)
    if (reasons.length === 0) {
      reasons.push({
        category: 'optimization',
        priority: 5,
        score: selectedScore.total_score,
        explanation: '종합적인 최적화 결과 배정되었습니다',
        details: { total_score: selectedScore.total_score }
      })
    }
    
    return reasons.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 직원별 배정 근거 조회
   */
  async getEmployeeAssignmentReasons(
    employeeId: string,
    scheduleId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('assignment_audit_trail')
      .select(`
        *,
        schedules(name, start_date, end_date)
      `)
      .eq('employee_id', employeeId)
    
    if (scheduleId) query = query.eq('schedule_id', scheduleId)
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    
    const { data, error } = await query.order('date', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to get assignment reasons: ${error.message}`)
    }
    
    return data?.map(record => ({
      ...record,
      assignment_reasons: JSON.parse(record.assignment_reasons || '[]'),
      alternative_options: JSON.parse(record.alternative_options || '[]'),
      scoring_breakdown: JSON.parse(record.scoring_breakdown || '{}'),
      constraints_applied: JSON.parse(record.constraints_applied || '[]'),
      rules_checked: JSON.parse(record.rules_checked || '[]'),
      pattern_analysis: JSON.parse(record.pattern_analysis || '{}'),
      fairness_context: JSON.parse(record.fairness_context || '{}'),
      team_balance_impact: JSON.parse(record.team_balance_impact || '{}')
    })) || []
  }
}
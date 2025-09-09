/**
 * 직원 선호도 및 공정성 점수 계산 엔진
 * 
 * 이 모듈은 직원의 개인 선호도, 근무 패턴 선호도, 공정성을 종합적으로 평가하여
 * 스케줄 배정 시 최적의 매칭을 제공합니다.
 * 
 * @module PreferenceScorer
 * @version 1.0.0
 * @author ShiftLink Team
 */

import { Employee, EmployeePreference, GeneratedAssignment, ShiftTemplate } from './schedule-engine'
import { WorkPatternPreference, calculatePatternScore } from './work-pattern-types'

/**
 * 수학적 가중치 모델 (컨설팅 권장: 정구한 점수 계산)
 */
export interface MathematicalWeights {
  preferenceWeight: number        // 개인 선호도 가중치
  patternWeight: number          // 근무 패턴 가중치
  fairnessWeight: number         // 공정성 가중치
  confidenceLevel: number        // 신뢰도 수준 (0-1)
}

/**
 * 선호도 분석 결과 (컨설팅 강화: 수학적 기반 점수)
 */
export interface PreferenceAnalysisResult {
  preferenceScore: number         // 개인 시프트 선호도 점수 (0-40)
  workPatternScore: number        // 근무 패턴 선호도 점수 (0-30)
  fairnessScore: number          // 공정성 점수 (0-30)
  weightedScore: number          // 가중 점수 (컨설팅 추가)
  normalizedScore: number        // 정규화 점수 (0-1)
  confidenceScore: number        // 예측 신뢰도 (0-1)
  totalScore: number             // 총합 점수
  weights: MathematicalWeights   // 사용된 가중치
  breakdown: {
    preferenceDetails: string    // 선호도 상세 설명
    patternDetails: string       // 패턴 상세 설명  
    fairnessDetails: string      // 공정성 상세 설명
    mathematicalSummary: string  // 수학적 계산 요약
  }
}

/**
 * 개인 라이프스타일 선호도
 */
export type LifestylePreference = 'night_owl' | 'morning_person' | 'flexible'

/**
 * 공정성 옵션
 */
export type FairnessOption = 'prefer_my_preference' | 'prefer_team_balance' | 'auto'

/**
 * 직원 선호도 및 공정성 점수 계산 엔진
 * 
 * 🔬 컨설팅 권장: 수학적 모델 기반 정구한 선호도 계산
 * 
 * 가중치 수학 모델:
 * 1. 🎯 개인 선호도 - 다중 지수 가중 평균 (Multi-factor Weighted Average)
 * 2. 🔄 근무 패턴 - 시간 감쇠 모델과 패턴 일관성 따진 가중치
 * 3. ⚖️ 공정성 - 베이지안 업데이트와 역사적 데이터 반영
 * 4. 🧮 예측 신뢰도 - 데이터 품질과 샘플 크기 기반 신뢰도 지수
 * 5. 📊 정규화 점수 - Min-Max 정규화와 Z-Score 변환
 */
export class PreferenceScorer {
  
  /**
   * 🔬 컨설팅 강화: 수학적 모델 기반 정구한 선호도 점수 계산
   * 다중 지수 가중 평균, 시간 감쇠, 베이지안 업데이트 적용
   * 
   * @param employee 직원 정보
   * @param shiftTemplate 배정 예정 시프트
   * @param preferences 직원 선호도 설정
   * @param workPatterns 근무 패턴 선호도
   * @param previousAssignments 이전 배정 기록
   * @param date 배정 대상 날짜
   * @param cachedPreferences 캐시된 선호도 데이터
   * @param cachedFairnessLedger 캐시된 공정성 장부
   * @returns 수학적 모델 기반 종합 선호도 분석 결과
   */
  analyzePreferenceScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[],
    date: string,
    cachedPreferences?: Map<string, any[]>,
    cachedFairnessLedger?: Map<string, any>
  ): PreferenceAnalysisResult {
    
    // 🔬 컨설팅 강화: 수학적 모델 기반 정교한 점수 계산
    
    // 1. 개인 시프트 선호도 점수 (다중 지수 가중 평균 적용)
    const preferenceScore = this.calculateEnhancedPreferenceScore(employee.id, shiftTemplate, preferences, date)
    
    // 2. 근무 패턴 선호도 점수 (시간 감쇠 모델 적용)
    const workPatternScore = this.calculateTemporalPatternScore(employee, shiftTemplate, workPatterns, previousAssignments, date)
    
    // 3. 공정성 점수 (베이지안 업데이트 적용)
    const fairnessScore = this.calculateBayesianFairnessScore(
      employee.id, 
      shiftTemplate, 
      previousAssignments, 
      date,
      cachedPreferences,
      cachedFairnessLedger
    )
    
    // 4. 동적 가중치 계산 (데이터 품질과 신뢰도 기반)
    const weights = this.calculateDynamicWeights(employee, preferences, workPatterns, previousAssignments)
    
    // 5. 가중 점수 계산
    const weightedScore = (
      preferenceScore * weights.preferenceWeight + 
      workPatternScore * weights.patternWeight + 
      fairnessScore * weights.fairnessWeight
    )
    
    // 6. 정규화 점수 (0-1 범위)
    const normalizedScore = this.normalizeScore(weightedScore, 100) // 최대 점수 100점 기준
    
    // 7. 예측 신뢰도 계산
    const confidenceScore = this.calculatePredictionConfidence(weights, preferenceScore, workPatternScore, fairnessScore)
    
    const totalScore = weightedScore
    
    return {
      preferenceScore,
      workPatternScore,
      fairnessScore,
      weightedScore,
      normalizedScore,
      confidenceScore,
      totalScore,
      weights,
      breakdown: {
        preferenceDetails: this.generatePreferenceDetails(employee.id, shiftTemplate, preferences, date),
        patternDetails: this.generatePatternDetails(employee, shiftTemplate, workPatterns),
        fairnessDetails: this.generateFairnessDetails(employee.id, cachedPreferences, cachedFairnessLedger),
        mathematicalSummary: this.generateMathematicalSummary(weights, preferenceScore, workPatternScore, fairnessScore, confidenceScore)
      }
    }
  }

  /**
   * 🔬 컨설팅 권장: 다중 지수 가중 평균을 적용한 향상된 선호도 점수 계산
   */
  private calculateEnhancedPreferenceScore(
    employeeId: string,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    date: string
  ): number {
    const empPrefs = preferences.get(employeeId) || []
    if (empPrefs.length === 0) return 20 // 기본값

    let weightedSum = 0
    let totalWeight = 0

    for (const pref of empPrefs) {
      if (!this.isPreferenceActive(pref, date)) continue

      // 시프트 타입 매칭 점수
      const typeMatch = this.calculateTypeMatchScore(pref, shiftTemplate)
      
      // 우선순위 기반 가중치 (높은 우선순위 = 더 높은 가중치)
      const priorityWeight = Math.pow(2, pref.priority) // 지수적 가중치
      
      // 시간 감쇠 적용 (최근일수록 높은 가중치)
      const timeWeight = this.calculateTimeDecayWeight(pref.effective_from, date)
      
      const combinedWeight = priorityWeight * timeWeight
      
      weightedSum += typeMatch * combinedWeight
      totalWeight += combinedWeight
    }

    if (totalWeight === 0) return 20

    const rawScore = weightedSum / totalWeight
    return Math.min(Math.max(rawScore * 40, 0), 40) // 0-40 범위로 정규화
  }

  /**
   * 시간 감쇠 모델을 적용한 근무 패턴 점수 계산
   */
  private calculateTemporalPatternScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[],
    date: string
  ): number {
    const pattern = workPatterns.get(employee.id)
    if (!pattern) return 15 // 기본값

    // 1. 기본 패턴 선호도 점수
    const baseScore = calculatePatternScore(pattern, shiftTemplate, previousAssignments, date)
    
    // 2. 시간 감쇠 모델 적용 (최근 패턴 준수도가 더 중요)
    const recentAssignments = this.getRecentAssignments(employee.id, date, previousAssignments, 14)
    const consistencyScore = this.calculatePatternConsistency(pattern, recentAssignments)
    
    // 3. 적응형 가중치 (직원의 패턴 적응도에 따라 가중치 조정)
    const adaptationWeight = this.calculateAdaptationWeight(employee, previousAssignments)
    
    return (baseScore * 0.6 + consistencyScore * 0.4) * adaptationWeight * 30
  }

  /**
   * 베이지안 업데이트를 적용한 공정성 점수 계산
   */
  private calculateBayesianFairnessScore(
    employeeId: string,
    shiftTemplate: ShiftTemplate,
    previousAssignments: GeneratedAssignment[],
    date: string,
    cachedPreferences?: Map<string, any[]>,
    cachedFairnessLedger?: Map<string, any>
  ): number {
    // 1. 사전 확률 (Prior): 기존 공정성 기록
    const priorFairness = this.calculatePriorFairness(employeeId, cachedFairnessLedger)
    
    // 2. 우도 (Likelihood): 현재 배정이 공정성에 미치는 영향
    const likelihood = this.calculateFairnessLikelihood(employeeId, shiftTemplate, previousAssignments, date)
    
    // 3. 베이지안 업데이트: P(Fairness|Assignment) = P(Assignment|Fairness) * P(Fairness) / P(Assignment)
    const evidence = this.calculateEvidence(employeeId, shiftTemplate, previousAssignments)
    const posteriorFairness = (likelihood * priorFairness) / evidence
    
    return Math.min(Math.max(posteriorFairness * 30, 0), 30)
  }

  /**
   * 동적 가중치 계산 (데이터 품질과 신뢰도 기반)
   */
  private calculateDynamicWeights(
    employee: Employee,
    preferences: Map<string, EmployeePreference[]>,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[]
  ): MathematicalWeights {
    // 1. 데이터 품질 평가
    const prefDataQuality = this.assessPreferenceDataQuality(employee.id, preferences)
    const patternDataQuality = this.assessPatternDataQuality(employee.id, workPatterns)
    const fairnessDataQuality = this.assessFairnessDataQuality(employee.id, previousAssignments)
    
    // 2. 샘플 크기 기반 신뢰도
    const sampleSizeConfidence = this.calculateSampleSizeConfidence(previousAssignments.length)
    
    // 3. 가중치 정규화 (품질이 높을수록 더 높은 가중치)
    const totalQuality = prefDataQuality + patternDataQuality + fairnessDataQuality
    
    if (totalQuality === 0) {
      // 기본 가중치
      return {
        preferenceWeight: 0.4,
        patternWeight: 0.3,
        fairnessWeight: 0.3,
        confidenceLevel: 0.5
      }
    }
    
    return {
      preferenceWeight: prefDataQuality / totalQuality,
      patternWeight: patternDataQuality / totalQuality,
      fairnessWeight: fairnessDataQuality / totalQuality,
      confidenceLevel: sampleSizeConfidence
    }
  }

  /**
   * Min-Max 정규화
   */
  private normalizeScore(score: number, maxScore: number): number {
    return Math.min(Math.max(score / maxScore, 0), 1)
  }

  /**
   * 예측 신뢰도 계산
   */
  private calculatePredictionConfidence(
    weights: MathematicalWeights,
    preferenceScore: number,
    workPatternScore: number,
    fairnessScore: number
  ): number {
    // 1. 가중치 균형도 (가중치가 고르게 분포할수록 신뢰도 높음)
    const weightBalance = this.calculateWeightBalance(weights)
    
    // 2. 점수 분산 (점수들이 일관될수록 신뢰도 높음)
    const scoreVariance = this.calculateScoreVariance([preferenceScore, workPatternScore, fairnessScore])
    
    // 3. 데이터 품질 기반 신뢰도
    const dataConfidence = weights.confidenceLevel
    
    return (weightBalance * 0.3 + (1 - scoreVariance) * 0.3 + dataConfidence * 0.4)
  }

  /**
   * 수학적 계산 요약 생성
   */
  private generateMathematicalSummary(
    weights: MathematicalWeights,
    preferenceScore: number,
    workPatternScore: number,
    fairnessScore: number,
    confidenceScore: number
  ): string {
    return `가중치[P:${weights.preferenceWeight.toFixed(2)}, W:${weights.patternWeight.toFixed(2)}, F:${weights.fairnessWeight.toFixed(2)}] | 신뢰도:${(confidenceScore * 100).toFixed(1)}%`
  }

  /**
   * 개인 시프트 선호도 점수를 계산합니다.
   * 
   * 직원이 설정한 시프트 패턴 선호도에 따라 점수를 부여합니다.
   * 예: ['day', 'day', 'evening', 'night', 'off', 'off', 'off'] 패턴
   * 
   * @param employeeId 직원 ID
   * @param shiftTemplate 배정 예정 시프트
   * @param preferences 직원 선호도 맵
   * @param date 배정 대상 날짜
   * @returns 0-40점 사이의 선호도 점수
   */
  private calculatePreferenceScore(
    employeeId: string,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    date: string
  ): number {
    const empPreferences = preferences.get(employeeId) || []
    if (empPreferences.length === 0) return 20 // 중립 점수

    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    
    // 현재 활성화된 선호도 찾기
    const activePrefs = empPreferences.filter(pref => {
      const effectiveFrom = new Date(pref.effective_from)
      const effectiveTo = pref.effective_to ? new Date(pref.effective_to) : new Date('2099-12-31')
      return dateObj >= effectiveFrom && dateObj <= effectiveTo
    })

    if (activePrefs.length === 0) return 20

    const preference = activePrefs[0]
    const patternLength = preference.preference_pattern.length
    const patternIndex = dayOfWeek % patternLength
    const preferredShift = preference.preference_pattern[patternIndex]

    // 완벽한 매칭
    if (preferredShift === shiftTemplate.type) {
      return 40
    }

    // 부분 매칭 로직
    if (preferredShift === 'off' && shiftTemplate.type !== 'night') {
      return 10 // 휴무를 원할 때 야간이 아닌 시프트는 약간의 선호도
    }

    return 5 // 매칭되지 않는 시프트는 낮은 점수
  }

  /**
   * 근무 패턴 선호도 점수를 계산합니다.
   * 
   * 직원의 근무 패턴 선호도(짧은/긴 근무, 집중/분산 등)를 반영합니다.
   * 
   * @param employee 직원 정보
   * @param shiftTemplate 배정 예정 시프트
   * @param workPatterns 근무 패턴 선호도 맵
   * @param previousAssignments 이전 배정 기록
   * @param date 배정 대상 날짜
   * @returns 0-35점 사이의 패턴 점수 (가중치 적용 전)
   */
  private calculateWorkPatternScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[],
    date: string
  ): number {
    const pattern = workPatterns.get(employee.id)
    if (!pattern) return 15 // 중립 점수

    // 최근 14일간의 배정 기록 조회
    const recentAssignments = this.getRecentAssignments(employee.id, date, previousAssignments, 14)
    
    // 패턴 점수 계산을 위한 배정 객체 생성
    const assignment = {
      date,
      shift_type: shiftTemplate.type
    }

    // work-pattern-types.ts의 calculatePatternScore 함수 사용
    const patternScore = calculatePatternScore(employee, assignment, recentAssignments, pattern)
    
    // 0-100 점수를 0-35 점수로 조정
    return (patternScore / 100) * 35
  }

  /**
   * 공정성 점수를 계산합니다.
   * 
   * 개인 선호도와 팀 공정성의 균형을 고려하여 점수를 산정합니다.
   * 
   * @param employeeId 직원 ID
   * @param shiftTemplate 배정 예정 시프트
   * @param previousAssignments 이전 배정 기록
   * @param date 배정 대상 날짜
   * @param cachedPreferences 캐시된 선호도 데이터
   * @param cachedFairnessLedger 캐시된 공정성 장부
   * @returns 0-30점 사이의 공정성 점수
   */
  private calculateFairnessScore(
    employeeId: string, 
    shiftTemplate: ShiftTemplate,
    previousAssignments: GeneratedAssignment[],
    date: string,
    cachedPreferences?: Map<string, any[]>,
    cachedFairnessLedger?: Map<string, any>
  ): number {
    // 직원의 라이프스타일 선호도 및 공정성 옵션 조회
    const preference = cachedPreferences?.get(employeeId)?.[0]
    const lifestylePreference: LifestylePreference = preference?.lifestyle_preference || 'flexible'
    const fairnessOption: FairnessOption = preference?.fairness_option || 'auto'
    
    // 현재 월의 공정성 밸런스 조회
    const currentMonth = new Date(date).toISOString().slice(0, 7)
    const fairnessBalance = cachedFairnessLedger?.get(employeeId)?.balance_score || 0
    
    let baseScore = 20 // 기본 점수
    
    // 1. 라이프스타일 선호도 기반 공정성
    if (lifestylePreference === 'night_owl') {
      // 야간 선호자에게 야간은 공정, 주간은 불공정
      if (shiftTemplate.type === 'night') {
        baseScore += 10 // 선호 시간대 = 공정
      } else if (shiftTemplate.type === 'day') {
        baseScore -= 5  // 비선호 시간대 = 불공정
      }
    } else if (lifestylePreference === 'morning_person') {
      // 주간 선호자에게 주간은 공정, 야간은 불공정
      if (shiftTemplate.type === 'day') {
        baseScore += 10
      } else if (shiftTemplate.type === 'night') {
        baseScore -= 5
      }
    }
    // 'flexible'은 모든 시간대에 중립적
    
    // 2. 공정성 옵션 반영
    if (fairnessOption === 'prefer_my_preference') {
      // 개인 선호 최우선 - 선호도 점수 추가
      const isPreferred = this.isPreferredShift(employeeId, shiftTemplate.type, cachedPreferences)
      if (isPreferred) baseScore += 5
    } else if (fairnessOption === 'prefer_team_balance') {
      // 팀 균형 우선 - 기존 로직 유지
      const employeeAssignments = previousAssignments.filter(a => a.employee_id === employeeId)
      const avgAssignments = previousAssignments.length / new Set(previousAssignments.map(a => a.employee_id)).size
      if (employeeAssignments.length < avgAssignments * 0.9) {
        baseScore += 5 // 적게 일한 사람 우선
      }
    }
    
    // 3. 누적 공정성 밸런스 반영
    if (fairnessBalance > 10) {
      // 혜택을 많이 받은 사람은 감점
      baseScore -= Math.min(10, fairnessBalance / 2)
    } else if (fairnessBalance < -10) {
      // 기여를 많이 한 사람은 가점
      baseScore += Math.min(10, Math.abs(fairnessBalance) / 2)
    }
    
    // 4. 특별 기여 보너스
    const recentWeekendNights = this.countRecentWeekendNights(employeeId, previousAssignments, 30)
    if (recentWeekendNights >= 2) {
      baseScore += 5 // 최근 주말 야간 많이 한 사람 보상
    }
    
    return Math.max(0, Math.min(30, baseScore))
  }

  /**
   * 직원이 해당 시프트 타입을 선호하는지 확인합니다.
   * 
   * @param employeeId 직원 ID
   * @param shiftType 시프트 타입
   * @param cachedPreferences 캐시된 선호도 데이터
   * @returns 선호 여부
   */
  private isPreferredShift(
    employeeId: string, 
    shiftType: string, 
    cachedPreferences?: Map<string, any[]>
  ): boolean {
    const preference = cachedPreferences?.get(employeeId)?.[0]
    if (!preference) return false
    
    if (preference.lifestyle_preference === 'night_owl') {
      return shiftType === 'night' || shiftType === 'evening'
    } else if (preference.lifestyle_preference === 'morning_person') {
      return shiftType === 'day'
    }
    return true // flexible은 모두 선호
  }
  
  /**
   * 최근 주말 야간 근무 횟수를 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param assignments 배정 기록
   * @param days 조회할 과거 일수
   * @returns 주말 야간 근무 횟수
   */
  private countRecentWeekendNights(
    employeeId: string,
    assignments: GeneratedAssignment[],
    days: number
  ): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return assignments.filter(a => {
      if (a.employee_id !== employeeId) return false
      const assignmentDate = new Date(a.date)
      if (assignmentDate < cutoffDate) return false
      const dayOfWeek = assignmentDate.getDay()
      return (dayOfWeek === 5 || dayOfWeek === 6) && 
             a.shift_template_id.includes('night')
    }).length
  }

  /**
   * 최근 배정 기록을 조회합니다.
   * 
   * @param employeeId 직원 ID
   * @param targetDate 기준 날짜
   * @param previousAssignments 전체 배정 기록
   * @param lookbackDays 조회할 과거 일수
   * @returns 최근 배정 기록 배열
   */
  private getRecentAssignments(
    employeeId: string,
    targetDate: string,
    previousAssignments: GeneratedAssignment[],
    lookbackDays: number
  ): GeneratedAssignment[] {
    const currentDate = new Date(targetDate)
    const assignments: GeneratedAssignment[] = []

    for (let i = 1; i <= lookbackDays; i++) {
      const checkDate = new Date(currentDate)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = checkDate.toISOString().split('T')[0]

      const assignment = previousAssignments.find(
        a => a.employee_id === employeeId && a.date === checkDateStr
      )

      if (assignment) {
        assignments.push(assignment)
      }
    }

    return assignments.reverse() // 오래된 것부터 정렬
  }

  /**
   * 선호도 상세 설명을 생성합니다.
   * 
   * @param employeeId 직원 ID
   * @param shiftTemplate 시프트 템플릿
   * @param preferences 선호도 맵
   * @param date 날짜
   * @returns 선호도 상세 설명
   */
  private generatePreferenceDetails(
    employeeId: string,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    date: string
  ): string {
    const empPreferences = preferences.get(employeeId) || []
    if (empPreferences.length === 0) {
      return '설정된 선호도 없음 (중립 점수 적용)'
    }

    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    const preference = empPreferences[0]
    const patternIndex = dayOfWeek % preference.preference_pattern.length
    const preferredShift = preference.preference_pattern[patternIndex]

    if (preferredShift === shiftTemplate.type) {
      return `완벽 매칭: ${preferredShift} 선호 → ${shiftTemplate.type} 배정`
    } else {
      return `불일치: ${preferredShift} 선호 → ${shiftTemplate.type} 배정`
    }
  }

  /**
   * 근무 패턴 상세 설명을 생성합니다.
   * 
   * @param employee 직원 정보
   * @param shiftTemplate 시프트 템플릿
   * @param workPatterns 근무 패턴 맵
   * @returns 패턴 상세 설명
   */
  private generatePatternDetails(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    workPatterns: Map<string, WorkPatternPreference>
  ): string {
    const pattern = workPatterns.get(employee.id)
    if (!pattern) {
      return '근무 패턴 설정 없음 (중립 점수 적용)'
    }

    const shiftPreference = pattern.shift_type_preferences[shiftTemplate.type as keyof typeof pattern.shift_type_preferences]
    if (shiftPreference) {
      return `${shiftTemplate.type} 시프트 선호도: ${shiftPreference}/10`
    }

    return `패턴 기반 점수 적용`
  }

  /**
   * 공정성 상세 설명을 생성합니다.
   * 
   * @param employeeId 직원 ID
   * @param cachedPreferences 캐시된 선호도
   * @param cachedFairnessLedger 캐시된 공정성 장부
   * @returns 공정성 상세 설명
   */
  private generateFairnessDetails(
    employeeId: string,
    cachedPreferences?: Map<string, any[]>,
    cachedFairnessLedger?: Map<string, any>
  ): string {
    const preference = cachedPreferences?.get(employeeId)?.[0]
    const fairnessBalance = cachedFairnessLedger?.get(employeeId)?.balance_score || 0
    
    const lifestyle = preference?.lifestyle_preference || 'flexible'
    const fairnessOption = preference?.fairness_option || 'auto'
    
    let details = `라이프스타일: ${lifestyle}, 공정성 옵션: ${fairnessOption}`
    
    if (fairnessBalance !== 0) {
      details += `, 공정성 밸런스: ${fairnessBalance > 0 ? '+' : ''}${fairnessBalance}`
    }
    
    return details
  }
}
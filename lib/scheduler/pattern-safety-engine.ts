/**
 * 한국 간호사 위험 패턴 감지 및 안전 점수 계산 엔진
 * 
 * 이 모듈은 한국 간호업계의 특수한 근무 패턴 위험성을 분석하고,
 * 직원의 건강과 안전을 보장하기 위한 패턴 감지 기능을 제공합니다.
 * 
 * @module PatternSafetyEngine
 * @version 1.0.0
 * @author ShiftLink Team
 */

import { Employee, GeneratedAssignment, ShiftTemplate } from './schedule-engine'

/**
 * 시프트 배정 정보 (패턴 분석용)
 */
export interface ShiftAssignment {
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off'
  leave_type?: string
}

/**
 * 3교대 위험 패턴 타입 (컨설팅 권장: 한국 간호사 특화)
 */
export enum TripleShiftRiskType {
  FORWARD_ROTATION = 'D-E-N',      // 순방향 3교대 (Day → Evening → Night)
  REVERSE_ROTATION = 'N-E-D',      // 역방향 3교대 (Night → Evening → Day)
  SCATTERED_PATTERN = 'D-N-E',     // 산발적 패턴 (Day → Night → Evening)
  RAPID_ALTERNATION = 'D-N-D',     // 급격한 교대 (Day → Night → Day)
  NIGHT_CONCENTRATION = 'N-N-N+'   // 나이트 집중 (3회 이상 연속)
}

/**
 * 위험 패턴 분석 결과 (컨설팅 권장: 정량적 위험도 측정)
 */
export interface SafetyAnalysisResult {
  totalScore: number          // 전체 안전 점수 (0-25)
  riskIndex: number          // 위험도 지수 (0-1, 컨설팅 권장)
  detectedRisks: {
    tripleShiftPattern: boolean     // 연속 3교대 패턴 위험
    excessiveNights: boolean        // 연속 나이트 과다
    alternatingPattern: boolean     // 번갈아 패턴 위험  
    insufficientRest: boolean       // 더블 근무 후 불충분한 휴식
    weekendNightLoad: boolean       // 주말 나이트 부담
    rapidRotation: boolean          // 급격한 교대 패턴 (컨설팅 추가)
    circadianDisruption: boolean    // 생체리듬 교란 (컨설팅 추가)
  }
  riskDetails: {
    consecutiveNights: number       // 연속 나이트 수
    tripleShiftType: TripleShiftRiskType | null  // 감지된 3교대 패턴 유형
    fatigueAccumulation: number     // 피로 누적 지수 (0-1)
    circadianStress: number         // 생체리듬 스트레스 (0-1)
    patternDescription: string      // 위험 패턴 설명
    recommendations: string[]       // 개선 권장사항
  }
}

/**
 * 한국 간호사 위험 패턴 감지 및 안전 점수 계산 엔진
 * 
 * 🔬 컨설팅 권장사항 적용: 한국 간호업계 특화 위험 패턴 정교화
 * 
 * 감지하는 위험 패턴:
 * 1. 🔄 연속 3교대 패턴 (D-E-N, N-D-E 등) - 체력 과부하 및 생체리듬 교란
 * 2. 🌙 연속 나이트 과다 (3회 이상) - 수면 패턴 교란 및 건강 위험
 * 3. ⚡ 급격한 교대 패턴 (D-N-D, E-N-E) - 생체리듬 급격한 변화
 * 4. 🔀 번갈아 패턴 (D-Off-N-Off-E) - 생체리듬 혼란
 * 5. 😴 불충분한 휴식 후 나이트 - 피로 누적 위험
 * 6. 📅 주말 나이트 집중 - 사회적 고립 및 번아웃
 * 7. 📊 피로 누적 지수 - 연속 근무로 인한 누적 피로도
 * 8. 🧬 생체리듬 스트레스 - 교대 패턴의 생리학적 영향
 */
export class PatternSafetyEngine {
  
  /**
   * 🔬 컨설팅 권장: 정량적 위험도 측정과 함께 안전 점수를 계산합니다.
   * 한국 간호사 특화 3교대 패턴 위험성을 정교하게 분석합니다.
   * 
   * @param employee 직원 정보
   * @param proposedShift 배정 예정 시프트
   * @param previousAssignments 이전 배정 기록 (최근 14일)
   * @param targetDate 배정 대상 날짜
   * @returns 0-25점 사이의 안전 점수 (25점이 최대 안전)
   */
  calculateSafetyScore(
    employee: Employee,
    proposedShift: ShiftTemplate,
    previousAssignments: GeneratedAssignment[],
    targetDate: string
  ): number {
    // 최근 14일간의 배정 이력 가져오기
    const recentAssignments = this.getRecentAssignments(employee.id, targetDate, previousAssignments, 14)
    
    // 가상의 배정을 추가해서 패턴 분석
    const testAssignments = this.buildTestAssignments(recentAssignments, proposedShift, targetDate)

    // 위험 패턴 감지 및 점수 계산
    const analysis = this.analyzePatternSafety(testAssignments, targetDate, employee.name)
    
    return analysis.totalScore
  }

  /**
   * 상세한 패턴 안전 분석을 수행합니다.
   * 
   * @param employee 직원 정보
   * @param proposedShift 배정 예정 시프트
   * @param previousAssignments 이전 배정 기록
   * @param targetDate 배정 대상 날짜
   * @returns 상세 분석 결과
   */
  analyzeDetailedSafety(
    employee: Employee,
    proposedShift: ShiftTemplate,
    previousAssignments: GeneratedAssignment[],
    targetDate: string
  ): SafetyAnalysisResult {
    const recentAssignments = this.getRecentAssignments(employee.id, targetDate, previousAssignments, 14)
    const testAssignments = this.buildTestAssignments(recentAssignments, proposedShift, targetDate)
    
    return this.analyzePatternSafety(testAssignments, targetDate, employee.name)
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
   * 패턴 분석을 위한 테스트 배정 데이터를 구성합니다.
   * 
   * @param recentAssignments 최근 배정 기록
   * @param proposedShift 배정 예정 시프트
   * @param targetDate 배정 대상 날짜
   * @returns 패턴 분석용 배정 데이터
   */
  private buildTestAssignments(
    recentAssignments: GeneratedAssignment[],
    proposedShift: ShiftTemplate,
    targetDate: string
  ): ShiftAssignment[] {
    const assignments: ShiftAssignment[] = []

    // 기존 배정 데이터 변환
    recentAssignments.forEach(assignment => {
      assignments.push({
        date: assignment.date,
        shift_type: this.extractShiftType(assignment.shift_template_id),
        leave_type: undefined
      })
    })

    // 새로운 배정 추가
    assignments.push({
      date: targetDate,
      shift_type: proposedShift.type,
      leave_type: undefined
    })

    return assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * shift_template_id에서 시프트 타입을 추출합니다.
   * 
   * @param shiftTemplateId 시프트 템플릿 ID
   * @returns 시프트 타입
   */
  private extractShiftType(shiftTemplateId: string): 'day' | 'evening' | 'night' | 'off' {
    if (shiftTemplateId.includes('day')) return 'day'
    if (shiftTemplateId.includes('evening')) return 'evening'
    if (shiftTemplateId.includes('night')) return 'night'
    return 'off'
  }

  /**
   * 종합적인 패턴 안전 분석을 수행합니다.
   * 
   * @param assignments 분석할 배정 데이터
   * @param targetDate 배정 대상 날짜
   * @param employeeName 직원명 (로깅용)
   * @returns 안전 분석 결과
   */
  /**
   * 🔬 컨설팅 권장: 한국 간호사 특화 정량적 위험도 측정으로 패턴 안전성 분석
   */
  private analyzePatternSafety(
    assignments: ShiftAssignment[],
    targetDate: string,
    employeeName: string
  ): SafetyAnalysisResult {
    let safetyScore = 25 // 기본 만점에서 위험 요소별로 감점

    const risks = {
      tripleShiftPattern: false,
      excessiveNights: false,
      alternatingPattern: false,
      insufficientRest: false,
      weekendNightLoad: false,
      rapidRotation: false,        // 컨설팅 추가: 급격한 교대 패턴
      circadianDisruption: false   // 컨설팅 추가: 생체리듬 교란
    }

    const recommendations: string[] = []

    // 🔬 컨설팅 권장: 정량적 위험도 지수 계산
    let riskIndex = 0.0
    let fatigueAccumulation = 0.0
    let circadianStress = 0.0

    // 1. 연속 3교대 패턴 검사 (컨설팅 강화: 유형별 차등 적용)
    const tripleShiftResult = this.analyzeTripleShiftRisk(assignments, targetDate)
    if (tripleShiftResult.detected) {
      risks.tripleShiftPattern = true
      const severity = this.getTripleShiftSeverity(tripleShiftResult.type)
      safetyScore -= severity.scoreDeduction
      riskIndex += severity.riskContribution
      fatigueAccumulation += severity.fatigueImpact
      recommendations.push(`🔄 ${tripleShiftResult.type} 패턴 감지: ${severity.recommendation}`)
      console.log(`❌ Triple shift risk: ${tripleShiftResult.type} for ${employeeName} on ${targetDate}`)
    }

    // 2. 연속 나이트 과다 검사 (컨설팅 강화: 3회부터 위험)
    const consecutiveNights = this.countConsecutiveNights(assignments, targetDate)
    if (consecutiveNights >= 3) {
      risks.excessiveNights = true
      const nightRisk = Math.min(consecutiveNights - 2, 5) * 3 // 3회부터 3점씩 증가
      safetyScore -= nightRisk
      riskIndex += consecutiveNights * 0.15  // 야간근무 누적 위험도
      circadianStress += consecutiveNights * 0.2
      recommendations.push(`🌙 연속 나이트 ${consecutiveNights}회: 수면 패턴 회복 필요`)
      console.log(`⚠️ Consecutive nights (${consecutiveNights}) for ${employeeName}`)
    }

    // 3. 급격한 교대 패턴 검사 (컨설팅 추가)
    const rapidRotationResult = this.checkRapidRotation(assignments, targetDate)
    if (rapidRotationResult.detected) {
      risks.rapidRotation = true
      safetyScore -= 10
      riskIndex += 0.25
      circadianStress += 0.4
      recommendations.push(`⚡ 급격한 교대 변화: ${rapidRotationResult.pattern} → 점진적 변화 권장`)
      console.log(`⚡ Rapid rotation detected: ${rapidRotationResult.pattern} for ${employeeName}`)
    }

    // 4. 생체리듬 교란 누적 평가 (컨설팅 추가)
    const circadianDisruptionScore = this.calculateCircadianDisruption(assignments)
    if (circadianDisruptionScore > 0.6) {
      risks.circadianDisruption = true
      safetyScore -= Math.floor(circadianDisruptionScore * 8)
      riskIndex += circadianDisruptionScore * 0.2
      circadianStress += circadianDisruptionScore
      recommendations.push(`🧠 생체리듬 교란 위험: 규칙적인 패턴으로 조정 필요`)
    }

    // 5. 번갈아 패턴 검사 (기존 유지)
    const hasAlternating = this.checkAlternatingPattern(assignments)
    if (hasAlternating) {
      risks.alternatingPattern = true
      safetyScore -= 6
      riskIndex += 0.15
      recommendations.push('🔀 불규칙한 시프트 패턴: 생체리듬 안정화 필요')
    }

    // 6. 피로 누적 검사 (기존 개선)
    const hasInsufficientRest = this.checkInsufficientRest(assignments, targetDate)
    if (hasInsufficientRest) {
      risks.insufficientRest = true
      safetyScore -= 8
      fatigueAccumulation += 0.3
      recommendations.push('😴 불충분한 휴식: 최소 11시간 연속 휴식 필요')
    }

    // 7. 주말 나이트 부담 (기존 유지)
    const isWeekendNight = this.isWeekendNight(targetDate, assignments.find(a => a.date === targetDate)?.shift_type || 'off')
    if (isWeekendNight) {
      risks.weekendNightLoad = true
      safetyScore -= 3
      riskIndex += 0.1
      recommendations.push('📅 주말 나이트: 사회적 활동 시간 확보 권장')
    }

    // 최종 위험도 지수 정규화
    riskIndex = Math.min(riskIndex, 1.0)
    fatigueAccumulation = Math.min(fatigueAccumulation, 1.0)
    circadianStress = Math.min(circadianStress, 1.0)

    return {
      totalScore: Math.max(0, safetyScore),
      riskIndex,
      detectedRisks: risks,
      riskDetails: {
        consecutiveNights,
        tripleShiftType: tripleShiftResult?.type || null,
        fatigueAccumulation,
        circadianStress,
        patternDescription: this.generateEnhancedPatternDescription(assignments, targetDate, risks),
        recommendations
      }
    }
  }

  /**
   * 🔬 컨설팅 권장: 한국 간호사 특화 3교대 위험 패턴 정교 분석
   */
  private analyzeTripleShiftRisk(
    assignments: ShiftAssignment[],
    targetDate: string
  ): { detected: boolean; type: TripleShiftRiskType | null } {
    if (assignments.length < 3) return { detected: false, type: null }

    const recentShifts = assignments.slice(-3).map(a => a.shift_type)
    const shiftPattern = recentShifts.join('-')

    // 순방향 3교대 (D→E→N) - 가장 위험
    if (shiftPattern.includes('day-evening-night')) {
      return { detected: true, type: TripleShiftRiskType.FORWARD_ROTATION }
    }

    // 역방향 3교대 (N→E→D) - 중간 위험
    if (shiftPattern.includes('night-evening-day')) {
      return { detected: true, type: TripleShiftRiskType.REVERSE_ROTATION }
    }

    // 산발적 패턴 (D→N→E) - 높은 위험
    if (shiftPattern.includes('day-night-evening')) {
      return { detected: true, type: TripleShiftRiskType.SCATTERED_PATTERN }
    }

    // 급격한 교대 (D→N→D) - 최고 위험
    if (shiftPattern.match(/(day-night-day|evening-night-evening)/)) {
      return { detected: true, type: TripleShiftRiskType.RAPID_ALTERNATION }
    }

    // 나이트 집중 (N→N→N+) - 높은 위험
    if (recentShifts.filter(s => s === 'night').length >= 3) {
      return { detected: true, type: TripleShiftRiskType.NIGHT_CONCENTRATION }
    }

    return { detected: false, type: null }
  }

  /**
   * 3교대 패턴별 위험도 평가
   */
  private getTripleShiftSeverity(type: TripleShiftRiskType): {
    scoreDeduction: number;
    riskContribution: number;
    fatigueImpact: number;
    recommendation: string;
  } {
    switch (type) {
      case TripleShiftRiskType.RAPID_ALTERNATION:
        return {
          scoreDeduction: 18,
          riskContribution: 0.45,
          fatigueImpact: 0.6,
          recommendation: '급격한 교대 변화로 생체리듬 심각 교란'
        }
      case TripleShiftRiskType.FORWARD_ROTATION:
        return {
          scoreDeduction: 15,
          riskContribution: 0.35,
          fatigueImpact: 0.5,
          recommendation: '순방향 3교대로 체력 과부하 위험'
        }
      case TripleShiftRiskType.SCATTERED_PATTERN:
        return {
          scoreDeduction: 14,
          riskContribution: 0.33,
          fatigueImpact: 0.45,
          recommendation: '산발적 패턴으로 수면 리듬 불안정'
        }
      case TripleShiftRiskType.NIGHT_CONCENTRATION:
        return {
          scoreDeduction: 12,
          riskContribution: 0.3,
          fatigueImpact: 0.4,
          recommendation: '나이트 집중으로 만성 피로 위험'
        }
      case TripleShiftRiskType.REVERSE_ROTATION:
        return {
          scoreDeduction: 10,
          riskContribution: 0.25,
          fatigueImpact: 0.3,
          recommendation: '역방향 교대로 적응 시간 필요'
        }
      default:
        return {
          scoreDeduction: 8,
          riskContribution: 0.2,
          fatigueImpact: 0.25,
          recommendation: '패턴 정규화 권장'
        }
    }
  }

  /**
   * 급격한 교대 패턴 검사 (컨설팅 추가)
   */
  private checkRapidRotation(
    assignments: ShiftAssignment[],
    targetDate: string
  ): { detected: boolean; pattern: string } {
    if (assignments.length < 2) return { detected: false, pattern: '' }

    const lastTwo = assignments.slice(-2)
    const [prev, current] = lastTwo.map(a => a.shift_type)

    // Day ↔ Night 급격한 변화
    if ((prev === 'day' && current === 'night') || (prev === 'night' && current === 'day')) {
      return { detected: true, pattern: `${prev}→${current}` }
    }

    // Evening ↔ Night 급격한 변화 (한국 간호계 특수성)
    if ((prev === 'evening' && current === 'night') || (prev === 'night' && current === 'evening')) {
      return { detected: true, pattern: `${prev}→${current}` }
    }

    return { detected: false, pattern: '' }
  }

  /**
   * 생체리듬 교란 정도 계산 (컨설팅 추가)
   */
  private calculateCircadianDisruption(assignments: ShiftAssignment[]): number {
    if (assignments.length < 7) return 0

    const recentWeek = assignments.slice(-7)
    let disruptionScore = 0

    // 1. 불규칙성 측정 (연속된 다른 시프트 타입)
    for (let i = 1; i < recentWeek.length; i++) {
      if (recentWeek[i].shift_type !== recentWeek[i - 1].shift_type && 
          recentWeek[i].shift_type !== 'off' && 
          recentWeek[i - 1].shift_type !== 'off') {
        disruptionScore += 0.15
      }
    }

    // 2. 나이트 시프트 빈도 (주 3회 이상 시 위험)
    const nightCount = recentWeek.filter(a => a.shift_type === 'night').length
    if (nightCount >= 3) {
      disruptionScore += (nightCount - 2) * 0.1
    }

    // 3. 연속 휴무 부족 (2일 연속 휴무 없으면 위험)
    const hasConsecutiveRest = this.hasConsecutiveRest(recentWeek, 2)
    if (!hasConsecutiveRest) {
      disruptionScore += 0.2
    }

    return Math.min(disruptionScore, 1.0)
  }

  /**
   * 연속 휴무 확인
   */
  private hasConsecutiveRest(assignments: ShiftAssignment[], minDays: number): boolean {
    let consecutiveOff = 0
    for (const assignment of assignments) {
      if (assignment.shift_type === 'off') {
        consecutiveOff++
        if (consecutiveOff >= minDays) return true
      } else {
        consecutiveOff = 0
      }
    }
    return false
  }

  /**
   * 불충분한 휴식 검사 (기존 메서드 이름 변경)
   */
  private checkInsufficientRest(assignments: ShiftAssignment[], targetDate: string): boolean {
    if (assignments.length < 3) return false

    const recent = assignments.slice(-3)
    const workShifts = recent.filter(a => a.shift_type !== 'off')
    
    // 연속 3일 근무 후 휴식 없이 또 근무
    if (workShifts.length >= 3) {
      const restBetween = recent.some(a => a.shift_type === 'off')
      return !restBetween
    }

    return false
  }

  /**
   * 향상된 패턴 설명 생성
   */
  private generateEnhancedPatternDescription(
    assignments: ShiftAssignment[],
    targetDate: string,
    risks: any
  ): string {
    const recentPattern = assignments.slice(-5).map(a => a.shift_type.charAt(0).toUpperCase()).join('-')
    
    let description = `최근 패턴: ${recentPattern}`
    
    if (risks.tripleShiftPattern) description += ' | 3교대 위험 감지'
    if (risks.rapidRotation) description += ' | 급격한 교대 변화'
    if (risks.circadianDisruption) description += ' | 생체리듬 교란'
    if (risks.excessiveNights) description += ' | 과도한 야간근무'
    
    return description
  }

  /**
   * 연속 3교대 패턴을 검사합니다. (기존 메서드 유지)
   * 
   * 위험한 패턴:
   * - D-E-N (주간-이브닝-나이트)
   * - N-D-E (나이트-주간-이브닝)
   * - E-N-D (이브닝-나이트-주간)
   * 
   * @param assignments 배정 데이터
   * @param targetDate 검사 대상 날짜
   * @returns 위험 패턴 감지 여부
   */
  private checkTripleShiftPattern(assignments: ShiftAssignment[], targetDate: string): boolean {
    const sortedAssignments = assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // 연속 3일 패턴 검사
    for (let i = 0; i <= sortedAssignments.length - 3; i++) {
      const threeDay = sortedAssignments.slice(i, i + 3)
      
      // 3일이 연속인지 확인
      if (this.isConsecutiveDates(threeDay.map(a => a.date))) {
        const shifts = threeDay.map(a => a.shift_type).filter(s => s !== 'off')
        
        // 3개의 서로 다른 시프트가 연속으로 나타나는지 확인
        if (shifts.length === 3) {
          const uniqueShifts = new Set(shifts)
          if (uniqueShifts.size === 3 && 
              uniqueShifts.has('day') && 
              uniqueShifts.has('evening') && 
              uniqueShifts.has('night')) {
            return true
          }
        }
      }
    }
    
    return false
  }

  /**
   * 날짜들이 연속적인지 확인합니다.
   * 
   * @param dates 날짜 문자열 배열
   * @returns 연속 여부
   */
  private isConsecutiveDates(dates: string[]): boolean {
    if (dates.length < 2) return true

    const sortedDates = dates.sort()
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currDate = new Date(sortedDates[i])
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (dayDiff !== 1) {
        return false
      }
    }
    
    return true
  }

  /**
   * 연속 나이트 근무 수를 계산합니다.
   * 
   * @param assignments 배정 데이터
   * @param targetDate 기준 날짜
   * @returns 연속 나이트 근무 수
   */
  private countConsecutiveNights(assignments: ShiftAssignment[], targetDate: string): number {
    const sortedAssignments = assignments
      .filter(a => new Date(a.date) <= new Date(targetDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let consecutiveNights = 0
    const targetDateObj = new Date(targetDate)
    
    for (let i = 0; i < sortedAssignments.length; i++) {
      const assignmentDate = new Date(sortedAssignments[i].date)
      const expectedDate = new Date(targetDateObj)
      expectedDate.setDate(expectedDate.getDate() - i)
      
      if (assignmentDate.getTime() === expectedDate.getTime() && 
          sortedAssignments[i].shift_type === 'night') {
        consecutiveNights++
      } else {
        break
      }
    }
    
    return consecutiveNights
  }

  /**
   * 번갈아 패턴을 검사합니다.
   * 
   * 위험한 패턴:
   * - D-Off-N-Off-E (주간-휴무-나이트-휴무-이브닝)
   * - 불규칙한 시프트 순환
   * 
   * @param assignments 배정 데이터
   * @returns 번갈아 패턴 감지 여부
   */
  private checkAlternatingPattern(assignments: ShiftAssignment[]): boolean {
    const workDays = assignments.filter(a => a.shift_type !== 'off')
    
    if (workDays.length < 3) return false
    
    // 최근 5일 중 3개 이상의 서로 다른 시프트가 번갈아 나오는지 검사
    const recentWork = workDays.slice(-5)
    const shiftTypes = recentWork.map(a => a.shift_type)
    const uniqueShifts = new Set(shiftTypes)
    
    if (uniqueShifts.size >= 3) {
      // 연속성이 없는 패턴인지 검사
      let isAlternating = true
      for (let i = 1; i < shiftTypes.length; i++) {
        if (shiftTypes[i] === shiftTypes[i - 1]) {
          isAlternating = false
          break
        }
      }
      return isAlternating
    }
    
    return false
  }

  /**
   * 더블 근무 후 불충분한 휴식을 검사합니다.
   * 
   * 위험한 패턴:
   * - 더블 근무 (D-E 또는 E-N) 후 1일 휴식으로 바로 근무 복귀
   * 
   * @param assignments 배정 데이터
   * @param targetDate 검사 대상 날짜
   * @returns 불충분한 휴식 감지 여부
   */
  private checkDoubleWithoutRest(assignments: ShiftAssignment[], targetDate: string): boolean {
    const sortedAssignments = assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // 최근 4일 패턴 검사
    for (let i = 0; i <= sortedAssignments.length - 4; i++) {
      const fourDay = sortedAssignments.slice(i, i + 4)
      
      if (this.isConsecutiveDates(fourDay.map(a => a.date))) {
        // 더블 패턴 확인
        const isDouble = (
          (fourDay[0].shift_type === 'day' && fourDay[1].shift_type === 'evening') ||
          (fourDay[0].shift_type === 'evening' && fourDay[1].shift_type === 'night')
        )
        
        // 더블 → 1일 휴식 → 근무 복귀 패턴 확인
        if (isDouble && 
            fourDay[2].shift_type === 'off' && 
            fourDay[3].shift_type !== 'off' &&
            fourDay[3].date === targetDate) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * 주말 나이트 근무 여부를 검사합니다.
   * 
   * @param date 날짜
   * @param shiftType 시프트 타입
   * @returns 주말 나이트 여부
   */
  private isWeekendNight(date: string, shiftType: string): boolean {
    if (shiftType !== 'night') return false
    
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    
    // 금요일(5) 나이트 또는 토요일(6) 나이트
    return dayOfWeek === 5 || dayOfWeek === 6
  }

  /**
   * 패턴 설명 문자열을 생성합니다.
   * 
   * @param assignments 배정 데이터
   * @param targetDate 대상 날짜
   * @returns 패턴 설명
   */
  private generatePatternDescription(assignments: ShiftAssignment[], targetDate: string): string {
    const recentPattern = assignments
      .slice(-7) // 최근 7일
      .map(a => `${a.date}(${a.shift_type})`)
      .join(' → ')
    
    return `최근 패턴: ${recentPattern}`
  }
}
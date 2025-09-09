/**
 * 직원 제약사항 검증 및 규칙 적용 엔진
 * 
 * 이 모듈은 직원의 근무 제약사항을 검증하고, 법적/규정적 규칙을 적용하여
 * 안전하고 규정을 준수하는 스케줄 배정을 보장합니다.
 * 
 * @module ConstraintValidator
 * @version 1.0.0
 * @author ShiftLink Team
 */

import { Employee, EmployeeConstraint, GeneratedAssignment, ShiftTemplate } from './schedule-engine'

/**
 * 제약사항 우선순위 레벨
 * 컨설팅 권장: Hard/Soft 제약 분리로 정교한 제약 관리
 */
export enum ConstraintLevel {
  HARD = 1,      // 법정 요구사항 - 절대 위반 불가 (휴식시간, 최대 근무시간)
  IMPORTANT = 2, // 안전 규정 - 강력 권장 (연속 야간, 패턴 안전)
  SOFT = 3       // 선호도 - 가능한 준수 (개인 선호, 팀 밸런스)
}

/**
 * 제약사항 위반 정보
 */
export interface ConstraintViolation {
  level: ConstraintLevel
  type: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  canOverride: boolean           // 관리자 승인으로 무시 가능 여부
}

/**
 * 제약사항 검증 결과 (컨설팅 권장: 우선순위별 분리)
 */
export interface ValidationResult {
  isValid: boolean                // 전체 검증 통과 여부
  canProceedWithOverride: boolean // 관리자 승인 시 진행 가능 여부
  hardViolations: ConstraintViolation[]    // Hard 제약 위반 (절대 불가)
  importantViolations: ConstraintViolation[] // Important 제약 위반 (강력 권장)
  softViolations: ConstraintViolation[]    // Soft 제약 위반 (선호도)
  score: number                   // 제약 준수 점수 (0-100)
  details: {
    constraintViolations: string[]    // 개인 제약사항 위반
    restHourViolations: string[]      // 휴식 시간 위반
    consecutiveViolations: string[]   // 연속 근무 위반
    overtimeViolations: string[]      // 초과 근무 위반
  }
}

/**
 * 근무 통계 정보
 */
export interface WorkStatistics {
  consecutiveDays: number         // 연속 근무일수
  consecutiveNights: number       // 연속 야간 근무수
  weeklyHours: number            // 주간 근무 시간
  monthlyHours: number           // 월간 근무 시간
  lastRestHours: number          // 마지막 휴식 시간
  recentOvertimeDays: number     // 최근 초과 근무일수
}

/**
 * 직원 제약사항 검증 및 규칙 적용 엔진
 * 
 * 다음과 같은 제약사항과 규칙을 검증합니다:
 * 1. 개인 제약사항 - 직원별 고유 제약 (야간 금지, 고정 휴무 등)
 * 2. 휴식 시간 규정 - 최소 11시간 휴식 보장
 * 3. 연속 근무 제한 - 최대 연속 야간 근무 제한
 * 4. 초과 근무 규정 - 주 52시간 근무 시간 제한
 * 5. 법적 규정 준수 - 근로기준법 등 관련 법규
 */
export class ConstraintValidator {
  
  /**
   * 직원의 시프트 배정 가능성을 우선순위별로 검증합니다.
   * 컨설팅 권장: Hard/Soft 제약 분리로 정교한 제약 관리
   * 
   * @param employee 직원 정보
   * @param shiftTemplate 배정 예정 시프트
   * @param date 배정 대상 날짜
   * @param constraints 직원 제약사항 목록
   * @param previousAssignments 이전 배정 기록
   * @param dailyAssignments 당일 다른 배정 기록
   * @returns 우선순위별 검증 결과
   */
  validateAssignment(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    date: string,
    constraints: EmployeeConstraint[],
    previousAssignments: GeneratedAssignment[],
    dailyAssignments: GeneratedAssignment[] = []
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      canProceedWithOverride: false,
      hardViolations: [],
      importantViolations: [],
      softViolations: [],
      score: 100,
      details: {
        constraintViolations: [],
        restHourViolations: [],
        consecutiveViolations: [],
        overtimeViolations: []
      }
    }

    // 📊 컨설팅 권장: 우선순위별 제약 검증으로 정교한 제약 관리
    let scoreDeduction = 0

    // 🚨 HARD 제약 검증 - 법정 요구사항 (절대 위반 불가)
    this.validateHardConstraints(employee, shiftTemplate, date, constraints, previousAssignments, dailyAssignments, result)
    
    // ⚠️ IMPORTANT 제약 검증 - 안전 규정 (강력 권장)
    scoreDeduction += this.validateImportantConstraints(employee, shiftTemplate, date, constraints, previousAssignments, result)
    
    // 💡 SOFT 제약 검증 - 선호도 (가능한 준수)
    scoreDeduction += this.validateSoftConstraints(employee, shiftTemplate, date, constraints, previousAssignments, result)
    
    // 최종 점수 계산 및 결과 설정
    result.score = Math.max(0, 100 - scoreDeduction)
    result.isValid = result.hardViolations.length === 0
    result.canProceedWithOverride = result.hardViolations.length === 0 && result.importantViolations.length <= 2

    return result
  }

  /**
   * 🚨 HARD 제약 검증 - 법정 요구사항 (절대 위반 불가)
   * 컨설팅 권장: 최소 휴식시간, 당일 중복 배정 등 법적 요구사항
   */
  private validateHardConstraints(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    date: string,
    constraints: EmployeeConstraint[],
    previousAssignments: GeneratedAssignment[],
    dailyAssignments: GeneratedAssignment[],
    result: ValidationResult
  ): void {
    // 1. 당일 중복 배정 확인 (Hard)
    if (this.hasConflictingAssignment(employee.id, dailyAssignments)) {
      result.hardViolations.push({
        level: ConstraintLevel.HARD,
        type: 'duplicate_assignment',
        message: '이미 당일 다른 시프트에 배정됨',
        severity: 'critical',
        canOverride: false
      })
      result.details.constraintViolations.push('당일 중복 배정')
    }

    // 2. 최소 휴식 시간 검증 (Hard - 근로기준법 위반)
    if (!this.hasMinimumRestHours(employee.id, date, shiftTemplate, previousAssignments)) {
      result.hardViolations.push({
        level: ConstraintLevel.HARD,
        type: 'minimum_rest',
        message: '최소 11시간 휴식 시간 미달 (근로기준법 위반)',
        severity: 'critical',
        canOverride: false
      })
      result.details.restHourViolations.push('최소 11시간 휴식 시간 미달')
    }

    // 3. 법적 제약사항 (Hard)
    for (const constraint of constraints) {
      if (constraint.constraint_type === 'no_night' && shiftTemplate.type === 'night') {
        if (this.violatesConstraint(constraint, shiftTemplate, date)) {
          result.hardViolations.push({
            level: ConstraintLevel.HARD,
            type: 'legal_constraint',
            message: `법적 제약사항 위반: ${constraint.constraint_type} - ${constraint.reason || '사유 없음'}`,
            severity: 'critical',
            canOverride: false
          })
          result.details.constraintViolations.push(`법적 제약: ${constraint.constraint_type}`)
        }
      }
    }
  }

  /**
   * ⚠️ IMPORTANT 제약 검증 - 안전 규정 (강력 권장)
   * 컨설팅 권장: 연속 야간 근무, 패턴 안전성 등 건강/안전 관련
   */
  private validateImportantConstraints(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    date: string,
    constraints: EmployeeConstraint[],
    previousAssignments: GeneratedAssignment[],
    result: ValidationResult
  ): number {
    let scoreDeduction = 0

    // 1. 연속 야간 근무 제한 (Important - 안전 규정)
    if (shiftTemplate.type === 'night' && 
        this.exceedsMaxConsecutiveNights(employee.id, date, previousAssignments)) {
      result.importantViolations.push({
        level: ConstraintLevel.IMPORTANT,
        type: 'consecutive_nights',
        message: '최대 연속 야간 근무(3회) 초과 - 건강 위험',
        severity: 'warning',
        canOverride: true
      })
      result.details.consecutiveViolations.push('최대 연속 야간 근무 초과')
      scoreDeduction += 25
    }

    // 2. 안전 제약사항 (Important)
    for (const constraint of constraints) {
      if (constraint.constraint_type === 'max_consecutive' && 
          this.violatesConstraint(constraint, shiftTemplate, date)) {
        result.importantViolations.push({
          level: ConstraintLevel.IMPORTANT,
          type: 'safety_constraint',
          message: `안전 제약사항 위반: ${constraint.constraint_type}`,
          severity: 'warning',
          canOverride: true
        })
        scoreDeduction += 15
      }
    }

    // 3. 초과 근무 시간 (Important - 건강 관리)
    if (this.isOvertime(employee.id, date, previousAssignments)) {
      result.importantViolations.push({
        level: ConstraintLevel.IMPORTANT,
        type: 'overtime',
        message: '주 52시간 초과 근무 - 건강 관리 필요',
        severity: 'warning',
        canOverride: true
      })
      result.details.overtimeViolations.push('주 52시간 초과 근무')
      scoreDeduction += 10
    }

    return scoreDeduction
  }

  /**
   * 💡 SOFT 제약 검증 - 선호도 (가능한 준수)
   * 컨설팅 권장: 개인 선호도, 팀 밸런스 등 운영 효율성 관련
   */
  private validateSoftConstraints(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    date: string,
    constraints: EmployeeConstraint[],
    previousAssignments: GeneratedAssignment[],
    result: ValidationResult
  ): number {
    let scoreDeduction = 0

    // 1. 개인 선호도 제약 (Soft)
    for (const constraint of constraints) {
      if (constraint.constraint_type === 'time_off' && 
          this.violatesConstraint(constraint, shiftTemplate, date)) {
        result.softViolations.push({
          level: ConstraintLevel.SOFT,
          type: 'preference',
          message: `개인 선호도: ${constraint.constraint_type} - ${constraint.reason || ''}`,
          severity: 'info',
          canOverride: true
        })
        scoreDeduction += 5
      }
    }

    // 2. 고정 근무일 선호도 (Soft)
    for (const constraint of constraints) {
      if (constraint.constraint_type === 'fixed_day' && 
          this.violatesConstraint(constraint, shiftTemplate, date)) {
        result.softViolations.push({
          level: ConstraintLevel.SOFT,
          type: 'fixed_preference',
          message: `고정 근무일 선호도 불일치`,
          severity: 'info',
          canOverride: true
        })
        scoreDeduction += 3
      }
    }

    return scoreDeduction
  }

  /**
   * 직원의 현재 근무 통계를 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param currentDate 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 근무 통계 정보
   */
  calculateWorkStatistics(
    employeeId: string,
    currentDate: string,
    previousAssignments: GeneratedAssignment[]
  ): WorkStatistics {
    const recentAssignments = this.getRecentAssignments(employeeId, currentDate, previousAssignments, 30)
    
    return {
      consecutiveDays: this.countConsecutiveDays(recentAssignments, currentDate),
      consecutiveNights: this.getRecentNightShifts(employeeId, currentDate, previousAssignments, 7),
      weeklyHours: this.calculateWeeklyHours(employeeId, currentDate, previousAssignments),
      monthlyHours: this.calculateMonthlyHours(employeeId, currentDate, previousAssignments),
      lastRestHours: this.calculateLastRestHours(employeeId, currentDate, previousAssignments),
      recentOvertimeDays: this.countOvertimeDays(employeeId, currentDate, previousAssignments, 14)
    }
  }

  /**
   * 특정 날짜에 직원이 근무 가능한지 빠르게 확인합니다.
   * 
   * @param employee 직원 정보
   * @param shiftTemplate 시프트 템플릿
   * @param date 날짜
   * @param constraints 제약사항 목록
   * @param previousAssignments 이전 배정 기록
   * @param dailyAssignments 당일 배정 기록
   * @returns 근무 가능 여부
   */
  isEmployeeAvailable(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    date: string,
    constraints: EmployeeConstraint[],
    previousAssignments: GeneratedAssignment[],
    dailyAssignments: GeneratedAssignment[] = []
  ): boolean {
    // 기본 가용성 체크 (성능 최적화)
    if (this.hasConflictingAssignment(employee.id, dailyAssignments)) {
      return false
    }

    // 필수 제약사항만 빠르게 체크
    for (const constraint of constraints) {
      if (this.violatesConstraint(constraint, shiftTemplate, date)) {
        return false
      }
    }

    if (!this.hasMinimumRestHours(employee.id, date, shiftTemplate, previousAssignments)) {
      return false
    }

    if (shiftTemplate.type === 'night' && 
        this.exceedsMaxConsecutiveNights(employee.id, date, previousAssignments)) {
      return false
    }

    return true
  }

  /**
   * 당일 배정 충돌을 확인합니다.
   * 
   * @param employeeId 직원 ID
   * @param dailyAssignments 당일 배정 목록
   * @returns 충돌 여부
   */
  private hasConflictingAssignment(employeeId: string, dailyAssignments: GeneratedAssignment[]): boolean {
    return dailyAssignments.some(assignment => assignment.employee_id === employeeId)
  }

  /**
   * 개인 제약사항 위반 여부를 확인합니다.
   * 
   * @param constraint 제약사항
   * @param shiftTemplate 시프트 템플릿
   * @param date 날짜
   * @returns 위반 여부
   */
  private violatesConstraint(
    constraint: EmployeeConstraint,
    shiftTemplate: ShiftTemplate,
    date: string
  ): boolean {
    const constraintDate = new Date(date)
    const effectiveFrom = new Date(constraint.effective_from)
    const effectiveTo = constraint.effective_to ? new Date(constraint.effective_to) : new Date('2099-12-31')

    // 제약사항 적용 기간 확인
    if (constraintDate < effectiveFrom || constraintDate > effectiveTo) {
      return false
    }

    switch (constraint.constraint_type) {
      case 'no_night':
        return shiftTemplate.type === 'night'
      
      case 'fixed_day':
        const fixedDayData = constraint.constraint_value as { day_of_week: number; shift_type: string }
        return constraintDate.getDay() === fixedDayData.day_of_week && 
               shiftTemplate.type !== fixedDayData.shift_type
      
      case 'time_off':
        const timeOffData = constraint.constraint_value as { start_date: string; end_date: string }
        const timeOffStart = new Date(timeOffData.start_date)
        const timeOffEnd = new Date(timeOffData.end_date)
        return constraintDate >= timeOffStart && constraintDate <= timeOffEnd

      case 'max_consecutive':
        // 연속 근무 제한은 별도 로직에서 처리
        return false

      default:
        console.warn(`Unknown constraint type: ${constraint.constraint_type}`)
        return false
    }
  }

  /**
   * 최소 휴식 시간(11시간) 확보 여부를 확인합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 배정 날짜
   * @param shiftTemplate 시프트 템플릿
   * @param previousAssignments 이전 배정 기록
   * @returns 휴식 시간 충족 여부
   */
  private hasMinimumRestHours(
    employeeId: string,
    date: string,
    shiftTemplate: ShiftTemplate,
    previousAssignments: GeneratedAssignment[]
  ): boolean {
    const currentDate = new Date(date)
    const previousDay = new Date(currentDate)
    previousDay.setDate(previousDay.getDate() - 1)
    const previousDayStr = previousDay.toISOString().split('T')[0]

    const lastAssignment = previousAssignments.find(
      a => a.employee_id === employeeId && a.date === previousDayStr
    )

    if (!lastAssignment) return true

    // 마지막 시프트 종료 시간과 새 시프트 시작 시간 계산
    const lastEndTime = new Date(`${lastAssignment.date}T${lastAssignment.end_time}`)
    const newStartTime = new Date(`${date}T${shiftTemplate.start_time}`)

    // 야간 시프트의 경우 다음날로 넘어갈 수 있음
    if (lastEndTime > newStartTime) {
      newStartTime.setDate(newStartTime.getDate() + 1)
    }

    const restHours = (newStartTime.getTime() - lastEndTime.getTime()) / (1000 * 60 * 60)
    return restHours >= 11 // 최소 11시간 휴식
  }

  /**
   * 최대 연속 야간 근무(3회) 초과 여부를 확인합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 배정 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 연속 야간 근무 초과 여부
   */
  private exceedsMaxConsecutiveNights(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): boolean {
    const recentNightShifts = this.getRecentNightShifts(employeeId, date, previousAssignments, 7)
    return recentNightShifts >= 3 // 최대 3회 연속 야간 근무
  }

  /**
   * 최근 연속 야간 근무 횟수를 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @param lookbackDays 조회 기간 (일)
   * @returns 연속 야간 근무 횟수
   */
  private getRecentNightShifts(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[],
    lookbackDays: number
  ): number {
    const currentDate = new Date(date)
    let consecutiveNights = 0

    for (let i = 1; i <= lookbackDays; i++) {
      const checkDate = new Date(currentDate)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = checkDate.toISOString().split('T')[0]

      const assignment = previousAssignments.find(
        a => a.employee_id === employeeId && a.date === checkDateStr
      )

      if (assignment && assignment.shift_template_id.includes('night')) {
        consecutiveNights++
      } else {
        break // 연속성이 끊어짐
      }
    }

    return consecutiveNights
  }

  /**
   * 최근 배정 기록을 조회합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 전체 배정 기록
   * @param lookbackDays 조회 기간 (일)
   * @returns 최근 배정 기록 배열
   */
  private getRecentAssignments(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[],
    lookbackDays: number
  ): GeneratedAssignment[] {
    const currentDate = new Date(date)
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
   * 연속 근무일수를 계산합니다.
   * 
   * @param assignments 배정 기록
   * @param currentDate 기준 날짜
   * @returns 연속 근무일수
   */
  private countConsecutiveDays(assignments: GeneratedAssignment[], currentDate: string): number {
    if (assignments.length === 0) return 0

    const sortedAssignments = assignments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const currentDateObj = new Date(currentDate)
    let consecutive = 0

    for (let i = 0; i < sortedAssignments.length; i++) {
      const assignmentDate = new Date(sortedAssignments[i].date)
      const expectedDate = new Date(currentDateObj)
      expectedDate.setDate(expectedDate.getDate() - (i + 1))

      if (assignmentDate.getTime() === expectedDate.getTime()) {
        consecutive++
      } else {
        break
      }
    }

    return consecutive
  }

  /**
   * 초과 근무 여부를 확인합니다 (주 52시간 기준).
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 초과 근무 여부
   */
  isOvertime(employeeId: string, date: string, previousAssignments: GeneratedAssignment[]): boolean {
    const weeklyHours = this.calculateWeeklyHours(employeeId, date, previousAssignments)
    return weeklyHours + 8 > 52 // 8시간 추가 시 52시간 초과
  }

  /**
   * 주간 근무 시간을 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 주간 근무 시간
   */
  private calculateWeeklyHours(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): number {
    const currentWeekStart = this.getWeekStart(new Date(date))
    const weeklyAssignments = previousAssignments.filter(a => {
      const assignmentDate = new Date(a.date)
      return a.employee_id === employeeId && 
             assignmentDate >= currentWeekStart &&
             assignmentDate < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    })

    return weeklyAssignments.length * 8 // 8시간 시프트 가정
  }

  /**
   * 월간 근무 시간을 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 월간 근무 시간
   */
  private calculateMonthlyHours(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): number {
    const currentMonth = new Date(date).toISOString().slice(0, 7) // YYYY-MM
    const monthlyAssignments = previousAssignments.filter(a => {
      return a.employee_id === employeeId && a.date.startsWith(currentMonth)
    })

    return monthlyAssignments.length * 8 // 8시간 시프트 가정
  }

  /**
   * 마지막 휴식 시간을 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @returns 휴식 시간 (시간 단위)
   */
  private calculateLastRestHours(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): number {
    const recentAssignments = this.getRecentAssignments(employeeId, date, previousAssignments, 7)
    if (recentAssignments.length === 0) return 0

    const lastAssignment = recentAssignments[recentAssignments.length - 1]
    const lastEndTime = new Date(`${lastAssignment.date}T${lastAssignment.end_time}`)
    const currentTime = new Date(date)

    return (currentTime.getTime() - lastEndTime.getTime()) / (1000 * 60 * 60)
  }

  /**
   * 최근 초과 근무일수를 계산합니다.
   * 
   * @param employeeId 직원 ID
   * @param date 기준 날짜
   * @param previousAssignments 이전 배정 기록
   * @param lookbackDays 조회 기간 (일)
   * @returns 초과 근무일수
   */
  private countOvertimeDays(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[],
    lookbackDays: number
  ): number {
    const currentDate = new Date(date)
    let overtimeDays = 0

    for (let i = 1; i <= lookbackDays; i++) {
      const checkDate = new Date(currentDate)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = checkDate.toISOString().split('T')[0]

      if (this.isOvertime(employeeId, checkDateStr, previousAssignments)) {
        overtimeDays++
      }
    }

    return overtimeDays
  }

  /**
   * 주 시작일(월요일)을 계산합니다.
   * 
   * @param date 기준 날짜
   * @returns 주 시작일
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1) // 월요일
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }
}
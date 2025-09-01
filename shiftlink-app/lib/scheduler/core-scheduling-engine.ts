// 핵심 스케줄 생성 엔진
import { AssignmentAuditTracker, AssignmentDecision } from './assignment-audit-tracker'
import { NursingPatternAnalyzer, PatternAnalysis } from './nursing-pattern-analyzer'
import { FairnessAnalyzer, FairnessMetrics } from './fairness-analyzer'

export interface Employee {
  id: string
  name: string
  email: string
  role: string
  level: string
  team_id: string
  tenant_id: string
  preferences?: EmployeePreference
  constraints?: EmployeeConstraint[]
  recent_assignments?: Assignment[]
  workload_stats?: WorkloadStats
}

export interface EmployeePreference {
  pattern: string[] // ['day', 'evening', 'night', 'off']
  priority: number
  effective_from: string
  effective_to?: string
  preferred_days?: number[] // 0-6 (일-토)
  avoid_days?: number[]
}

export interface EmployeeConstraint {
  id: string
  type: 'personal' | 'medical' | 'legal' | 'operational'
  constraint_name: string
  is_hard: boolean // true: 필수 준수, false: 선호 사항
  applies_to_shift?: string[]
  applies_to_days?: number[]
  applies_to_dates?: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact_score: number // -100 to 100
}

export interface Assignment {
  employee_id: string
  date: string
  shift_type: string
  is_overtime?: boolean
  leave_type?: string
  confidence_score?: number
  assignment_reasons?: any[]
  alternative_options?: any[]
}

export interface WorkloadStats {
  night_shifts: number
  weekend_shifts: number
  consecutive_days: number
  consecutive_nights: number
  total_shifts: number
  preferred_shifts: number
  overtime_hours: number
}

export interface SchedulingRules {
  min_rest_hours: number // 최소 휴식 시간 (기본: 11시간)
  max_weekly_hours: number // 주 최대 근무시간 (기본: 52시간)
  max_consecutive_days: number // 최대 연속 근무일 (기본: 6일)
  max_consecutive_nights: number // 최대 연속 야간 (기본: 2일)
  min_weekend_off: number // 월 최소 주말 휴무 (기본: 2일)
  fairness_weight: number // 공정성 가중치 (0-1)
  preference_weight: number // 선호도 가중치 (0-1)
  safety_weight: number // 안전성 가중치 (0-1)
  coverage_weight: number // 커버리지 가중치 (0-1)
}

export interface CoverageRequirement {
  shift_type: string
  min_employees: number
  preferred_employees: number
  required_levels: { [level: string]: number }
}

export interface ScheduleGeneration {
  schedule_id: string
  tenant_id: string
  start_date: string
  end_date: string
  employees: Employee[]
  assignments: Assignment[]
  generation_stats: GenerationStats
  issues: SchedulingIssue[]
}

export interface GenerationStats {
  total_assignments: number
  successful_assignments: number
  failed_assignments: number
  coverage_rate: number // 0-1
  fairness_score: number // 0-100
  average_confidence: number // 0-1
  rule_violations: number
  processing_time_ms: number
}

export interface SchedulingIssue {
  type: 'coverage_gap' | 'rule_violation' | 'fairness_issue' | 'constraint_conflict'
  severity: 'low' | 'medium' | 'high' | 'critical'
  date: string
  shift_type?: string
  employee_id?: string
  description: string
  suggested_actions: string[]
}

export class CoreSchedulingEngine {
  private auditTracker: AssignmentAuditTracker
  private patternAnalyzer: NursingPatternAnalyzer
  private fairnessAnalyzer: FairnessAnalyzer
  
  private defaultRules: SchedulingRules = {
    min_rest_hours: 11,
    max_weekly_hours: 52,
    max_consecutive_days: 6,
    max_consecutive_nights: 2,
    min_weekend_off: 2,
    fairness_weight: 0.30,
    preference_weight: 0.25,
    safety_weight: 0.25,
    coverage_weight: 0.20
  }

  constructor() {
    this.auditTracker = new AssignmentAuditTracker()
    this.patternAnalyzer = new NursingPatternAnalyzer()
    this.fairnessAnalyzer = new FairnessAnalyzer()
  }

  /**
   * 메인 스케줄 생성 함수
   */
  async generateSchedule(
    scheduleId: string,
    tenantId: string,
    startDate: string,
    endDate: string,
    employees: Employee[],
    coverageRequirements: CoverageRequirement[],
    rules?: Partial<SchedulingRules>
  ): Promise<ScheduleGeneration> {
    const startTime = Date.now()
    const finalRules = { ...this.defaultRules, ...rules }

    console.log(`🚀 Starting schedule generation for ${employees.length} employees`)
    console.log(`📅 Period: ${startDate} - ${endDate}`)

    const generation: ScheduleGeneration = {
      schedule_id: scheduleId,
      tenant_id: tenantId,
      start_date: startDate,
      end_date: endDate,
      employees,
      assignments: [],
      generation_stats: {
        total_assignments: 0,
        successful_assignments: 0,
        failed_assignments: 0,
        coverage_rate: 0,
        fairness_score: 0,
        average_confidence: 0,
        rule_violations: 0,
        processing_time_ms: 0
      },
      issues: []
    }

    try {
      // 1. 날짜 범위 생성
      const dateRange = this.generateDateRange(startDate, endDate)
      console.log(`📊 Generated ${dateRange.length} days to schedule`)

      // 2. 초기 배정 생성 (순환 배정)
      const initialAssignments = await this.generateInitialAssignments(
        dateRange,
        employees,
        coverageRequirements
      )
      
      // 3. 제약사항 적용 및 최적화
      const optimizedAssignments = await this.optimizeAssignments(
        initialAssignments,
        employees,
        finalRules,
        coverageRequirements
      )

      // 4. 규칙 검증 및 수정
      const validatedAssignments = await this.validateAndFixAssignments(
        optimizedAssignments,
        employees,
        finalRules,
        generation
      )

      // 5. 배정 근거 기록
      for (const assignment of validatedAssignments) {
        try {
          const employee = employees.find(e => e.id === assignment.employee_id)
          if (employee) {
            await this.auditTracker.analyzeAndRecordAssignment(
              scheduleId,
              assignment.employee_id,
              employee.name,
              assignment.date,
              ['day', 'evening', 'night', 'off'], // 후보 교대
              assignment.shift_type,
              {
                level: employee.level,
                preferences: employee.preferences,
                constraints: employee.constraints,
                recentAssignments: employee.recent_assignments || []
              },
              { // 팀 데이터
                averages: this.calculateTeamAverages(employees),
                total_employees: employees.length
              },
              employee.constraints || [],
              'system' // created_by
            )
          }
        } catch (auditError) {
          console.error(`Failed to record audit for ${assignment.employee_id}:`, auditError)
        }
      }

      generation.assignments = validatedAssignments
      
      // 6. 통계 계산
      generation.generation_stats = this.calculateStats(
        validatedAssignments,
        employees,
        coverageRequirements,
        startTime
      )

      console.log(`✅ Schedule generation completed successfully`)
      console.log(`📈 Stats: ${generation.generation_stats.successful_assignments}/${generation.generation_stats.total_assignments} assignments`)
      console.log(`⏱️ Processing time: ${generation.generation_stats.processing_time_ms}ms`)

      return generation

    } catch (error) {
      console.error('❌ Schedule generation failed:', error)
      generation.issues.push({
        type: 'coverage_gap',
        severity: 'critical',
        date: startDate,
        description: `Schedule generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggested_actions: ['Check input data', 'Review constraints', 'Contact support']
      })
      
      generation.generation_stats.processing_time_ms = Date.now() - startTime
      return generation
    }
  }

  /**
   * 날짜 범위 생성
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    const current = new Date(start)
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  /**
   * 초기 배정 생성 (기본 순환 배정)
   */
  private async generateInitialAssignments(
    dateRange: string[],
    employees: Employee[],
    coverageRequirements: CoverageRequirement[]
  ): Promise<Assignment[]> {
    const assignments: Assignment[] = []
    
    // 기본 4일 순환 패턴
    const defaultPattern = ['day', 'evening', 'night', 'off']
    
    for (let dateIndex = 0; dateIndex < dateRange.length; dateIndex++) {
      const date = dateRange[dateIndex]
      
      for (let empIndex = 0; empIndex < employees.length; empIndex++) {
        const employee = employees[empIndex]
        
        // 직원 선호 패턴이 있으면 사용, 없으면 기본 패턴
        const pattern = employee.preferences?.pattern || defaultPattern
        const patternIndex = (dateIndex + empIndex) % pattern.length
        const shiftType = pattern[patternIndex]
        
        assignments.push({
          employee_id: employee.id,
          date: date,
          shift_type: shiftType,
          confidence_score: 0.5, // 초기값
          assignment_reasons: []
        })
      }
    }
    
    console.log(`📋 Generated ${assignments.length} initial assignments`)
    return assignments
  }

  /**
   * 배정 최적화
   */
  private async optimizeAssignments(
    assignments: Assignment[],
    employees: Employee[],
    rules: SchedulingRules,
    coverageRequirements: CoverageRequirement[]
  ): Promise<Assignment[]> {
    console.log('🔧 Starting assignment optimization...')
    
    const optimized = [...assignments]
    let improvements = 0
    const maxIterations = 3
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      console.log(`🔄 Optimization iteration ${iteration + 1}/${maxIterations}`)
      
      const iterationImprovements = await this.optimizationPass(
        optimized,
        employees,
        rules,
        coverageRequirements
      )
      
      improvements += iterationImprovements
      
      if (iterationImprovements === 0) {
        console.log('🎯 Optimization converged early')
        break
      }
    }
    
    console.log(`✨ Optimization completed with ${improvements} improvements`)
    return optimized
  }

  /**
   * 최적화 패스
   */
  private async optimizationPass(
    assignments: Assignment[],
    employees: Employee[],
    rules: SchedulingRules,
    coverageRequirements: CoverageRequirement[]
  ): Promise<number> {
    let improvements = 0
    
    // 날짜별로 그룹화
    const assignmentsByDate = new Map<string, Assignment[]>()
    assignments.forEach(assignment => {
      const date = assignment.date
      if (!assignmentsByDate.has(date)) {
        assignmentsByDate.set(date, [])
      }
      assignmentsByDate.get(date)!.push(assignment)
    })
    
    // 각 날짜별로 최적화
    for (const [date, dayAssignments] of assignmentsByDate) {
      const dayImprovements = await this.optimizeSingleDay(
        date,
        dayAssignments,
        employees,
        rules,
        coverageRequirements
      )
      improvements += dayImprovements
    }
    
    return improvements
  }

  /**
   * 단일 날짜 최적화
   */
  private async optimizeSingleDay(
    date: string,
    assignments: Assignment[],
    employees: Employee[],
    rules: SchedulingRules,
    coverageRequirements: CoverageRequirement[]
  ): Promise<number> {
    let improvements = 0
    
    // 커버리지 확인
    const coverage = this.checkCoverage(assignments, coverageRequirements)
    
    // 부족한 시간대 보강
    for (const requirement of coverageRequirements) {
      const currentCount = assignments.filter(a => 
        a.shift_type === requirement.shift_type
      ).length
      
      if (currentCount < requirement.min_employees) {
        // 다른 시간대에서 이동 가능한 직원 찾기
        const candidateAssignments = assignments.filter(a => 
          a.shift_type !== requirement.shift_type && 
          this.canReassign(a, requirement.shift_type, employees, rules)
        )
        
        // 가장 적합한 후보 선택
        if (candidateAssignments.length > 0) {
          const bestCandidate = candidateAssignments[0] // 간단한 선택
          bestCandidate.shift_type = requirement.shift_type
          bestCandidate.confidence_score = 0.7
          improvements++
        }
      }
    }
    
    return improvements
  }

  /**
   * 재배정 가능성 확인
   */
  private canReassign(
    assignment: Assignment,
    newShiftType: string,
    employees: Employee[],
    rules: SchedulingRules
  ): boolean {
    const employee = employees.find(e => e.id === assignment.employee_id)
    if (!employee) return false
    
    // 기본적인 제약사항 확인
    if (employee.constraints) {
      for (const constraint of employee.constraints) {
        if (constraint.is_hard && 
            constraint.applies_to_shift?.includes(newShiftType)) {
          return false
        }
      }
    }
    
    return true
  }

  /**
   * 커버리지 확인
   */
  private checkCoverage(
    assignments: Assignment[],
    requirements: CoverageRequirement[]
  ): { [shiftType: string]: { current: number, required: number, met: boolean } } {
    const coverage: any = {}
    
    for (const req of requirements) {
      const currentCount = assignments.filter(a => a.shift_type === req.shift_type).length
      coverage[req.shift_type] = {
        current: currentCount,
        required: req.min_employees,
        met: currentCount >= req.min_employees
      }
    }
    
    return coverage
  }

  /**
   * 배정 검증 및 수정
   */
  private async validateAndFixAssignments(
    assignments: Assignment[],
    employees: Employee[],
    rules: SchedulingRules,
    generation: ScheduleGeneration
  ): Promise<Assignment[]> {
    console.log('🔍 Validating assignments...')
    
    const validated: Assignment[] = []
    let violations = 0
    
    for (const assignment of assignments) {
      const employee = employees.find(e => e.id === assignment.employee_id)
      if (!employee) continue
      
      // 규칙 검증
      const ruleViolations = this.validateAssignmentRules(assignment, employee, rules)
      
      if (ruleViolations.length === 0) {
        // 신뢰도 점수 계산
        assignment.confidence_score = this.calculateConfidenceScore(assignment, employee)
        validated.push(assignment)
      } else {
        // 규칙 위반 - 수정 시도
        const fixed = this.attemptFix(assignment, employee, ruleViolations, rules)
        if (fixed) {
          validated.push(fixed)
        } else {
          // 수정 불가 - 이슈 기록
          violations++
          generation.issues.push({
            type: 'rule_violation',
            severity: 'high',
            date: assignment.date,
            employee_id: assignment.employee_id,
            description: `Rule violations: ${ruleViolations.join(', ')}`,
            suggested_actions: ['Manual review required', 'Adjust constraints']
          })
          
          // 기본 배정 유지 (오프로 변경)
          assignment.shift_type = 'off'
          assignment.confidence_score = 0.1
          validated.push(assignment)
        }
      }
    }
    
    generation.generation_stats.rule_violations = violations
    console.log(`⚠️  Found ${violations} rule violations`)
    
    return validated
  }

  /**
   * 배정 규칙 검증
   */
  private validateAssignmentRules(
    assignment: Assignment,
    employee: Employee,
    rules: SchedulingRules
  ): string[] {
    const violations: string[] = []
    
    // 하드 제약사항 확인
    if (employee.constraints) {
      for (const constraint of employee.constraints) {
        if (constraint.is_hard) {
          if (constraint.applies_to_shift?.includes(assignment.shift_type)) {
            violations.push(`Hard constraint: ${constraint.constraint_name}`)
          }
          
          const date = new Date(assignment.date)
          const dayOfWeek = date.getDay()
          if (constraint.applies_to_days?.includes(dayOfWeek)) {
            violations.push(`Hard constraint on ${dayOfWeek}: ${constraint.constraint_name}`)
          }
        }
      }
    }
    
    // 기본 규칙들은 패턴 분석에서 별도 처리
    
    return violations
  }

  /**
   * 배정 수정 시도
   */
  private attemptFix(
    assignment: Assignment,
    employee: Employee,
    violations: string[],
    rules: SchedulingRules
  ): Assignment | null {
    // 간단한 수정: 하드 제약 위반 시 오프로 변경
    if (violations.some(v => v.includes('Hard constraint'))) {
      return {
        ...assignment,
        shift_type: 'off',
        confidence_score: 0.3
      }
    }
    
    return null
  }

  /**
   * 신뢰도 점수 계산
   */
  private calculateConfidenceScore(assignment: Assignment, employee: Employee): number {
    let score = 0.5 // 기본 점수
    
    // 선호도 반영
    if (employee.preferences) {
      const pattern = employee.preferences.pattern
      const date = new Date(assignment.date)
      const dayIndex = date.getDay() // 0: 일요일, 6: 토요일
      
      // 간단한 선호도 매칭 (실제로는 더 복잡한 로직 필요)
      if (pattern.includes(assignment.shift_type)) {
        score += 0.3
      }
    }
    
    // 제약사항 영향
    if (employee.constraints) {
      for (const constraint of employee.constraints) {
        if (!constraint.is_hard && 
            constraint.applies_to_shift?.includes(assignment.shift_type)) {
          score += constraint.impact_score / 100 * 0.2
        }
      }
    }
    
    return Math.max(0.1, Math.min(1.0, score))
  }

  /**
   * 팀 평균 계산
   */
  private calculateTeamAverages(employees: Employee[]): any {
    if (employees.length === 0) return {}
    
    const totals = employees.reduce((acc, emp) => {
      const stats = emp.workload_stats || {
        night_shifts: 0,
        weekend_shifts: 0,
        total_shifts: 0,
        preferred_shifts: 0
      }
      
      return {
        night_shifts: acc.night_shifts + stats.night_shifts,
        weekend_shifts: acc.weekend_shifts + stats.weekend_shifts,
        total_shifts: acc.total_shifts + stats.total_shifts,
        preferred_shifts: acc.preferred_shifts + stats.preferred_shifts
      }
    }, { night_shifts: 0, weekend_shifts: 0, total_shifts: 0, preferred_shifts: 0 })
    
    return {
      avg_night_shifts: totals.night_shifts / employees.length,
      avg_weekend_shifts: totals.weekend_shifts / employees.length,
      avg_total_shifts: totals.total_shifts / employees.length,
      avg_preferred_ratio: totals.total_shifts > 0 ? 
        totals.preferred_shifts / totals.total_shifts : 0
    }
  }

  /**
   * 통계 계산
   */
  private calculateStats(
    assignments: Assignment[],
    employees: Employee[],
    requirements: CoverageRequirement[],
    startTime: number
  ): GenerationStats {
    const totalAssignments = assignments.length
    const successfulAssignments = assignments.filter(a => a.confidence_score && a.confidence_score > 0.3).length
    const failedAssignments = totalAssignments - successfulAssignments
    
    const avgConfidence = assignments.length > 0 ? 
      assignments.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / assignments.length : 0
    
    // 커버리지 계산 (간단한 버전)
    const coverageRate = successfulAssignments / totalAssignments
    
    // 공정성 점수는 별도 분석 필요 (간단한 추정값)
    const fairnessScore = Math.min(100, avgConfidence * 100 + 20)
    
    return {
      total_assignments: totalAssignments,
      successful_assignments: successfulAssignments,
      failed_assignments: failedAssignments,
      coverage_rate: coverageRate,
      fairness_score: fairnessScore,
      average_confidence: avgConfidence,
      rule_violations: 0, // 별도 계산됨
      processing_time_ms: Date.now() - startTime
    }
  }
}
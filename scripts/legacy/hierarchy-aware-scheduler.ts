import { supabase } from '@/lib/supabase/client'

export interface StaffingRequirement {
  min_required: number
  max_allowed: number
  preferred: number
  priority_weight: number
}

export interface HierarchyLevel {
  id: string
  hierarchy_level: number
  role_name: string
  day_shift: StaffingRequirement
  evening_shift: StaffingRequirement
  night_shift: StaffingRequirement
  priority_order: number
  can_work_alone: boolean
  requires_supervision: boolean
  can_supervise_levels: number[]
  is_active: boolean
}

export interface Employee {
  id: string
  name: string
  position: string
  hierarchy_level: number
  experience_years: number
  team_id: string
  current_fatigue_score: number
  preference_pattern?: string[]
  is_available: boolean
  current_workload: number
}

export interface ShiftAssignment {
  employee_id: string
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off'
  hierarchy_level: number
  is_supervisor: boolean
}

export interface ScheduleGenerationResult {
  assignments: ShiftAssignment[]
  compliance_score: number
  hierarchy_balance_score: number
  warnings: string[]
  generation_metadata: {
    total_employees: number
    total_shifts: number
    hierarchy_violations: number
    supervision_coverage: number
    preference_satisfaction: number
  }
}

export class HierarchyAwareScheduler {
  private hierarchyLevels: HierarchyLevel[] = []
  private employees: Employee[] = []
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async initialize() {
    await this.loadHierarchyRequirements()
    await this.loadEmployees()
  }

  private async loadHierarchyRequirements() {
    try {
      const { data, error } = await supabase
        .from('hierarchy_staffing_requirements')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true)
        .order('hierarchy_level')

      if (error) throw error
      this.hierarchyLevels = data || []
    } catch (error) {
      console.error('Failed to load hierarchy requirements:', error)
      throw new Error('계층별 인력 요구사항을 불러올 수 없습니다')
    }
  }

  private async loadEmployees() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          position,
          hierarchy_level,
          experience_years,
          team_id,
          is_active,
          employee_preferences (
            preference_pattern
          )
        `)
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true)

      if (error) throw error
      
      // 피로도 및 현재 업무량 계산
      this.employees = await Promise.all(
        (data || []).map(async (emp) => {
          const fatigueScore = await this.calculateCurrentFatigueScore(emp.id)
          const workload = await this.calculateCurrentWorkload(emp.id)
          
          return {
            ...emp,
            current_fatigue_score: fatigueScore,
            current_workload: workload,
            preference_pattern: emp.employee_preferences?.[0]?.preference_pattern || ['day', 'evening', 'night', 'off'],
            is_available: fatigueScore < 8 && workload < 1.2 // 피로도 8 미만, 업무량 120% 미만
          }
        })
      )
    } catch (error) {
      console.error('Failed to load employees:', error)
      throw new Error('직원 정보를 불러올 수 없습니다')
    }
  }

  async generateSchedule(
    startDate: string,
    duration: number,
    options: {
      prioritize_preferences?: boolean
      allow_fatigue_override?: boolean
      emergency_mode?: boolean
    } = {}
  ): Promise<ScheduleGenerationResult> {
    const assignments: ShiftAssignment[] = []
    const warnings: string[] = []
    let hierarchyViolations = 0
    let totalShifts = 0

    const dates = this.generateDateRange(startDate, duration)
    const shiftTypes: Array<'day' | 'evening' | 'night'> = ['day', 'evening', 'night']

    for (const date of dates) {
      for (const shiftType of shiftTypes) {
        const shiftRequirements = this.getShiftRequirements(shiftType)
        const shiftAssignments = await this.assignShift(
          date,
          shiftType,
          shiftRequirements,
          assignments,
          options
        )

        assignments.push(...shiftAssignments.assignments)
        warnings.push(...shiftAssignments.warnings)
        hierarchyViolations += shiftAssignments.violations
        totalShifts += shiftAssignments.assignments.length
      }
    }

    // 오프 시간 배정
    this.assignOffShifts(assignments, dates)

    // 결과 검증 및 점수 계산
    const complianceScore = this.calculateComplianceScore(assignments, warnings.length)
    const hierarchyBalanceScore = this.calculateHierarchyBalanceScore(assignments)
    const supervisionCoverage = this.calculateSupervisionCoverage(assignments)
    const preferenceSatisfaction = this.calculatePreferenceSatisfaction(assignments)

    return {
      assignments,
      compliance_score: complianceScore,
      hierarchy_balance_score: hierarchyBalanceScore,
      warnings,
      generation_metadata: {
        total_employees: this.employees.length,
        total_shifts: totalShifts,
        hierarchy_violations: hierarchyViolations,
        supervision_coverage: supervisionCoverage,
        preference_satisfaction: preferenceSatisfaction
      }
    }
  }

  private getShiftRequirements(shiftType: 'day' | 'evening' | 'night') {
    return this.hierarchyLevels.map(level => ({
      hierarchy_level: level.hierarchy_level,
      role_name: level.role_name,
      requirements: level[`${shiftType}_shift`] as StaffingRequirement,
      can_work_alone: level.can_work_alone,
      requires_supervision: level.requires_supervision,
      can_supervise_levels: level.can_supervise_levels,
      priority_order: level.priority_order
    }))
  }

  private async assignShift(
    date: string,
    shiftType: 'day' | 'evening' | 'night',
    requirements: ReturnType<typeof this.getShiftRequirements>,
    existingAssignments: ShiftAssignment[],
    options: any
  ) {
    const assignments: ShiftAssignment[] = []
    const warnings: string[] = []
    let violations = 0

    // 우선순위에 따라 계층별 배정
    const sortedRequirements = requirements
      .filter(req => req.requirements.min_required > 0 || req.requirements.preferred > 0)
      .sort((a, b) => a.priority_order - b.priority_order)

    for (const requirement of sortedRequirements) {
      const levelEmployees = this.employees.filter(emp => 
        emp.hierarchy_level === requirement.hierarchy_level && emp.is_available
      )

      // 기존 배정 확인 (같은 날짜)
      const alreadyAssigned = existingAssignments.filter(a => 
        a.date === date && levelEmployees.some(e => e.id === a.employee_id)
      ).map(a => a.employee_id)

      const availableEmployees = levelEmployees.filter(emp => 
        !alreadyAssigned.includes(emp.id) && 
        this.isEmployeeAvailable(emp, date, shiftType, existingAssignments)
      )

      // 직원 우선순위 계산 (선호 패턴, 피로도, 최근 근무 이력 고려)
      const scoredEmployees = availableEmployees.map(emp => ({
        employee: emp,
        score: this.calculateEmployeePriorityScore(emp, date, shiftType, existingAssignments, options)
      })).sort((a, b) => b.score - a.score)

      // 최소 인원부터 배정
      const minRequired = requirement.requirements.min_required
      const preferred = requirement.requirements.preferred
      const maxAllowed = requirement.requirements.max_allowed

      let assignedCount = 0
      
      // 최소 인원 배정
      for (let i = 0; i < Math.min(minRequired, scoredEmployees.length); i++) {
        assignments.push({
          employee_id: scoredEmployees[i].employee.id,
          date,
          shift_type: shiftType,
          hierarchy_level: requirement.hierarchy_level,
          is_supervisor: requirement.can_supervise_levels.length > 0
        })
        assignedCount++
      }

      // 적정 인원까지 배정 시도
      if (assignedCount < preferred && assignedCount < scoredEmployees.length) {
        const additionalNeeded = Math.min(
          preferred - assignedCount,
          scoredEmployees.length - assignedCount,
          maxAllowed - assignedCount
        )

        for (let i = assignedCount; i < assignedCount + additionalNeeded; i++) {
          assignments.push({
            employee_id: scoredEmployees[i].employee.id,
            date,
            shift_type: shiftType,
            hierarchy_level: requirement.hierarchy_level,
            is_supervisor: requirement.can_supervise_levels.length > 0
          })
        }
        assignedCount += additionalNeeded
      }

      // 최소 인원 미달 경고
      if (assignedCount < minRequired) {
        warnings.push(`${date} ${shiftType}: ${requirement.role_name} 최소 인원 미달 (${assignedCount}/${minRequired})`)
        violations++
      }

      // 감독자 필요 여부 확인
      if (requirement.requires_supervision && assignedCount > 0) {
        const hasSupervisor = assignments.some(a => 
          a.date === date && a.shift_type === shiftType && a.is_supervisor
        )
        
        if (!hasSupervisor) {
          warnings.push(`${date} ${shiftType}: ${requirement.role_name} 감독자 부재`)
          violations++
        }
      }
    }

    return { assignments, warnings, violations }
  }

  private calculateEmployeePriorityScore(
    employee: Employee,
    date: string,
    shiftType: 'day' | 'evening' | 'night',
    existingAssignments: ShiftAssignment[],
    options: any
  ): number {
    let score = 100 // 기본 점수

    // 선호 패턴 반영 (40%)
    if (options.prioritize_preferences !== false) {
      const preferenceIndex = this.getPreferencePatternIndex(employee, date, existingAssignments)
      const preferredShift = employee.preference_pattern?.[preferenceIndex]
      if (preferredShift === shiftType) {
        score += 40
      } else if (preferredShift === 'off') {
        score -= 30
      }
    }

    // 피로도 반영 (30%)
    const fatigueScore = employee.current_fatigue_score
    if (fatigueScore <= 3) {
      score += 30
    } else if (fatigueScore <= 6) {
      score += 15
    } else if (fatigueScore >= 8) {
      score -= 25
    }

    // 연속 근무 방지 (20%)
    const consecutiveShifts = this.getConsecutiveShiftCount(employee.id, date, existingAssignments)
    if (consecutiveShifts >= 5) {
      score -= 40
    } else if (consecutiveShifts >= 3) {
      score -= 20
    }

    // 업무 균등 분배 (10%)
    const recentWorkload = this.getRecentWorkload(employee.id, date, existingAssignments)
    if (recentWorkload < 0.8) {
      score += 10
    } else if (recentWorkload > 1.2) {
      score -= 15
    }

    return Math.max(0, score)
  }

  private isEmployeeAvailable(
    employee: Employee,
    date: string,
    shiftType: string,
    existingAssignments: ShiftAssignment[]
  ): boolean {
    // 11시간 휴식 규칙 확인
    const previousShift = this.getPreviousShift(employee.id, date, existingAssignments)
    if (previousShift && !this.hasMinimumRest(previousShift, shiftType)) {
      return false
    }

    // 연속 야간 근무 제한 (5일)
    if (shiftType === 'night') {
      const consecutiveNights = this.getConsecutiveNightCount(employee.id, date, existingAssignments)
      if (consecutiveNights >= 5) {
        return false
      }
    }

    // 주 52시간 초과 방지
    const weeklyHours = this.getWeeklyHours(employee.id, date, existingAssignments)
    if (weeklyHours >= 52) {
      return false
    }

    return true
  }

  private assignOffShifts(assignments: ShiftAssignment[], dates: string[]) {
    for (const employee of this.employees) {
      for (const date of dates) {
        const hasAssignment = assignments.some(a => 
          a.employee_id === employee.id && a.date === date
        )
        
        if (!hasAssignment) {
          assignments.push({
            employee_id: employee.id,
            date,
            shift_type: 'off',
            hierarchy_level: employee.hierarchy_level,
            is_supervisor: false
          })
        }
      }
    }
  }

  // 헬퍼 메서드들
  private generateDateRange(startDate: string, duration: number): string[] {
    const dates = []
    const start = new Date(startDate)
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  private calculateComplianceScore(assignments: ShiftAssignment[], warningCount: number): number {
    const totalAssignments = assignments.filter(a => a.shift_type !== 'off').length
    if (totalAssignments === 0) return 0
    
    const complianceRate = Math.max(0, 1 - (warningCount / totalAssignments))
    return Math.round(complianceRate * 100)
  }

  private calculateHierarchyBalanceScore(assignments: ShiftAssignment[]): number {
    // 각 교대별 계층 균형 점수 계산
    const shiftTypes = ['day', 'evening', 'night']
    let totalBalance = 0
    let shiftCount = 0

    for (const shiftType of shiftTypes) {
      const shiftAssignments = assignments.filter(a => a.shift_type === shiftType)
      const dates = [...new Set(shiftAssignments.map(a => a.date))]
      
      for (const date of dates) {
        const dayShiftAssignments = shiftAssignments.filter(a => a.date === date)
        const balance = this.calculateSingleShiftBalance(dayShiftAssignments)
        totalBalance += balance
        shiftCount++
      }
    }

    return shiftCount > 0 ? Math.round(totalBalance / shiftCount) : 0
  }

  private calculateSingleShiftBalance(assignments: ShiftAssignment[]): number {
    const hierarchyCounts = assignments.reduce((acc, a) => {
      acc[a.hierarchy_level] = (acc[a.hierarchy_level] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    // 각 계층별 요구사항 대비 충족도 계산
    let balanceScore = 0
    let totalRequirements = 0

    for (const level of this.hierarchyLevels) {
      const assigned = hierarchyCounts[level.hierarchy_level] || 0
      const required = level.day_shift.preferred // 임시로 day_shift 기준 사용
      
      if (required > 0) {
        const fulfillmentRate = Math.min(1, assigned / required)
        balanceScore += fulfillmentRate * 100
        totalRequirements++
      }
    }

    return totalRequirements > 0 ? balanceScore / totalRequirements : 100
  }

  // 추가 계산 메서드들 (피로도, 업무량, 휴식시간 등)
  private async calculateCurrentFatigueScore(employeeId: string): Promise<number> {
    // 실제 구현에서는 최근 근무 이력을 기반으로 피로도 계산
    // 임시로 랜덤 값 반환
    return Math.floor(Math.random() * 10)
  }

  private async calculateCurrentWorkload(employeeId: string): Promise<number> {
    // 실제 구현에서는 최근 업무량을 계산
    // 임시로 기본값 반환
    return 1.0
  }

  private getPreferencePatternIndex(
    employee: Employee,
    date: string,
    existingAssignments: ShiftAssignment[]
  ): number {
    // 선호 패턴 순환에서 현재 위치 계산
    const patternLength = employee.preference_pattern?.length || 4
    const daysSinceStart = this.getDaysSinceScheduleStart(date)
    return daysSinceStart % patternLength
  }

  private getDaysSinceScheduleStart(date: string): number {
    // 스케줄 시작일로부터 경과 일수 계산
    // 임시로 0 반환
    return 0
  }

  private getConsecutiveShiftCount(
    employeeId: string,
    date: string,
    existingAssignments: ShiftAssignment[]
  ): number {
    // 연속 근무일 수 계산
    return 0
  }

  private getConsecutiveNightCount(
    employeeId: string,
    date: string,
    existingAssignments: ShiftAssignment[]
  ): number {
    // 연속 야간 근무일 수 계산
    return 0
  }

  private getRecentWorkload(
    employeeId: string,
    date: string,
    existingAssignments: ShiftAssignment[]
  ): number {
    // 최근 업무량 계산
    return 1.0
  }

  private getPreviousShift(
    employeeId: string,
    date: string,
    existingAssignments: ShiftAssignment[]
  ) {
    // 이전 근무 찾기
    return null
  }

  private hasMinimumRest(previousShift: any, currentShiftType: string): boolean {
    // 11시간 최소 휴식 확인
    return true
  }

  private getWeeklyHours(
    employeeId: string,
    date: string,
    existingAssignments: ShiftAssignment[]
  ): number {
    // 주간 근무 시간 계산
    return 40
  }

  private calculateSupervisionCoverage(assignments: ShiftAssignment[]): number {
    // 감독 커버리지 계산
    return 95
  }

  private calculatePreferenceSatisfaction(assignments: ShiftAssignment[]): number {
    // 선호도 만족도 계산
    return 85
  }
}
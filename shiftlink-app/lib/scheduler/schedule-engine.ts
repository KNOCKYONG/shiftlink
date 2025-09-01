import { createClient } from '@/lib/supabase/server'
import { 
  WorkPatternPreference, 
  calculatePatternScore,
  recommendWorkPattern,
  WORK_PATTERN_TEMPLATES 
} from './work-pattern-types'
import { NursingPatternAnalyzer } from './nursing-pattern-analyzer'

export interface Employee {
  id: string
  name: string
  role: 'admin' | 'manager' | 'employee'
  tenant_id: string
  team_id?: string
  level: number
  is_active: boolean
  employee_code: string
  preferences?: EmployeePreference[]
  constraints?: EmployeeConstraint[]
}

export interface EmployeePreference {
  id: string
  employee_id: string
  preference_pattern: string[] // ['night', 'day', 'evening', 'off']
  priority: number
  effective_from: string
  effective_to?: string
}

export interface EmployeeConstraint {
  id: string
  employee_id: string
  constraint_type: 'no_night' | 'fixed_day' | 'time_off' | 'max_consecutive'
  constraint_value: any
  reason?: string
  effective_from: string
  effective_to?: string
}

export interface ShiftTemplate {
  id: string
  name: string
  type: 'day' | 'evening' | 'night' | 'off'
  start_time: string
  end_time: string
  required_count: number
  tenant_id: string
}

export interface ScheduleRule {
  id: string
  tenant_id: string
  rule_name: string
  rule_type: 'min_rest_hours' | 'max_weekly_hours' | 'max_consecutive_nights' | 'min_staff_per_shift'
  rule_value: number
  is_active: boolean
}

export interface GeneratedAssignment {
  employee_id: string
  shift_template_id: string
  date: string
  start_time: string
  end_time: string
  is_overtime: boolean
  confidence_score: number
}

export class ScheduleEngine {
  private supabase: any
  private tenantId: string
  private nursingAnalyzer: NursingPatternAnalyzer

  constructor(tenantId: string) {
    this.tenantId = tenantId
    this.supabase = createClient()
    this.nursingAnalyzer = new NursingPatternAnalyzer()
  }

  /**
   * Main schedule generation method
   */
  async generateSchedule(
    startDate: string,
    endDate: string,
    employees: Employee[],
    shiftTemplates: ShiftTemplate[],
    rules: ScheduleRule[]
  ): Promise<GeneratedAssignment[]> {
    console.log(`Generating schedule from ${startDate} to ${endDate}`)

    const assignments: GeneratedAssignment[] = []
    const currentDate = new Date(startDate)
    const finalDate = new Date(endDate)

    // Get employee preferences, constraints, work patterns, and default requests
    const employeePrefs = await this.getEmployeePreferences(employees.map(e => e.id))
    const employeeConstraints = await this.getEmployeeConstraints(employees.map(e => e.id))
    const workPatterns = await this.getWorkPatternPreferences(employees.map(e => e.id))
    const defaultRequests = await this.getActiveDefaultRequests(this.tenantId, startDate, endDate)

    while (currentDate <= finalDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Generate assignments for this date
      const dailyAssignments = await this.generateDailySchedule(
        dateStr,
        employees,
        shiftTemplates,
        rules,
        employeePrefs,
        employeeConstraints,
        workPatterns,
        defaultRequests,
        assignments // Previous assignments for context
      )

      assignments.push(...dailyAssignments)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Optimize schedule for fairness and preferences
    const optimizedAssignments = this.optimizeSchedule(assignments, employees, rules)

    return optimizedAssignments
  }

  /**
   * Generate schedule for a single day
   */
  private async generateDailySchedule(
    date: string,
    employees: Employee[],
    shiftTemplates: ShiftTemplate[],
    rules: ScheduleRule[],
    preferences: Map<string, EmployeePreference[]>,
    constraints: Map<string, EmployeeConstraint[]>,
    workPatterns: Map<string, WorkPatternPreference>,
    defaultRequests: any[],
    previousAssignments: GeneratedAssignment[]
  ): Promise<GeneratedAssignment[]> {
    const dailyAssignments: GeneratedAssignment[] = []

    // 🎯 1단계: 사전 요청사항 우선 처리 (최고 우선순위)
    const preAssignedEmployees = await this.processDefaultRequests(
      date, 
      employees, 
      shiftTemplates, 
      defaultRequests, 
      dailyAssignments
    )
    
    console.log(`📋 사전 요청 처리 완료: ${preAssignedEmployees.length}명 배정됨`)

    // Sort shifts by priority (critical coverage first)
    const sortedShifts = this.sortShiftsByPriority(shiftTemplates)

    for (const shiftTemplate of sortedShifts) {
      // 이미 해당 시프트에 사전 배정된 인원 확인
      const alreadyAssigned = dailyAssignments.filter(
        assignment => assignment.shift_template_id === shiftTemplate.id
      ).length
      
      const remainingRequired = Math.max(0, shiftTemplate.required_count - alreadyAssigned)
      
      if (remainingRequired === 0) {
        console.log(`✅ ${shiftTemplate.name} 시프트는 사전 요청으로 충족됨`)
        continue
      }

      // Get available employees for this shift (사전 배정된 직원 제외)
      const availableEmployees = this.getAvailableEmployees(
        date,
        shiftTemplate,
        employees,
        constraints,
        previousAssignments,
        dailyAssignments
      )

      // Score employees based on preferences, fairness, rules, and nursing pattern safety
      const scoredEmployees = this.scoreEmployeesForShift(
        date,
        shiftTemplate,
        availableEmployees,
        preferences,
        workPatterns,
        previousAssignments,
        rules
      )

      // Ensure organization hierarchy coverage (남은 인원 기준)
      const selectedEmployees = this.selectEmployeesWithHierarchy(
        scoredEmployees,
        remainingRequired,
        employees
      )

      // Create assignments
      for (const employee of selectedEmployees) {
        dailyAssignments.push({
          employee_id: employee.id,
          shift_template_id: shiftTemplate.id,
          date,
          start_time: shiftTemplate.start_time,
          end_time: shiftTemplate.end_time,
          is_overtime: this.isOvertime(employee.id, date, previousAssignments),
          confidence_score: this.calculateConfidenceScore(employee, shiftTemplate, preferences, workPatterns)
        })
      }
    }

    return dailyAssignments
  }

  /**
   * Get available employees for a shift considering constraints
   */
  private getAvailableEmployees(
    date: string,
    shiftTemplate: ShiftTemplate,
    employees: Employee[],
    constraints: Map<string, EmployeeConstraint[]>,
    previousAssignments: GeneratedAssignment[],
    dailyAssignments: GeneratedAssignment[]
  ): Employee[] {
    return employees.filter(employee => {
      // Check if already assigned today
      if (dailyAssignments.some(a => a.employee_id === employee.id)) {
        return false
      }

      // Check employee constraints
      const empConstraints = constraints.get(employee.id) || []
      for (const constraint of empConstraints) {
        if (this.violatesConstraint(constraint, shiftTemplate, date)) {
          return false
        }
      }

      // Check minimum rest hours
      if (!this.hasMinimumRestHours(employee.id, date, shiftTemplate, previousAssignments)) {
        return false
      }

      // Check maximum consecutive nights
      if (shiftTemplate.type === 'night' && 
          this.exceedsMaxConsecutiveNights(employee.id, date, previousAssignments)) {
        return false
      }

      return true
    })
  }

  /**
   * Score employees based on preferences, work patterns, and fairness
   */
  private scoreEmployeesForShift(
    date: string,
    shiftTemplate: ShiftTemplate,
    employees: Employee[],
    preferences: Map<string, EmployeePreference[]>,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[],
    rules: ScheduleRule[]
  ): Array<{ employee: Employee; score: number }> {
    return employees.map(employee => {
      let score = 0

      // Preference matching score (0-40 points)
      const prefScore = this.calculatePreferenceScore(employee.id, shiftTemplate, preferences, date)
      score += prefScore

      // Work pattern score (0-30 points) - 짧은/긴 근무 패턴 선호도 반영
      const patternScore = this.calculateWorkPatternScore(employee, shiftTemplate, workPatterns, previousAssignments, date)
      score += patternScore * 0.85

      // Nursing pattern safety score (0-25 points) - NEW: 한국 간호사 위험 패턴 회피
      const nursingPatternScore = this.calculateNursingPatternSafetyScore(employee, shiftTemplate, previousAssignments, date)
      score += nursingPatternScore

      // Fairness score (0-20 points) - 비중 조정
      const fairnessScore = this.calculateFairnessScore(employee.id, previousAssignments) * 0.8
      score += fairnessScore

      // Organization hierarchy bonus (0-20 points)
      const hierarchyBonus = this.calculateHierarchyBonus(employee, shiftTemplate)
      score += hierarchyBonus

      // Consecutive shift penalty (0-10 points deduction)
      const consecutivePenalty = this.calculateConsecutivePenalty(employee.id, date, previousAssignments)
      score -= consecutivePenalty

      return { employee, score }
    }).sort((a, b) => b.score - a.score)
  }

  /**
   * Select employees ensuring balanced organization hierarchy coverage
   * 핵심: 신입 5명/선임 1명 같은 bad case 방지
   */
  private selectEmployeesWithHierarchy(
    scoredEmployees: Array<{ employee: Employee; score: number }>,
    requiredCount: number,
    allEmployees: Employee[]
  ): Employee[] {
    const selected: Employee[] = []
    
    // 레벨별 직원 그룹화 및 정보 수집
    const levelGroups = new Map<number, Employee[]>()
    const levelCounts = new Map<number, number>()
    
    scoredEmployees.forEach(({ employee }) => {
      if (!levelGroups.has(employee.level)) {
        levelGroups.set(employee.level, [])
        levelCounts.set(employee.level, 0)
      }
      levelGroups.get(employee.level)!.push(employee)
    })

    const levels = [...levelGroups.keys()].sort((a, b) => b - a) // 높은 레벨부터
    const highestLevel = Math.max(...levels)
    const lowestLevel = Math.min(...levels)
    
    // 1단계: 각 레벨에서 최소 1명씩 필수 선발
    console.log(`📊 Level balance check - Required: ${requiredCount}, Levels: ${levels.join(', ')}`)
    
    for (const level of levels) {
      const levelEmployees = scoredEmployees
        .filter(se => se.employee.level === level)
        .sort((a, b) => b.score - a.score)
      
      if (levelEmployees.length > 0 && selected.length < requiredCount) {
        selected.push(levelEmployees[0].employee)
        levelCounts.set(level, 1)
        console.log(`✅ Level ${level} 필수 선발: ${levelEmployees[0].employee.name}`)
      }
    }

    // 2단계: 레벨 밸런스 검증 및 조정
    const remainingSlots = requiredCount - selected.length
    if (remainingSlots > 0) {
      const balanceResult = this.calculateOptimalLevelBalance(
        levelGroups, 
        levelCounts, 
        remainingSlots,
        requiredCount
      )
      
      // 밸런스 기준으로 추가 선발
      for (const level of levels) {
        const targetCount = balanceResult.get(level) || 0
        const currentCount = levelCounts.get(level) || 0
        const needMore = targetCount - currentCount
        
        if (needMore > 0) {
          const availableEmployees = scoredEmployees
            .filter(se => se.employee.level === level && !selected.includes(se.employee))
            .sort((a, b) => b.score - a.score)
            .slice(0, needMore)
          
          availableEmployees.forEach(({ employee }) => {
            if (selected.length < requiredCount) {
              selected.push(employee)
              levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
              console.log(`⚖️ Level ${level} 밸런스 조정 선발: ${employee.name}`)
            }
          })
        }
      }
    }

    // 3단계: 남은 자리는 점수순으로 채우되 extreme imbalance 방지
    const finalRemaining = requiredCount - selected.length
    if (finalRemaining > 0) {
      const remaining = scoredEmployees
        .filter(se => !selected.includes(se.employee))
        .sort((a, b) => b.score - a.score)

      for (const { employee } of remaining) {
        if (selected.length >= requiredCount) break
        
        // Extreme imbalance 체크: 신입이 80% 이상이면 제한
        const wouldBeSelected = [...selected, employee]
        const levelDistribution = this.calculateLevelDistribution(wouldBeSelected)
        const lowestLevelRatio = (levelDistribution.get(lowestLevel) || 0) / wouldBeSelected.length
        
        if (lowestLevelRatio <= 0.8 || wouldBeSelected.length <= 2) { // 2명 이하면 제한 해제
          selected.push(employee)
          console.log(`📈 점수순 선발: ${employee.name} (Level ${employee.level})`)
        } else {
          console.log(`🚫 Extreme imbalance 방지: ${employee.name} (Level ${employee.level}) 제외`)
        }
      }
    }

    // 최종 밸런스 리포트
    const finalDistribution = this.calculateLevelDistribution(selected)
    console.log('🎯 최종 레벨 분포:', Object.fromEntries(finalDistribution))
    
    return selected
  }

  /**
   * 최적 레벨 밸런스 계산
   */
  private calculateOptimalLevelBalance(
    levelGroups: Map<number, Employee[]>,
    currentCounts: Map<number, number>,
    remainingSlots: number,
    totalRequired: number
  ): Map<number, number> {
    const targetCounts = new Map<number, number>()
    const levels = [...levelGroups.keys()].sort((a, b) => b - a)
    
    // 각 레벨별 가용 인원 계산
    const availableByLevel = new Map<number, number>()
    levels.forEach(level => {
      const current = currentCounts.get(level) || 0
      const total = levelGroups.get(level)?.length || 0
      availableByLevel.set(level, Math.max(0, total - current))
    })

    // 기본 목표: 총 인원을 레벨 수로 균등 분배
    const baseTarget = Math.floor(totalRequired / levels.length)
    const remainder = totalRequired % levels.length
    
    // 높은 레벨부터 우선 배정 (리더십 필요)
    levels.forEach((level, index) => {
      let target = baseTarget
      if (index < remainder) target += 1 // 나머지를 높은 레벨에 우선 배정
      
      const available = availableByLevel.get(level) || 0
      const current = currentCounts.get(level) || 0
      
      // 가용 인원을 초과하지 않도록 조정
      target = Math.min(target, current + available)
      targetCounts.set(level, target)
    })

    // 배정되지 않은 슬롯을 다른 레벨로 재배치
    const assignedTotal = Array.from(targetCounts.values()).reduce((sum, count) => sum + count, 0)
    const unassigned = totalRequired - assignedTotal
    
    if (unassigned > 0) {
      // 가용 인원이 많은 레벨부터 추가 배정
      const sortedByAvailable = levels
        .map(level => ({ 
          level, 
          available: availableByLevel.get(level) || 0,
          target: targetCounts.get(level) || 0,
          current: currentCounts.get(level) || 0
        }))
        .filter(item => item.available > item.target - item.current)
        .sort((a, b) => b.available - a.available)
      
      let remaining = unassigned
      for (const item of sortedByAvailable) {
        if (remaining <= 0) break
        const canAdd = Math.min(remaining, item.available - (item.target - item.current))
        if (canAdd > 0) {
          targetCounts.set(item.level, item.target + canAdd)
          remaining -= canAdd
        }
      }
    }

    return targetCounts
  }

  /**
   * 선발된 직원들의 레벨 분포 계산
   */
  private calculateLevelDistribution(employees: Employee[]): Map<number, number> {
    const distribution = new Map<number, number>()
    employees.forEach(emp => {
      distribution.set(emp.level, (distribution.get(emp.level) || 0) + 1)
    })
    return distribution
  }

  /**
   * Calculate nursing pattern safety score - 한국 간호사 위험 패턴 회피
   */
  private calculateNursingPatternSafetyScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    previousAssignments: GeneratedAssignment[],
    date: string
  ): number {
    // 최근 14일간의 배정 이력 가져오기
    const recentAssignments = this.getRecentAssignments(employee.id, date, previousAssignments, 14)
    
    // 가상의 배정을 추가해서 패턴 분석
    const testAssignments = [
      ...recentAssignments.map(a => ({
        date: a.date,
        shift_type: a.shift_template_id.includes('day') ? 'day' :
                   a.shift_template_id.includes('evening') ? 'evening' :
                   a.shift_template_id.includes('night') ? 'night' : 'off',
        leave_type: undefined
      })),
      {
        date: date,
        shift_type: shiftTemplate.type,
        leave_type: undefined
      }
    ]

    // 위험 패턴 감지
    let safetyScore = 25 // 기본 만점

    // 1. 연속 3교대 패턴 체크 (최대 -15점)
    const hasTripleShiftPattern = this.checkTripleShiftPattern(testAssignments, date)
    if (hasTripleShiftPattern) {
      safetyScore -= 15
      console.log(`❌ Triple shift pattern detected for ${employee.name} on ${date}`)
    }

    // 2. 연속 나이트 과다 체크 (최대 -10점)
    const consecutiveNights = this.countConsecutiveNights(testAssignments, date)
    if (consecutiveNights >= 4) {
      safetyScore -= 10
      console.log(`⚠️ Excessive consecutive nights (${consecutiveNights}) for ${employee.name}`)
    } else if (consecutiveNights === 3 && shiftTemplate.type === 'night') {
      safetyScore -= 5 // 4번째 나이트면 약간 감점
    }

    // 3. 번갈아 패턴 체크 (최대 -8점)
    const hasAlternatingPattern = this.checkAlternatingPattern(testAssignments)
    if (hasAlternatingPattern) {
      safetyScore -= 8
      console.log(`🔄 Alternating pattern detected for ${employee.name}`)
    }

    // 4. 더블 근무 후 불충분한 휴식 체크 (최대 -7점)
    const hasDoubleWithoutRest = this.checkDoubleWithoutRest(testAssignments, date)
    if (hasDoubleWithoutRest) {
      safetyScore -= 7
      console.log(`💪 Double shift without proper rest for ${employee.name}`)
    }

    // 5. 주말 나이트 가중치 (최대 -5점)
    const isWeekendNight = this.isWeekendNight(date, shiftTemplate.type)
    if (isWeekendNight) {
      safetyScore -= 3
    }

    return Math.max(0, safetyScore)
  }

  /**
   * 연속 3교대 패턴 체크 (D-E-N, N-D-E 등)
   */
  private checkTripleShiftPattern(assignments: Array<{ date: string; shift_type: string }>, targetDate: string): boolean {
    const sortedAssignments = assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // 최근 3일 체크
    for (let i = 0; i <= sortedAssignments.length - 3; i++) {
      const threeDay = sortedAssignments.slice(i, i + 3)
      
      // 3일이 연속인지 확인
      const dates = threeDay.map(a => new Date(a.date))
      let isConsecutive = true
      for (let j = 1; j < dates.length; j++) {
        const dayDiff = (dates[j].getTime() - dates[j-1].getTime()) / (1000 * 60 * 60 * 24)
        if (dayDiff !== 1) {
          isConsecutive = false
          break
        }
      }
      
      if (isConsecutive) {
        const shifts = threeDay.map(a => a.shift_type).filter(s => s !== 'off')
        if (shifts.length === 3) {
          const uniqueShifts = new Set(shifts)
          // 3개의 서로 다른 시프트가 나오면 위험
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
   * 연속 나이트 수 계산
   */
  private countConsecutiveNights(assignments: Array<{ date: string; shift_type: string }>, targetDate: string): number {
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
   * 번갈아 패턴 체크 (D-Off-N-Off-E 등)
   */
  private checkAlternatingPattern(assignments: Array<{ date: string; shift_type: string }>): boolean {
    const workDays = assignments.filter(a => a.shift_type !== 'off')
    
    if (workDays.length < 3) return false
    
    // 최근 5일 중 3개 이상의 서로 다른 시프트가 번갈아 나오는지 체크
    const recentWork = workDays.slice(-5)
    const shiftTypes = recentWork.map(a => a.shift_type)
    const uniqueShifts = new Set(shiftTypes)
    
    if (uniqueShifts.size >= 3) {
      // 연속성이 없는 패턴인지 체크
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
   * 더블 근무 후 불충분한 휴식 체크
   */
  private checkDoubleWithoutRest(assignments: Array<{ date: string; shift_type: string }>, targetDate: string): boolean {
    const sortedAssignments = assignments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // 최근 4일 패턴 체크
    for (let i = 0; i <= sortedAssignments.length - 4; i++) {
      const fourDay = sortedAssignments.slice(i, i + 4)
      
      // 더블 패턴 + 1일 휴식 + 근무 복귀 체크
      const isDouble = (
        (fourDay[0].shift_type === 'day' && fourDay[1].shift_type === 'evening') ||
        (fourDay[0].shift_type === 'evening' && fourDay[1].shift_type === 'night')
      )
      
      if (isDouble && 
          fourDay[2].shift_type === 'off' && 
          fourDay[3].shift_type !== 'off' &&
          fourDay[3].date === targetDate) {
        return true
      }
    }
    
    return false
  }

  /**
   * 주말 나이트 여부 체크
   */
  private isWeekendNight(date: string, shiftType: string): boolean {
    if (shiftType !== 'night') return false
    
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    
    // 금요일(5) 나이트 또는 토요일(6) 나이트
    return dayOfWeek === 5 || dayOfWeek === 6
  }

  /**
   * Calculate work pattern score - 짧은/긴 근무 패턴 선호도 반영
   */
  private calculateWorkPatternScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    workPatterns: Map<string, WorkPatternPreference>,
    previousAssignments: GeneratedAssignment[],
    date: string
  ): number {
    const pattern = workPatterns.get(employee.id)
    if (!pattern) return 15 // Neutral score if no pattern set

    // Get recent assignments for this employee to analyze current work streak
    const recentAssignments = this.getRecentAssignments(employee.id, date, previousAssignments, 14)
    
    // Create assignment object for pattern scoring
    const assignment = {
      date,
      shift_type: shiftTemplate.type
    }

    // Use the pattern scoring function from work-pattern-types.ts
    const patternScore = calculatePatternScore(employee, assignment, recentAssignments, pattern)
    
    // Scale the score from 0-100 to 0-35 points
    return (patternScore / 100) * 35
  }

  /**
   * Calculate preference score for employee and shift
   */
  private calculatePreferenceScore(
    employeeId: string,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    date: string
  ): number {
    const empPreferences = preferences.get(employeeId) || []
    if (empPreferences.length === 0) return 20 // Neutral score

    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    
    // Find the most recent active preference
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

    // Perfect match
    if (preferredShift === shiftTemplate.type) {
      return 40
    }

    // Partial match logic
    if (preferredShift === 'off' && shiftTemplate.type !== 'night') {
      return 10 // Slight preference for non-night when wanting off
    }

    return 5 // Low score for non-matching shifts
  }

  /**
   * Calculate fairness score based on total work hours
   */
  private calculateFairnessScore(employeeId: string, previousAssignments: GeneratedAssignment[]): number {
    const employeeAssignments = previousAssignments.filter(a => a.employee_id === employeeId)
    const totalHours = employeeAssignments.length * 8 // Assuming 8-hour shifts

    // Lower hours = higher score
    const avgHours = previousAssignments.length > 0 ? 
      (previousAssignments.length * 8) / new Set(previousAssignments.map(a => a.employee_id)).size : 0

    if (totalHours < avgHours * 0.8) return 30
    if (totalHours < avgHours * 0.9) return 25
    if (totalHours < avgHours * 1.1) return 20
    if (totalHours < avgHours * 1.2) return 15
    return 10
  }

  /**
   * Calculate hierarchy bonus
   */
  private calculateHierarchyBonus(employee: Employee, shiftTemplate: ShiftTemplate): number {
    // Higher level employees get slight bonus for critical shifts
    if (shiftTemplate.type === 'night' || shiftTemplate.name.includes('supervisor')) {
      return Math.min(employee.level * 5, 20)
    }
    return employee.level * 2
  }

  /**
   * Calculate consecutive shift penalty
   */
  private calculateConsecutivePenalty(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): number {
    const recentAssignments = this.getRecentAssignments(employeeId, date, previousAssignments, 7)
    const consecutiveDays = this.countConsecutiveDays(recentAssignments, date)

    if (consecutiveDays >= 5) return 10
    if (consecutiveDays >= 3) return 5
    return 0
  }

  /**
   * Helper methods for constraints and rules
   */
  private violatesConstraint(
    constraint: EmployeeConstraint,
    shiftTemplate: ShiftTemplate,
    date: string
  ): boolean {
    const constraintDate = new Date(date)
    const effectiveFrom = new Date(constraint.effective_from)
    const effectiveTo = constraint.effective_to ? new Date(constraint.effective_to) : new Date('2099-12-31')

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
        // Assuming constraint_value contains start and end dates
        const timeOffData = constraint.constraint_value as { start_date: string; end_date: string }
        const timeOffStart = new Date(timeOffData.start_date)
        const timeOffEnd = new Date(timeOffData.end_date)
        return constraintDate >= timeOffStart && constraintDate <= timeOffEnd

      default:
        return false
    }
  }

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

    // Calculate hours between end of last shift and start of new shift
    const lastEndTime = new Date(`${lastAssignment.date}T${lastAssignment.end_time}`)
    const newStartTime = new Date(`${date}T${shiftTemplate.start_time}`)

    // Handle overnight shifts
    if (lastEndTime > newStartTime) {
      newStartTime.setDate(newStartTime.getDate() + 1)
    }

    const restHours = (newStartTime.getTime() - lastEndTime.getTime()) / (1000 * 60 * 60)
    return restHours >= 11 // Minimum 11 hours rest
  }

  private exceedsMaxConsecutiveNights(
    employeeId: string,
    date: string,
    previousAssignments: GeneratedAssignment[]
  ): boolean {
    const recentNightShifts = this.getRecentNightShifts(employeeId, date, previousAssignments, 7)
    return recentNightShifts >= 3 // Max 3 consecutive nights
  }

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
        break // Not consecutive
      }
    }

    return consecutiveNights
  }

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

    return assignments.reverse() // Oldest first
  }

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

  private isOvertime(employeeId: string, date: string, previousAssignments: GeneratedAssignment[]): boolean {
    const currentWeekStart = this.getWeekStart(new Date(date))
    const weeklyHours = previousAssignments
      .filter(a => {
        const assignmentDate = new Date(a.date)
        return a.employee_id === employeeId && 
               assignmentDate >= currentWeekStart &&
               assignmentDate < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      })
      .length * 8 // Assuming 8-hour shifts

    return weeklyHours + 8 > 52 // Over 52 hours per week
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }

  private calculateConfidenceScore(
    employee: Employee,
    shiftTemplate: ShiftTemplate,
    preferences: Map<string, EmployeePreference[]>,
    workPatterns?: Map<string, WorkPatternPreference>
  ): number {
    // Base confidence
    let confidence = 0.7

    // Boost for preference match
    const empPrefs = preferences.get(employee.id) || []
    if (empPrefs.length > 0) {
      // Simplified preference matching
      confidence += 0.15
    }

    // Boost for work pattern match
    if (workPatterns) {
      const pattern = workPatterns.get(employee.id)
      if (pattern) {
        // Check if shift type matches pattern preferences
        const shiftPreference = pattern.shift_type_preferences[shiftTemplate.type as keyof typeof pattern.shift_type_preferences]
        if (shiftPreference && shiftPreference >= 7) {
          confidence += 0.1
        }
      }
    }

    // Boost for hierarchy match
    if ((shiftTemplate.type === 'night' && employee.level >= 2) ||
        (shiftTemplate.type !== 'night' && employee.level >= 1)) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  private sortShiftsByPriority(shiftTemplates: ShiftTemplate[]): ShiftTemplate[] {
    return shiftTemplates.sort((a, b) => {
      // Night shifts have highest priority due to safety requirements
      const priorityOrder = { 'night': 3, 'evening': 2, 'day': 1, 'off': 0 }
      return (priorityOrder[b.type] || 0) - (priorityOrder[a.type] || 0)
    })
  }

  private optimizeSchedule(
    assignments: GeneratedAssignment[],
    employees: Employee[],
    rules: ScheduleRule[]
  ): GeneratedAssignment[] {
    // Simple optimization: try to balance work hours
    const employeeHours = new Map<string, number>()
    
    assignments.forEach(assignment => {
      const current = employeeHours.get(assignment.employee_id) || 0
      employeeHours.set(assignment.employee_id, current + 8)
    })

    // Calculate target hours per employee
    const totalHours = assignments.length * 8
    const targetHoursPerEmployee = totalHours / employees.length

    // Identify overworked and underworked employees
    const overworked = Array.from(employeeHours.entries())
      .filter(([_, hours]) => hours > targetHoursPerEmployee * 1.2)
      .map(([id]) => id)

    const underworked = Array.from(employeeHours.entries())
      .filter(([_, hours]) => hours < targetHoursPerEmployee * 0.8)
      .map(([id]) => id)

    // Try to swap assignments between overworked and underworked
    // This is a simplified optimization - in practice, you'd want more sophisticated algorithms
    
    return assignments
  }

  /**
   * Fetch employee preferences from database
   */
  private async getEmployeePreferences(employeeIds: string[]): Promise<Map<string, EmployeePreference[]>> {
    const { data: preferences } = await this.supabase
      .from('employee_preferences')
      .select('*')
      .in('employee_id', employeeIds)

    const prefMap = new Map<string, EmployeePreference[]>()
    
    preferences?.forEach((pref: any) => {
      const existing = prefMap.get(pref.employee_id) || []
      existing.push(pref)
      prefMap.set(pref.employee_id, existing)
    })

    return prefMap
  }

  /**
   * Fetch employee constraints from database
   */
  private async getEmployeeConstraints(employeeIds: string[]): Promise<Map<string, EmployeeConstraint[]>> {
    const { data: constraints } = await this.supabase
      .from('employee_constraints')
      .select('*')
      .in('employee_id', employeeIds)

    const constraintMap = new Map<string, EmployeeConstraint[]>()
    
    constraints?.forEach((constraint: any) => {
      const existing = constraintMap.get(constraint.employee_id) || []
      existing.push(constraint)
      constraintMap.set(constraint.employee_id, existing)
    })

    return constraintMap
  }

  /**
   * Fetch work pattern preferences from database
   */
  private async getWorkPatternPreferences(employeeIds: string[]): Promise<Map<string, WorkPatternPreference>> {
    const { data: patterns } = await this.supabase
      .from('work_pattern_preferences')
      .select('*')
      .in('employee_id', employeeIds)

    const patternMap = new Map<string, WorkPatternPreference>()
    
    patterns?.forEach((pattern: any) => {
      patternMap.set(pattern.employee_id, pattern)
    })

    return patternMap
  }

  /**
   * 활성화된 사전 요청사항 조회
   */
  private async getActiveDefaultRequests(tenantId: string, startDate: string, endDate: string): Promise<any[]> {
    const { data: requests, error } = await this.supabase
      .from('default_requests')
      .select(`
        *,
        employees(id, name, level)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .eq('auto_apply', true)
      .or(`
        and(is_recurring.eq.false, specific_date.gte.${startDate}, specific_date.lte.${endDate}),
        and(is_recurring.eq.true, start_date.lte.${endDate}, or(end_date.gte.${startDate}, end_date.is.null))
      `)

    if (error) {
      console.error('Error fetching default requests:', error)
      return []
    }

    return requests || []
  }

  /**
   * 사전 요청사항 처리 (고정 근무, 휴가 등)
   */
  private async processDefaultRequests(
    date: string,
    employees: Employee[],
    shiftTemplates: ShiftTemplate[],
    defaultRequests: any[],
    dailyAssignments: GeneratedAssignment[]
  ): Promise<string[]> {
    const processedEmployeeIds: string[] = []
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()

    console.log(`📋 Processing ${defaultRequests.length} default requests for ${date}`)

    // 우선순위별로 정렬 (1이 가장 높음)
    const sortedRequests = defaultRequests.sort((a, b) => a.priority - b.priority)

    for (const request of sortedRequests) {
      const employeeId = request.employee_id
      
      // 이미 처리된 직원은 건너뛰기
      if (processedEmployeeIds.includes(employeeId)) {
        console.log(`⏭️ Employee ${employeeId} already processed`)
        continue
      }

      // 해당 날짜에 적용되는지 확인
      if (!this.isRequestApplicableOnDate(request, date, dayOfWeek)) {
        continue
      }

      const employee = employees.find(e => e.id === employeeId)
      if (!employee) {
        console.log(`❌ Employee ${employeeId} not found`)
        continue
      }

      try {
        const assigned = await this.applyDefaultRequest(
          request, 
          employee, 
          shiftTemplates, 
          date, 
          dailyAssignments
        )

        if (assigned) {
          processedEmployeeIds.push(employeeId)
          console.log(`✅ Default request applied: ${employee.name} -> ${request.request_type}`)
        }
      } catch (error) {
        console.error(`❌ Failed to apply default request for ${employee.name}:`, error)
      }
    }

    return processedEmployeeIds
  }

  /**
   * 특정 날짜에 요청이 적용되는지 확인
   */
  private isRequestApplicableOnDate(request: any, date: string, dayOfWeek: number): boolean {
    const dateObj = new Date(date)

    // 특정 날짜 요청
    if (!request.is_recurring && request.specific_date) {
      return request.specific_date === date
    }

    // 반복 요청
    if (request.is_recurring && request.day_of_week !== null) {
      if (request.day_of_week !== dayOfWeek) {
        return false
      }

      // 적용 기간 확인
      if (request.start_date && dateObj < new Date(request.start_date)) {
        return false
      }
      if (request.end_date && dateObj > new Date(request.end_date)) {
        return false
      }

      return true
    }

    return false
  }

  /**
   * 사전 요청사항을 실제로 적용
   */
  private async applyDefaultRequest(
    request: any,
    employee: Employee,
    shiftTemplates: ShiftTemplate[],
    date: string,
    dailyAssignments: GeneratedAssignment[]
  ): Promise<boolean> {
    switch (request.request_type) {
      case 'fixed_shift':
        return this.applyFixedShiftRequest(request, employee, shiftTemplates, date, dailyAssignments)
      
      case 'leave':
      case 'preferred_off':
        return this.applyLeaveRequest(request, employee, shiftTemplates, date, dailyAssignments)
      
      case 'constraint':
        // 제약사항은 배정에서 제외하는 방식으로 처리됨
        console.log(`ℹ️ Constraint applied for ${employee.name}: ${request.description}`)
        return true
      
      default:
        console.log(`⚠️ Unknown request type: ${request.request_type}`)
        return false
    }
  }

  /**
   * 고정 근무 요청 적용
   */
  private applyFixedShiftRequest(
    request: any,
    employee: Employee,
    shiftTemplates: ShiftTemplate[],
    date: string,
    dailyAssignments: GeneratedAssignment[]
  ): boolean {
    const targetShift = shiftTemplates.find(template => template.type === request.shift_type)
    
    if (!targetShift) {
      console.log(`❌ Shift template not found: ${request.shift_type}`)
      return false
    }

    // 이미 해당 시프트에 배정되어 있는지 확인
    const existingAssignment = dailyAssignments.find(
      assignment => assignment.employee_id === employee.id
    )

    if (existingAssignment) {
      console.log(`⚠️ Employee ${employee.name} already has assignment`)
      return false
    }

    // 고정 근무 배정
    dailyAssignments.push({
      employee_id: employee.id,
      shift_template_id: targetShift.id,
      date: date,
      start_time: targetShift.start_time,
      end_time: targetShift.end_time,
      is_overtime: false,
      confidence_score: 1.0 // 사전 요청이므로 최고 신뢰도
    })

    console.log(`🎯 Fixed shift assigned: ${employee.name} -> ${request.shift_type} on ${date}`)
    return true
  }

  /**
   * 휴가/휴무 요청 적용
   */
  private applyLeaveRequest(
    request: any,
    employee: Employee,
    shiftTemplates: ShiftTemplate[],
    date: string,
    dailyAssignments: GeneratedAssignment[]
  ): boolean {
    const offTemplate = shiftTemplates.find(template => template.type === 'off')
    
    if (offTemplate) {
      dailyAssignments.push({
        employee_id: employee.id,
        shift_template_id: offTemplate.id,
        date: date,
        start_time: offTemplate.start_time,
        end_time: offTemplate.end_time,
        is_overtime: false,
        confidence_score: 1.0
      })
    }

    console.log(`🏖️ Leave applied: ${employee.name} is off on ${date}`)
    return true
  }

  /**
   * Save generated assignments to database
   */
  async saveAssignments(assignments: GeneratedAssignment[]): Promise<void> {
    const { error } = await this.supabase
      .from('schedule_assignments')
      .insert(
        assignments.map(assignment => ({
          employee_id: assignment.employee_id,
          shift_template_id: assignment.shift_template_id,
          date: assignment.date,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
          is_overtime: assignment.is_overtime,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )

    if (error) {
      throw new Error(`Failed to save assignments: ${error.message}`)
    }
  }
}
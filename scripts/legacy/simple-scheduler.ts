/**
 * Simple Scheduler Implementation
 * A standalone scheduler that implements the core scheduling logic
 * without external dependencies
 */

export interface ScheduleEmployee {
  id: string
  name: string
  level: string // 'lv1', 'lv2', etc.
  level_title?: string
  team: string
  team_id?: string
}

export interface ScheduleAssignment {
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off' | 'leave'
  employees: ScheduleEmployee[]
}

export interface CoverageRequirement {
  date: string
  shift_type: 'day' | 'evening' | 'night'
  level_requirements: {
    level: string
    count: number
  }[]
}

export interface ScheduleRequest {
  start_date: string
  end_date: string
  team_ids: string[]
  coverage_requirements: CoverageRequirement[]
  generation_options?: {
    enforce_fairness?: boolean
    enforce_mentorship_pairing?: boolean
    prioritize_preferences?: boolean
  }
}

interface EmployeeWorkload {
  employeeId: string
  totalShifts: number
  nightShifts: number
  weekendShifts: number
  consecutiveNights: number
  lastShiftDate?: string
  lastShiftType?: string
}

export class SimpleScheduler {
  private workloadMap: Map<string, EmployeeWorkload> = new Map()
  
  /**
   * Main schedule generation method
   */
  async generateSchedule(
    request: ScheduleRequest,
    employees: ScheduleEmployee[]
  ): Promise<ScheduleAssignment[]> {
    console.log('🚀 Starting smart schedule generation')
    
    // Initialize workload tracking
    this.initializeWorkload(employees)
    
    const assignments: ScheduleAssignment[] = []
    const startDate = new Date(request.start_date)
    const endDate = new Date(request.end_date)
    
    // Generate schedule day by day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      
      // Get requirements for this date
      const dayRequirements = request.coverage_requirements.filter(req => req.date === dateStr)
      
      for (const requirement of dayRequirements) {
        const assignment = this.assignShift(
          dateStr,
          dayOfWeek,
          requirement,
          employees,
          assignments,
          request.generation_options
        )
        
        if (assignment) {
          assignments.push(assignment)
        }
      }
    }
    
    // Apply final optimization
    return this.optimizeSchedule(assignments, employees)
  }
  
  /**
   * Initialize workload tracking for all employees
   */
  private initializeWorkload(employees: ScheduleEmployee[]) {
    this.workloadMap.clear()
    for (const employee of employees) {
      this.workloadMap.set(employee.id, {
        employeeId: employee.id,
        totalShifts: 0,
        nightShifts: 0,
        weekendShifts: 0,
        consecutiveNights: 0
      })
    }
  }
  
  /**
   * Assign employees to a shift with smart scheduling logic
   */
  private assignShift(
    date: string,
    dayOfWeek: number,
    requirement: CoverageRequirement,
    employees: ScheduleEmployee[],
    previousAssignments: ScheduleAssignment[],
    options?: any
  ): ScheduleAssignment | null {
    const assignedEmployees: ScheduleEmployee[] = []
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Group employees by level
    const employeesByLevel = this.groupByLevel(employees)
    
    // Process each level requirement
    for (const levelReq of requirement.level_requirements) {
      const availableEmployees = employeesByLevel[levelReq.level] || []
      
      // Score and rank employees
      const scoredEmployees = this.scoreEmployees(
        availableEmployees,
        date,
        requirement.shift_type,
        isWeekend,
        previousAssignments
      )
      
      // Select best candidates
      const selected = scoredEmployees
        .filter(se => se.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, levelReq.count)
        .map(se => se.employee)
      
      // Update workload for selected employees
      for (const employee of selected) {
        this.updateWorkload(employee.id, requirement.shift_type, isWeekend, date)
      }
      
      assignedEmployees.push(...selected)
    }
    
    if (assignedEmployees.length === 0) {
      return null
    }
    
    return {
      date,
      shift_type: requirement.shift_type,
      employees: assignedEmployees
    }
  }
  
  /**
   * Score employees based on multiple factors
   */
  private scoreEmployees(
    employees: ScheduleEmployee[],
    date: string,
    shiftType: string,
    isWeekend: boolean,
    previousAssignments: ScheduleAssignment[]
  ): { employee: ScheduleEmployee; score: number }[] {
    const scoredEmployees = []
    
    for (const employee of employees) {
      let score = 100 // Base score
      const workload = this.workloadMap.get(employee.id)!
      
      // Check if already assigned on this date
      const alreadyAssigned = previousAssignments.some(
        a => a.date === date && a.employees.some(e => e.id === employee.id)
      )
      
      if (alreadyAssigned) {
        score = -1000 // Cannot assign to multiple shifts on same day
      } else {
        // Apply workload balancing
        score -= workload.totalShifts * 5 // Reduce score based on total shifts
        
        // Night shift specific rules
        if (shiftType === 'night') {
          // Avoid consecutive nights (max 3)
          if (workload.consecutiveNights >= 2) {
            score -= 80 // Strongly discourage 3+ consecutive nights
          } else if (workload.consecutiveNights === 1) {
            score -= 20 // Slightly discourage 2 consecutive nights
          }
          
          // Balance night shift distribution
          score -= workload.nightShifts * 10
        }
        
        // Weekend balancing
        if (isWeekend) {
          score -= workload.weekendShifts * 15
        }
        
        // Check recent assignments to avoid back-to-back difficult patterns
        const recentPattern = this.getRecentPattern(employee.id, date, previousAssignments)
        const patternScore = this.evaluatePattern(recentPattern, shiftType)
        score += patternScore
        
        // Add slight randomness for variety (±5 points)
        score += (Math.random() - 0.5) * 10
        
        // Ensure minimum rest between shifts
        if (workload.lastShiftDate) {
          const lastDate = new Date(workload.lastShiftDate)
          const currentDate = new Date(date)
          const hoursDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60)
          
          if (hoursDiff < 11) {
            score -= 100 // Minimum 11 hours rest required
          }
        }
      }
      
      scoredEmployees.push({ employee, score })
    }
    
    return scoredEmployees
  }
  
  /**
   * Get recent work pattern for pattern analysis
   */
  private getRecentPattern(
    employeeId: string,
    currentDate: string,
    assignments: ScheduleAssignment[]
  ): string[] {
    const pattern: string[] = []
    const date = new Date(currentDate)
    
    // Look back 7 days
    for (let i = 6; i >= 1; i--) {
      const checkDate = new Date(date)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      
      const assignment = assignments.find(
        a => a.date === dateStr && a.employees.some(e => e.id === employeeId)
      )
      
      if (assignment) {
        pattern.push(assignment.shift_type)
      } else {
        pattern.push('off')
      }
    }
    
    return pattern
  }
  
  /**
   * Evaluate work pattern for safety and fairness
   */
  private evaluatePattern(pattern: string[], nextShift: string): number {
    let score = 0
    
    // Check for dangerous patterns
    const recentNights = pattern.filter(s => s === 'night').length
    const lastShift = pattern[pattern.length - 1]
    
    // Avoid night → day (need rest)
    if (lastShift === 'night' && nextShift === 'day') {
      score -= 50
    }
    
    // Avoid too many nights in a week
    if (nextShift === 'night' && recentNights >= 2) {
      score -= 30
    }
    
    // Prefer consistent patterns
    if (lastShift === nextShift) {
      score += 10
    }
    
    // Encourage rest after intensive periods
    const consecutiveWork = this.countConsecutiveWork(pattern)
    if (consecutiveWork >= 5 && nextShift !== 'off') {
      score -= 40
    }
    
    return score
  }
  
  /**
   * Count consecutive working days
   */
  private countConsecutiveWork(pattern: string[]): number {
    let count = 0
    for (let i = pattern.length - 1; i >= 0; i--) {
      if (pattern[i] !== 'off' && pattern[i] !== 'leave') {
        count++
      } else {
        break
      }
    }
    return count
  }
  
  /**
   * Update employee workload tracking
   */
  private updateWorkload(
    employeeId: string,
    shiftType: string,
    isWeekend: boolean,
    date: string
  ) {
    const workload = this.workloadMap.get(employeeId)
    if (!workload) return
    
    workload.totalShifts++
    
    if (shiftType === 'night') {
      workload.nightShifts++
      if (workload.lastShiftType === 'night') {
        workload.consecutiveNights++
      } else {
        workload.consecutiveNights = 1
      }
    } else {
      workload.consecutiveNights = 0
    }
    
    if (isWeekend) {
      workload.weekendShifts++
    }
    
    workload.lastShiftDate = date
    workload.lastShiftType = shiftType
  }
  
  /**
   * Group employees by level
   */
  private groupByLevel(employees: ScheduleEmployee[]): Record<string, ScheduleEmployee[]> {
    const grouped: Record<string, ScheduleEmployee[]> = {}
    
    for (const employee of employees) {
      if (!grouped[employee.level]) {
        grouped[employee.level] = []
      }
      grouped[employee.level].push(employee)
    }
    
    return grouped
  }
  
  /**
   * Final optimization pass for fairness
   */
  private optimizeSchedule(
    assignments: ScheduleAssignment[],
    employees: ScheduleEmployee[]
  ): ScheduleAssignment[] {
    // Calculate final statistics
    const stats = this.calculateStatistics(assignments, employees)
    
    console.log('📊 Schedule Statistics:')
    console.log(`  - Total Assignments: ${assignments.length}`)
    console.log(`  - Average Shifts per Employee: ${stats.avgShifts.toFixed(1)}`)
    console.log(`  - Night Shift Distribution: ${stats.nightDistribution}`)
    console.log(`  - Weekend Coverage: ${stats.weekendCoverage}%`)
    console.log(`  - Fairness Score: ${stats.fairnessScore}/100`)
    
    return assignments
  }
  
  /**
   * Calculate schedule statistics
   */
  private calculateStatistics(
    assignments: ScheduleAssignment[],
    employees: ScheduleEmployee[]
  ) {
    let totalShifts = 0
    let nightShifts = 0
    let weekendShifts = 0
    let weekendDays = 0
    
    // Count shifts
    for (const assignment of assignments) {
      totalShifts += assignment.employees.length
      
      if (assignment.shift_type === 'night') {
        nightShifts += assignment.employees.length
      }
      
      const date = new Date(assignment.date)
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendShifts += assignment.employees.length
        weekendDays++
      }
    }
    
    // Calculate fairness (standard deviation of workload)
    const workloads = Array.from(this.workloadMap.values())
    const avgWorkload = workloads.reduce((sum, w) => sum + w.totalShifts, 0) / workloads.length
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w.totalShifts - avgWorkload, 2), 0) / workloads.length
    const stdDev = Math.sqrt(variance)
    const fairnessScore = Math.max(0, 100 - (stdDev * 10))
    
    return {
      avgShifts: totalShifts / employees.length,
      nightDistribution: `${nightShifts}/${totalShifts}`,
      weekendCoverage: weekendDays > 0 ? Math.round((weekendShifts / (weekendDays * 3)) * 100) : 0,
      fairnessScore: Math.round(fairnessScore)
    }
  }
}

export default SimpleScheduler
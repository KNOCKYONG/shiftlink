/**
 * Scheduler Service Adapter
 * Integrates the core scheduling engine from lib/scheduler into the web application
 */

// Import scheduler components from the main lib directory
// Note: These imports use relative paths to access the lib/scheduler directory
import type { ScheduleEngine as ScheduleEngineType } from '../../lib/scheduler/schedule-engine'
import type { 
  CoreSchedulingEngine as CoreEngineType,
  Employee as CoreEmployee,
  Assignment as CoreAssignment,
  SchedulingRules,
  CoverageRequirement
} from '../../lib/scheduler/core-scheduling-engine'
import type { 
  NursingPatternAnalyzer as PatternAnalyzerType,
  PatternAnalysis 
} from '../../lib/scheduler/nursing-pattern-analyzer'
import type { 
  FairnessAnalyzer as FairnessAnalyzerType,
  FairnessMetrics 
} from '../../lib/scheduler/fairness-analyzer'

// Types for web application compatibility
export interface WebEmployee {
  id: string
  name: string
  level: string // 'lv1', 'lv2', etc.
  level_title?: string
  team: string
  team_id?: string
  tenant_id?: string
  preferences?: any[]
  constraints?: any[]
}

export interface WebShiftTemplate {
  id: string
  name: string
  type: 'day' | 'evening' | 'night' | 'off'
  start_time: string
  end_time: string
  required_count: number
}

export interface WebCoverageRequirement {
  date: string
  shift_type: 'day' | 'evening' | 'night'
  level_requirements: {
    level: string
    count: number
  }[]
}

export interface WebScheduleRequest {
  start_date: string
  end_date: string
  team_ids: string[]
  coverage_requirements: WebCoverageRequirement[]
  generation_options?: {
    enforce_fairness?: boolean
    enforce_mentorship_pairing?: boolean
    prioritize_preferences?: boolean
  }
}

export interface WebScheduleAssignment {
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off' | 'leave'
  employees: WebEmployee[]
}

export class SchedulerService {
  private scheduleEngine: ScheduleEngine | null = null
  private coreEngine: CoreSchedulingEngine
  private patternAnalyzer: NursingPatternAnalyzer
  private fairnessAnalyzer: FairnessAnalyzer

  constructor(tenantId?: string) {
    // Initialize with tenant ID if available
    if (tenantId) {
      this.scheduleEngine = new ScheduleEngine(tenantId)
    }
    
    // Initialize analyzers
    this.coreEngine = new CoreSchedulingEngine()
    this.patternAnalyzer = new NursingPatternAnalyzer()
    this.fairnessAnalyzer = new FairnessAnalyzer()
  }

  /**
   * Generate schedule using the core scheduling engine
   */
  async generateSchedule(
    request: WebScheduleRequest,
    employees: WebEmployee[]
  ): Promise<WebScheduleAssignment[]> {
    console.log('🚀 Starting schedule generation with real scheduler')
    
    // Convert web format to engine format
    const engineEmployees = this.convertToEngineEmployees(employees)
    const shiftTemplates = this.createShiftTemplates(request)
    const rules = this.getDefaultSchedulingRules()
    
    // Use the schedule engine if available (with database integration)
    if (this.scheduleEngine) {
      try {
        const generatedAssignments = await this.scheduleEngine.generateSchedule(
          request.start_date,
          request.end_date,
          engineEmployees as any,
          shiftTemplates as any,
          rules as any
        )
        
        return this.convertToWebAssignments(generatedAssignments, employees)
      } catch (error) {
        console.warn('Schedule engine failed, falling back to core engine:', error)
      }
    }
    
    // Fallback to core engine (without database)
    return this.generateWithCoreEngine(request, employees)
  }

  /**
   * Generate schedule using core engine (without database dependencies)
   */
  private async generateWithCoreEngine(
    request: WebScheduleRequest,
    employees: WebEmployee[]
  ): Promise<WebScheduleAssignment[]> {
    const assignments: WebScheduleAssignment[] = []
    const startDate = new Date(request.start_date)
    const endDate = new Date(request.end_date)
    
    // Generate for each day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const dayRequirements = request.coverage_requirements.filter(req => req.date === dateStr)
      
      for (const requirement of dayRequirements) {
        const shiftAssignment = await this.assignShiftWithEngine(
          dateStr,
          requirement,
          employees,
          assignments,
          request.generation_options
        )
        
        if (shiftAssignment) {
          assignments.push(shiftAssignment)
        }
      }
    }
    
    // Apply fairness optimization
    return this.optimizeForFairness(assignments, employees)
  }

  /**
   * Assign employees to a shift using the scheduling engine logic
   */
  private async assignShiftWithEngine(
    date: string,
    requirement: WebCoverageRequirement,
    employees: WebEmployee[],
    previousAssignments: WebScheduleAssignment[],
    options?: any
  ): Promise<WebScheduleAssignment | null> {
    const assignedEmployees: WebEmployee[] = []
    
    // Group employees by level
    const employeesByLevel = this.groupEmployeesByLevel(employees)
    
    // Apply level requirements with smart scheduling
    for (const levelReq of requirement.level_requirements) {
      const levelEmployees = employeesByLevel[levelReq.level] || []
      
      // Score employees based on multiple factors
      const scoredEmployees = await this.scoreEmployees(
        levelEmployees,
        date,
        requirement.shift_type,
        previousAssignments,
        options
      )
      
      // Select best candidates
      const selected = scoredEmployees
        .sort((a, b) => b.score - a.score)
        .slice(0, levelReq.count)
        .map(se => se.employee)
      
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
   * Score employees for shift assignment
   */
  private async scoreEmployees(
    employees: WebEmployee[],
    date: string,
    shiftType: string,
    previousAssignments: WebScheduleAssignment[],
    options?: any
  ): Promise<{ employee: WebEmployee; score: number }[]> {
    const scoredEmployees = []
    
    for (const employee of employees) {
      let score = 100 // Base score
      
      // Check if already assigned on this date
      const alreadyAssigned = previousAssignments.some(
        a => a.date === date && a.employees.some(e => e.id === employee.id)
      )
      if (alreadyAssigned) {
        score = -1000 // Cannot assign
        scoredEmployees.push({ employee, score })
        continue
      }
      
      // Analyze pattern safety (using NursingPatternAnalyzer)
      const recentPattern = this.getRecentPattern(employee.id, date, previousAssignments)
      const patternAnalysis = this.patternAnalyzer.analyzePattern(recentPattern)
      
      // Apply pattern safety scoring
      if (shiftType === 'night' && patternAnalysis.consecutive_nights >= 2) {
        score -= 50 // Avoid consecutive nights
      }
      
      if (patternAnalysis.fatigue_risk === 'high') {
        score -= 30
      }
      
      // Apply fairness scoring
      const workloadStats = this.calculateWorkloadStats(employee.id, previousAssignments)
      if (workloadStats.total_shifts > this.getAverageShifts(employees, previousAssignments)) {
        score -= 20 // Already has more shifts than average
      }
      
      // Prefer balanced distribution
      if (shiftType === 'night' && workloadStats.night_shifts > 3) {
        score -= 25
      }
      
      // Add randomness for variety (5% variation)
      score += Math.random() * 5
      
      scoredEmployees.push({ employee, score })
    }
    
    return scoredEmployees
  }

  /**
   * Get recent work pattern for an employee
   */
  private getRecentPattern(
    employeeId: string,
    currentDate: string,
    assignments: WebScheduleAssignment[]
  ): string[] {
    const pattern: string[] = []
    const date = new Date(currentDate)
    
    // Look back 7 days
    for (let i = 6; i >= 0; i--) {
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
   * Calculate workload statistics for an employee
   */
  private calculateWorkloadStats(
    employeeId: string,
    assignments: WebScheduleAssignment[]
  ): any {
    let stats = {
      total_shifts: 0,
      night_shifts: 0,
      weekend_shifts: 0,
      day_shifts: 0,
      evening_shifts: 0
    }
    
    for (const assignment of assignments) {
      if (assignment.employees.some(e => e.id === employeeId)) {
        stats.total_shifts++
        
        if (assignment.shift_type === 'night') {
          stats.night_shifts++
        } else if (assignment.shift_type === 'day') {
          stats.day_shifts++
        } else if (assignment.shift_type === 'evening') {
          stats.evening_shifts++
        }
        
        const date = new Date(assignment.date)
        if (date.getDay() === 0 || date.getDay() === 6) {
          stats.weekend_shifts++
        }
      }
    }
    
    return stats
  }

  /**
   * Get average number of shifts across all employees
   */
  private getAverageShifts(
    employees: WebEmployee[],
    assignments: WebScheduleAssignment[]
  ): number {
    let totalShifts = 0
    
    for (const employee of employees) {
      const stats = this.calculateWorkloadStats(employee.id, assignments)
      totalShifts += stats.total_shifts
    }
    
    return totalShifts / employees.length
  }

  /**
   * Optimize assignments for fairness
   */
  private optimizeForFairness(
    assignments: WebScheduleAssignment[],
    employees: WebEmployee[]
  ): WebScheduleAssignment[] {
    // Calculate fairness metrics
    const fairnessMetrics = this.fairnessAnalyzer.analyzeFairness(
      assignments as any,
      employees as any
    )
    
    console.log('📊 Fairness Score:', fairnessMetrics.overall_fairness_score)
    
    // Apply optimizations if needed
    if (fairnessMetrics.overall_fairness_score < 80) {
      // Implement swap optimization logic here
      console.log('⚠️ Fairness score below threshold, optimization needed')
    }
    
    return assignments
  }

  /**
   * Group employees by level
   */
  private groupEmployeesByLevel(employees: WebEmployee[]): Record<string, WebEmployee[]> {
    const grouped: Record<string, WebEmployee[]> = {}
    
    for (const employee of employees) {
      if (!grouped[employee.level]) {
        grouped[employee.level] = []
      }
      grouped[employee.level].push(employee)
    }
    
    return grouped
  }

  /**
   * Convert web employees to engine format
   */
  private convertToEngineEmployees(employees: WebEmployee[]): any[] {
    return employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: 'employee',
      tenant_id: emp.tenant_id || 'default',
      team_id: emp.team_id,
      level: parseInt(emp.level.replace('lv', '')) || 1,
      is_active: true,
      employee_code: emp.id,
      preferences: emp.preferences,
      constraints: emp.constraints
    }))
  }

  /**
   * Create shift templates from coverage requirements
   */
  private createShiftTemplates(request: WebScheduleRequest): any[] {
    const templates = []
    const shiftTypes = ['day', 'evening', 'night']
    const shiftTimes = {
      day: { start: '07:00', end: '15:00' },
      evening: { start: '15:00', end: '23:00' },
      night: { start: '23:00', end: '07:00' }
    }
    
    for (const shiftType of shiftTypes) {
      // Find max required count across all dates
      let maxRequired = 0
      for (const req of request.coverage_requirements) {
        if (req.shift_type === shiftType) {
          const totalRequired = req.level_requirements.reduce((sum, lr) => sum + lr.count, 0)
          maxRequired = Math.max(maxRequired, totalRequired)
        }
      }
      
      if (maxRequired > 0) {
        templates.push({
          id: shiftType,
          name: shiftType.charAt(0).toUpperCase() + shiftType.slice(1),
          type: shiftType,
          start_time: shiftTimes[shiftType].start,
          end_time: shiftTimes[shiftType].end,
          required_count: maxRequired,
          tenant_id: 'default'
        })
      }
    }
    
    return templates
  }

  /**
   * Get default scheduling rules
   */
  private getDefaultSchedulingRules(): any[] {
    return [
      {
        id: 'min_rest',
        tenant_id: 'default',
        rule_name: 'Minimum Rest Hours',
        rule_type: 'min_rest_hours',
        rule_value: 11,
        is_active: true
      },
      {
        id: 'max_weekly',
        tenant_id: 'default',
        rule_name: 'Maximum Weekly Hours',
        rule_type: 'max_weekly_hours',
        rule_value: 52,
        is_active: true
      },
      {
        id: 'max_nights',
        tenant_id: 'default',
        rule_name: 'Maximum Consecutive Nights',
        rule_type: 'max_consecutive_nights',
        rule_value: 3,
        is_active: true
      }
    ]
  }

  /**
   * Convert engine assignments to web format
   */
  private convertToWebAssignments(
    engineAssignments: any[],
    employees: WebEmployee[]
  ): WebScheduleAssignment[] {
    const webAssignments: WebScheduleAssignment[] = []
    const assignmentsByDateShift: Map<string, WebEmployee[]> = new Map()
    
    // Group assignments by date and shift
    for (const assignment of engineAssignments) {
      const key = `${assignment.date}_${assignment.shift_template_id}`
      const employee = employees.find(e => e.id === assignment.employee_id)
      
      if (employee) {
        if (!assignmentsByDateShift.has(key)) {
          assignmentsByDateShift.set(key, [])
        }
        assignmentsByDateShift.get(key)!.push(employee)
      }
    }
    
    // Convert to web format
    assignmentsByDateShift.forEach((employees, key) => {
      const [date, shiftType] = key.split('_')
      webAssignments.push({
        date,
        shift_type: shiftType as any,
        employees
      })
    })
    
    return webAssignments
  }
}

export default SchedulerService
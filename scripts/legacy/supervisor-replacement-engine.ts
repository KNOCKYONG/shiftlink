import { supabase } from '@/lib/supabase/client'

export interface SupervisorReplacementRule {
  id: string
  rule_name: string
  trigger_conditions: {
    min_subordinates_present: number
    required_skill_coverage: string[]
    max_supervisor_absence_hours: number
    emergency_scenarios: string[]
  }
  replacement_logic: {
    priority_factors: {
      same_level_experience: number
      cross_training: number
      availability: number
      recent_performance: number
    }
    fallback_hierarchy: string[]
  }
  is_active: boolean
}

export interface ReplacementCandidate {
  employee_id: string
  employee_name: string
  current_position: string
  hierarchy_level: number
  experience_years: number
  replacement_score: number
  replacement_type: 'same_level_senior' | 'upper_level_available' | 'cross_trained_lower_level' | 'external_float_pool'
  availability_status: 'available' | 'partial' | 'unavailable'
  qualification_match: number
  recent_performance_score: number
  cross_training_certifications: string[]
  current_workload: number
  fatigue_level: number
  availability_conflicts: string[]
}

export interface SupervisorReplacementRequest {
  original_supervisor_id: string
  absence_start_date: string
  absence_end_date: string
  absence_reason: 'planned_leave' | 'emergency' | 'sick_leave' | 'training' | 'other'
  affected_shifts: Array<{
    date: string
    shift_type: 'day' | 'evening' | 'night'
    team_id: string
    required_supervision_level: number
  }>
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  special_requirements?: string[]
}

export interface ReplacementPlan {
  request_id: string
  replacement_assignments: Array<{
    shift_date: string
    shift_type: string
    replacement_employee_id: string
    replacement_type: string
    confidence_score: number
    backup_options: string[]
  }>
  coverage_analysis: {
    full_coverage_percentage: number
    partial_coverage_shifts: number
    uncovered_shifts: number
    skill_coverage_gaps: string[]
  }
  implementation_steps: string[]
  approval_required: boolean
  estimated_cost_impact: number
  notifications_required: Array<{
    recipient_id: string
    notification_type: string
    message: string
  }>
}

export class SupervisorReplacementEngine {
  private tenantId: string
  private replacementRules: SupervisorReplacementRule[] = []

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async initialize() {
    await this.loadReplacementRules()
  }

  private async loadReplacementRules() {
    try {
      const { data, error } = await supabase
        .from('supervisor_replacement_rules')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .eq('is_active', true)

      if (error) throw error
      this.replacementRules = data || []
    } catch (error) {
      console.error('Failed to load replacement rules:', error)
      throw new Error('상급자 대체 규칙을 불러올 수 없습니다')
    }
  }

  async generateReplacementPlan(request: SupervisorReplacementRequest): Promise<ReplacementPlan> {
    // 1. 대체 후보자 식별
    const candidates = await this.identifyReplacementCandidates(request)
    
    // 2. 각 교대별 최적 대체자 선정
    const replacementAssignments = await this.selectOptimalReplacements(request, candidates)
    
    // 3. 커버리지 분석
    const coverageAnalysis = this.analyzeCoverage(request, replacementAssignments)
    
    // 4. 구현 단계 생성
    const implementationSteps = this.generateImplementationSteps(request, replacementAssignments)
    
    // 5. 승인 필요 여부 판단
    const approvalRequired = this.determineApprovalRequirement(request, replacementAssignments)
    
    // 6. 비용 영향 추정
    const costImpact = this.estimateCostImpact(request, replacementAssignments)
    
    // 7. 알림 대상 식별
    const notifications = await this.generateNotifications(request, replacementAssignments)

    return {
      request_id: this.generateRequestId(),
      replacement_assignments: replacementAssignments,
      coverage_analysis: coverageAnalysis,
      implementation_steps: implementationSteps,
      approval_required: approvalRequired,
      estimated_cost_impact: costImpact,
      notifications_required: notifications
    }
  }

  private async identifyReplacementCandidates(
    request: SupervisorReplacementRequest
  ): Promise<ReplacementCandidate[]> {
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        position,
        hierarchy_level,
        experience_years,
        team_id,
        certifications,
        cross_training_records,
        performance_scores,
        current_workload
      `)
      .eq('tenant_id', this.tenantId)
      .eq('is_active', true)
      .neq('id', request.original_supervisor_id)

    if (error || !employees) {
      throw new Error('대체 후보자를 조회할 수 없습니다')
    }

    const candidates: ReplacementCandidate[] = []

    for (const employee of employees) {
      // 각 직원에 대해 대체 가능성 평가
      const candidate = await this.evaluateReplacementCandidate(employee, request)
      if (candidate.replacement_score > 0.3) { // 최소 30% 이상의 점수
        candidates.push(candidate)
      }
    }

    // 점수 순으로 정렬
    return candidates.sort((a, b) => b.replacement_score - a.replacement_score)
  }

  private async evaluateReplacementCandidate(
    employee: any,
    request: SupervisorReplacementRequest
  ): Promise<ReplacementCandidate> {
    const originalSupervisor = await this.getEmployeeInfo(request.original_supervisor_id)
    
    // 대체 유형 결정
    const replacementType = this.determineReplacementType(employee, originalSupervisor)
    
    // 가용성 확인
    const availabilityStatus = await this.checkAvailability(employee.id, request.affected_shifts)
    
    // 자격 매칭 점수
    const qualificationMatch = this.calculateQualificationMatch(employee, originalSupervisor)
    
    // 교차 훈련 자격증
    const crossTrainingCerts = employee.cross_training_records?.certifications || []
    
    // 현재 업무량
    const currentWorkload = employee.current_workload || 1.0
    
    // 피로도 계산
    const fatigueLevel = await this.calculateFatigueLevel(employee.id)
    
    // 가용성 충돌 사항
    const availabilityConflicts = await this.getAvailabilityConflicts(employee.id, request.affected_shifts)
    
    // 최근 성과 점수
    const recentPerformanceScore = employee.performance_scores?.recent_average || 75
    
    // 종합 대체 점수 계산
    const replacementScore = this.calculateReplacementScore(
      employee,
      originalSupervisor,
      replacementType,
      availabilityStatus,
      qualificationMatch,
      recentPerformanceScore,
      currentWorkload,
      fatigueLevel
    )

    return {
      employee_id: employee.id,
      employee_name: employee.name,
      current_position: employee.position,
      hierarchy_level: employee.hierarchy_level,
      experience_years: employee.experience_years,
      replacement_score: replacementScore,
      replacement_type: replacementType,
      availability_status: availabilityStatus,
      qualification_match: qualificationMatch,
      recent_performance_score: recentPerformanceScore,
      cross_training_certifications: crossTrainingCerts,
      current_workload: currentWorkload,
      fatigue_level: fatigueLevel,
      availability_conflicts: availabilityConflicts
    }
  }

  private determineReplacementType(
    candidate: any,
    originalSupervisor: any
  ): ReplacementCandidate['replacement_type'] {
    if (candidate.hierarchy_level === originalSupervisor.hierarchy_level) {
      return candidate.experience_years >= originalSupervisor.experience_years 
        ? 'same_level_senior' 
        : 'same_level_senior'
    } else if (candidate.hierarchy_level < originalSupervisor.hierarchy_level) {
      return 'upper_level_available'
    } else if (candidate.cross_training_records?.supervisor_qualified) {
      return 'cross_trained_lower_level'
    } else {
      return 'external_float_pool'
    }
  }

  private async checkAvailability(
    employeeId: string,
    affectedShifts: SupervisorReplacementRequest['affected_shifts']
  ): Promise<'available' | 'partial' | 'unavailable'> {
    // 기존 스케줄과 충돌 확인
    const conflicts = await this.getScheduleConflicts(employeeId, affectedShifts)
    
    if (conflicts.length === 0) return 'available'
    if (conflicts.length < affectedShifts.length / 2) return 'partial'
    return 'unavailable'
  }

  private calculateQualificationMatch(candidate: any, supervisor: any): number {
    let matchScore = 0
    const totalQualifications = supervisor.required_qualifications?.length || 1
    
    // 기본 자격 요건 비교
    if (candidate.certifications && supervisor.required_qualifications) {
      const matchingCerts = candidate.certifications.filter((cert: string) =>
        supervisor.required_qualifications.includes(cert)
      ).length
      
      matchScore = matchingCerts / totalQualifications
    }
    
    // 경력 고려
    const experienceRatio = Math.min(1, candidate.experience_years / supervisor.experience_years)
    
    return Math.round((matchScore * 0.7 + experienceRatio * 0.3) * 100)
  }

  private calculateReplacementScore(
    candidate: any,
    supervisor: any,
    replacementType: string,
    availabilityStatus: string,
    qualificationMatch: number,
    performanceScore: number,
    workload: number,
    fatigueLevel: number
  ): number {
    const rule = this.replacementRules[0] // 첫 번째 규칙 사용 (실제로는 적절한 규칙 선택)
    if (!rule) return 0

    const factors = rule.replacement_logic.priority_factors
    let score = 0

    // 같은 레벨 경험 (40%)
    const sameLevel = replacementType === 'same_level_senior' ? 1 : 
                     replacementType === 'upper_level_available' ? 0.8 : 0.6
    score += sameLevel * factors.same_level_experience * 40

    // 교차 훈련 (30%)
    const crossTraining = qualificationMatch / 100
    score += crossTraining * factors.cross_training * 30

    // 가용성 (20%)
    const availability = availabilityStatus === 'available' ? 1 : 
                        availabilityStatus === 'partial' ? 0.5 : 0
    score += availability * factors.availability * 20

    // 최근 성과 (10%)
    const performance = Math.min(1, performanceScore / 100)
    score += performance * factors.recent_performance * 10

    // 업무량 및 피로도 보정
    if (workload > 1.2) score *= 0.8 // 업무량 과다시 감점
    if (fatigueLevel > 7) score *= 0.7 // 고피로도시 감점

    return Math.max(0, Math.min(100, score)) / 100 // 0-1 범위로 정규화
  }

  private async selectOptimalReplacements(
    request: SupervisorReplacementRequest,
    candidates: ReplacementCandidate[]
  ) {
    const assignments = []

    for (const shift of request.affected_shifts) {
      // 해당 교대에 가장 적합한 후보자 선정
      const availableCandidates = candidates.filter(c => 
        c.availability_status !== 'unavailable' &&
        !this.hasConflict(c, shift)
      )

      if (availableCandidates.length > 0) {
        const bestCandidate = availableCandidates[0]
        const backupOptions = availableCandidates.slice(1, 3).map(c => c.employee_id)

        assignments.push({
          shift_date: shift.date,
          shift_type: shift.shift_type,
          replacement_employee_id: bestCandidate.employee_id,
          replacement_type: bestCandidate.replacement_type,
          confidence_score: bestCandidate.replacement_score,
          backup_options: backupOptions
        })

        // 선택된 후보자의 가용성 업데이트 (중복 배정 방지)
        this.markCandidateAsAssigned(candidates, bestCandidate.employee_id, shift)
      } else {
        // 대체자를 찾을 수 없는 경우
        assignments.push({
          shift_date: shift.date,
          shift_type: shift.shift_type,
          replacement_employee_id: '',
          replacement_type: 'external_float_pool',
          confidence_score: 0,
          backup_options: []
        })
      }
    }

    return assignments
  }

  private analyzeCoverage(
    request: SupervisorReplacementRequest,
    assignments: any[]
  ) {
    const totalShifts = request.affected_shifts.length
    const coveredShifts = assignments.filter(a => a.replacement_employee_id !== '').length
    const fullCoverageShifts = assignments.filter(a => a.confidence_score >= 0.7).length
    const partialCoverageShifts = assignments.filter(a => 
      a.confidence_score >= 0.4 && a.confidence_score < 0.7
    ).length
    const uncoveredShifts = assignments.filter(a => a.replacement_employee_id === '').length

    return {
      full_coverage_percentage: Math.round((fullCoverageShifts / totalShifts) * 100),
      partial_coverage_shifts: partialCoverageShifts,
      uncovered_shifts: uncoveredShifts,
      skill_coverage_gaps: this.identifySkillGaps(assignments)
    }
  }

  // 헬퍼 메서드들
  private async getEmployeeInfo(employeeId: string) {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()
    return data
  }

  private async calculateFatigueLevel(employeeId: string): Promise<number> {
    // 최근 근무 이력 기반 피로도 계산
    return Math.floor(Math.random() * 10) // 임시 구현
  }

  private async getAvailabilityConflicts(employeeId: string, shifts: any[]): Promise<string[]> {
    // 기존 일정과의 충돌 확인
    return []
  }

  private async getScheduleConflicts(employeeId: string, shifts: any[]) {
    // 스케줄 충돌 확인
    return []
  }

  private hasConflict(candidate: ReplacementCandidate, shift: any): boolean {
    return candidate.availability_conflicts.some(conflict => 
      conflict.includes(shift.date) || conflict.includes(shift.shift_type)
    )
  }

  private markCandidateAsAssigned(candidates: ReplacementCandidate[], employeeId: string, shift: any) {
    const candidate = candidates.find(c => c.employee_id === employeeId)
    if (candidate) {
      candidate.availability_conflicts.push(`${shift.date}_${shift.shift_type}`)
    }
  }

  private identifySkillGaps(assignments: any[]): string[] {
    // 스킬 커버리지 갭 식별
    return []
  }

  private generateImplementationSteps(request: SupervisorReplacementRequest, assignments: any[]): string[] {
    const steps = []
    
    steps.push('1. 대체 직원들에게 배정 통보')
    steps.push('2. 필요시 추가 교육/브리핑 실시')
    steps.push('3. 관련 부서 및 팀원들에게 변경사항 공지')
    steps.push('4. 업무 인수인계 진행')
    steps.push('5. 응급 연락망 업데이트')
    
    if (assignments.some(a => a.confidence_score < 0.7)) {
      steps.push('6. 추가 지원 인력 대기 배치')
    }
    
    return steps
  }

  private determineApprovalRequirement(request: SupervisorReplacementRequest, assignments: any[]): boolean {
    // 긴급상황이 아니고, 상급자 레벨 교체가 필요한 경우 승인 필요
    return request.urgency_level !== 'critical' && 
           assignments.some(a => a.replacement_type === 'upper_level_available')
  }

  private estimateCostImpact(request: SupervisorReplacementRequest, assignments: any[]): number {
    // 대체 근무에 따른 비용 영향 추정 (초과근무비, 대체인력비 등)
    let totalCost = 0
    
    assignments.forEach(assignment => {
      if (assignment.replacement_type === 'external_float_pool') {
        totalCost += 150000 // 외부 대체인력 비용
      } else if (assignment.replacement_type === 'upper_level_available') {
        totalCost += 50000 // 상급자 대체 추가비용
      }
    })
    
    return totalCost
  }

  private async generateNotifications(request: SupervisorReplacementRequest, assignments: any[]) {
    const notifications = []
    
    // 대체 직원들에게 알림
    for (const assignment of assignments) {
      if (assignment.replacement_employee_id) {
        notifications.push({
          recipient_id: assignment.replacement_employee_id,
          notification_type: 'supervisor_replacement_assignment',
          message: `${assignment.shift_date} ${assignment.shift_type} 교대 감독 대체 근무가 배정되었습니다.`
        })
      }
    }
    
    // 팀원들에게 알림
    const { data: teamMembers } = await supabase
      .from('employees')
      .select('id')
      .in('team_id', request.affected_shifts.map(s => s.team_id))
    
    if (teamMembers) {
      teamMembers.forEach(member => {
        notifications.push({
          recipient_id: member.id,
          notification_type: 'supervisor_change_notice',
          message: '팀 감독자 변경 사항이 있습니다. 새로운 감독자와 업무를 조율해주세요.'
        })
      })
    }
    
    return notifications
  }

  private generateRequestId(): string {
    return `SRR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
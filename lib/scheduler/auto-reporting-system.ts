// 스케줄 확정 시 자동 리포팅 시스템
import { createClient } from '@/lib/supabase/server'
import { ScheduleExplanationEngine, ScheduleExplanation } from './schedule-explanation-engine'
import { FairnessAnalyzer, FairnessMetrics, TeamFairnessAnalysis } from './fairness-analyzer'
import { NursingPatternAnalyzer } from './nursing-pattern-analyzer'

export interface ScheduleReportingConfig {
  generate_individual_reports: boolean
  generate_team_reports: boolean
  send_email_notifications: boolean
  send_app_notifications: boolean
  save_audit_trail: boolean
  notify_on_fairness_issues: boolean
}

export interface ReportGeneration {
  schedule_id: string
  generation_date: string
  total_employees: number
  reports_generated: {
    individual_reports: number
    team_reports: number
    safety_reports: number
  }
  notifications_sent: {
    emails_sent: number
    app_notifications_sent: number
    failed_notifications: number
  }
  fairness_alerts: {
    critical_issues: number
    high_priority_issues: number
    affected_employees: string[]
  }
  processing_time_ms: number
  status: 'completed' | 'partial' | 'failed'
  error_details?: string[]
}

export class AutoReportingSystem {
  private supabase: any
  private explanationEngine: ScheduleExplanationEngine
  private fairnessAnalyzer: FairnessAnalyzer
  private nursingAnalyzer: NursingPatternAnalyzer

  constructor() {
    this.supabase = createClient()
    this.explanationEngine = new ScheduleExplanationEngine()
    this.fairnessAnalyzer = new FairnessAnalyzer()
    this.nursingAnalyzer = new NursingPatternAnalyzer()
  }

  /**
   * 스케줄 확정 시 자동 리포팅 메인 함수
   */
  async triggerScheduleReporting(
    scheduleId: string,
    tenantId: string,
    config: ScheduleReportingConfig = this.getDefaultConfig()
  ): Promise<ReportGeneration> {
    const startTime = Date.now()
    console.log(`🚀 Auto-reporting triggered for schedule ${scheduleId}`)

    const reportGeneration: ReportGeneration = {
      schedule_id: scheduleId,
      generation_date: new Date().toISOString(),
      total_employees: 0,
      reports_generated: { individual_reports: 0, team_reports: 0, safety_reports: 0 },
      notifications_sent: { emails_sent: 0, app_notifications_sent: 0, failed_notifications: 0 },
      fairness_alerts: { critical_issues: 0, high_priority_issues: 0, affected_employees: [] },
      processing_time_ms: 0,
      status: 'completed'
    }

    try {
      // 1. 스케줄 데이터 로드
      const scheduleData = await this.loadScheduleData(scheduleId, tenantId)
      reportGeneration.total_employees = scheduleData.employees.length

      // 2. 배정 근거 데이터 저장
      if (config.save_audit_trail) {
        await this.saveAssignmentReasons(scheduleId, scheduleData)
        console.log('✅ Assignment audit trail saved')
      }

      // 3. 개인별 리포트 생성
      const individualReports: ScheduleExplanation[] = []
      if (config.generate_individual_reports) {
        const reports = await this.generateIndividualReports(scheduleData)
        individualReports.push(...reports)
        reportGeneration.reports_generated.individual_reports = reports.length
        console.log(`✅ Generated ${reports.length} individual reports`)
      }

      // 4. 팀별 공정성 리포트 생성
      let teamAnalysis: TeamFairnessAnalysis | null = null
      if (config.generate_team_reports) {
        teamAnalysis = await this.generateTeamFairnessReport(scheduleData)
        reportGeneration.reports_generated.team_reports = 1
        console.log('✅ Generated team fairness report')
      }

      // 5. 안전성 분석 리포트
      const safetyReport = await this.generateSafetyReport(scheduleData)
      reportGeneration.reports_generated.safety_reports = 1
      console.log('✅ Generated safety analysis report')

      // 6. 공정성 문제 알림 체크
      if (config.notify_on_fairness_issues && teamAnalysis) {
        const alerts = this.checkFairnessAlerts(teamAnalysis)
        reportGeneration.fairness_alerts = alerts
        console.log(`⚠️ Found ${alerts.critical_issues} critical fairness issues`)
      }

      // 7. 알림 발송
      if (config.send_email_notifications) {
        const emailResults = await this.sendEmailNotifications(individualReports, teamAnalysis, safetyReport)
        reportGeneration.notifications_sent.emails_sent = emailResults.success_count
        reportGeneration.notifications_sent.failed_notifications += emailResults.failed_count
        console.log(`📧 Sent ${emailResults.success_count} emails`)
      }

      if (config.send_app_notifications) {
        const appResults = await this.sendAppNotifications(individualReports, reportGeneration.fairness_alerts)
        reportGeneration.notifications_sent.app_notifications_sent = appResults.success_count
        reportGeneration.notifications_sent.failed_notifications += appResults.failed_count
        console.log(`📱 Sent ${appResults.success_count} app notifications`)
      }

      // 8. 리포트 결과 저장
      await this.saveReportingResults(reportGeneration)

      reportGeneration.processing_time_ms = Date.now() - startTime
      reportGeneration.status = 'completed'

      console.log(`🎉 Auto-reporting completed in ${reportGeneration.processing_time_ms}ms`)

    } catch (error) {
      console.error('❌ Auto-reporting failed:', error)
      reportGeneration.status = 'failed'
      reportGeneration.error_details = [error instanceof Error ? error.message : String(error)]
      reportGeneration.processing_time_ms = Date.now() - startTime
    }

    return reportGeneration
  }

  /**
   * 스케줄 데이터 로드
   */
  private async loadScheduleData(scheduleId: string, tenantId: string): Promise<any> {
    const { data: schedule, error: scheduleError } = await this.supabase
      .from('schedules')
      .select(`
        *,
        schedule_assignments(
          *,
          employees(id, name, level),
          shift_templates(id, name, type, start_time, end_time)
        )
      `)
      .eq('id', scheduleId)
      .single()

    if (scheduleError) {
      throw new Error(`Failed to load schedule: ${scheduleError.message}`)
    }

    // 직원별 배정 데이터 그룹화
    const employeesMap = new Map()
    
    schedule.schedule_assignments.forEach((assignment: any) => {
      const employeeId = assignment.employee_id
      if (!employeesMap.has(employeeId)) {
        employeesMap.set(employeeId, {
          employee_id: employeeId,
          employee_name: assignment.employees.name,
          employee_level: assignment.employees.level,
          assignments: []
        })
      }
      
      employeesMap.get(employeeId).assignments.push({
        date: assignment.date,
        shift_type: assignment.shift_templates?.type || 'off',
        shift_name: assignment.shift_templates?.name || 'OFF',
        start_time: assignment.shift_templates?.start_time || '00:00',
        end_time: assignment.shift_templates?.end_time || '00:00',
        is_overtime: assignment.is_overtime || false,
        confidence_score: assignment.confidence_score || 0,
        // 여기에 배정 근거 데이터 추가 (나중에 구현)
        assignment_reasons: []
      })
    })

    return {
      schedule: schedule,
      employees: Array.from(employeesMap.values()),
      tenant_id: tenantId,
      period: `${new Date(schedule.start_date).getFullYear()}-${(new Date(schedule.start_date).getMonth() + 1).toString().padStart(2, '0')}`
    }
  }

  /**
   * 개인별 리포트 생성
   */
  private async generateIndividualReports(scheduleData: any): Promise<ScheduleExplanation[]> {
    const reports: ScheduleExplanation[] = []
    
    // 팀 평균 계산
    const teamAverages = this.calculateTeamAverages(scheduleData.employees)
    
    for (const employee of scheduleData.employees) {
      try {
        // 공정성 메트릭 계산
        const fairnessMetrics = this.fairnessAnalyzer.analyzeEmployeeFairness(
          { id: employee.employee_id, name: employee.employee_name },
          employee.assignments.map((a: any) => ({
            date: a.date,
            shift_type: a.shift_type,
            leave_type: a.leave_type,
            is_preferred: a.is_preferred // 이후 선호도 데이터와 연동
          })),
          teamAverages
        )
        
        // 개인별 설명 리포트 생성
        const explanation = this.explanationEngine.generatePersonalExplanation(
          { 
            id: employee.employee_id, 
            name: employee.employee_name, 
            level: employee.employee_level 
          },
          employee.assignments.map((a: any) => ({
            date: a.date,
            shift_type: a.shift_type,
            assignment_reasons: a.assignment_reasons || [
              {
                category: 'fairness',
                score: fairnessMetrics.fairness_scores.overall_fairness,
                explanation: '팀 전체 공정성을 고려한 배정'
              }
            ]
          })),
          fairnessMetrics,
          teamAverages
        )
        
        reports.push(explanation)
        
      } catch (error) {
        console.error(`Failed to generate report for ${employee.employee_name}:`, error)
      }
    }
    
    return reports
  }

  /**
   * 팀 공정성 리포트 생성
   */
  private async generateTeamFairnessReport(scheduleData: any): Promise<TeamFairnessAnalysis> {
    const teamAverages = this.calculateTeamAverages(scheduleData.employees)
    
    const employeeMetrics = scheduleData.employees.map((emp: any) => 
      this.fairnessAnalyzer.analyzeEmployeeFairness(
        { id: emp.employee_id, name: emp.employee_name },
        emp.assignments.map((a: any) => ({
          date: a.date,
          shift_type: a.shift_type,
          leave_type: a.leave_type,
          is_preferred: a.is_preferred
        })),
        teamAverages
      )
    )
    
    return this.fairnessAnalyzer.analyzeTeamFairness(employeeMetrics)
  }

  /**
   * 안전성 분석 리포트 생성
   */
  private async generateSafetyReport(scheduleData: any): Promise<any> {
    const safetyAnalyses = scheduleData.employees.map((emp: any) => {
      const assignments = emp.assignments.map((a: any) => ({
        date: a.date,
        shift_type: a.shift_type,
        leave_type: a.leave_type
      }))
      
      return this.nursingAnalyzer.analyzeEmployeePattern(
        emp.employee_id,
        emp.employee_name,
        assignments
      )
    })
    
    const teamSummary = this.nursingAnalyzer.analyzeTeamPatterns(safetyAnalyses)
    
    return {
      individual_analyses: safetyAnalyses,
      team_summary: teamSummary,
      generation_date: new Date().toISOString()
    }
  }

  /**
   * 공정성 알림 체크
   */
  private checkFairnessAlerts(teamAnalysis: TeamFairnessAnalysis): any {
    const criticalIssues = teamAnalysis.problem_areas.filter(p => p.severity === 'critical').length
    const highPriorityIssues = teamAnalysis.problem_areas.filter(p => p.severity === 'high').length
    
    const affectedEmployees = teamAnalysis.problem_areas
      .flatMap(p => p.affected_employees)
      .filter((emp, index, arr) => arr.indexOf(emp) === index) // 중복 제거
    
    return {
      critical_issues: criticalIssues,
      high_priority_issues: highPriorityIssues,
      affected_employees: affectedEmployees
    }
  }

  /**
   * 이메일 알림 발송
   */
  private async sendEmailNotifications(
    individualReports: ScheduleExplanation[],
    teamAnalysis: TeamFairnessAnalysis | null,
    safetyReport: any
  ): Promise<{ success_count: number, failed_count: number }> {
    let successCount = 0
    let failedCount = 0
    
    // 개인별 스케줄 설명서 이메일 발송
    for (const report of individualReports) {
      try {
        await this.sendIndividualReportEmail(report)
        successCount++
      } catch (error) {
        console.error(`Failed to send email to ${report.employee_name}:`, error)
        failedCount++
      }
    }
    
    // 관리자에게 팀 리포트 발송
    if (teamAnalysis) {
      try {
        await this.sendTeamReportEmail(teamAnalysis, safetyReport)
        successCount++
      } catch (error) {
        console.error('Failed to send team report email:', error)
        failedCount++
      }
    }
    
    return { success_count: successCount, failed_count: failedCount }
  }

  /**
   * 앱 내 알림 발송
   */
  private async sendAppNotifications(
    individualReports: ScheduleExplanation[],
    fairnessAlerts: any
  ): Promise<{ success_count: number, failed_count: number }> {
    let successCount = 0
    let failedCount = 0
    
    // 개인별 스케줄 확정 알림
    for (const report of individualReports) {
      try {
        await this.sendAppNotification(
          report.employee_id,
          '새로운 스케줄이 확정되었습니다',
          `${report.main_message.summary} 자세한 내용은 앱에서 확인하세요.`,
          'schedule_confirmed'
        )
        successCount++
      } catch (error) {
        console.error(`Failed to send app notification to ${report.employee_name}:`, error)
        failedCount++
      }
    }
    
    // 공정성 문제 긴급 알림
    if (fairnessAlerts.critical_issues > 0) {
      for (const employeeName of fairnessAlerts.affected_employees) {
        try {
          await this.sendAppNotification(
            '', // employee_id를 찾아야 함
            '스케줄 조정 안내',
            '공정성 개선을 위해 다음 스케줄에서 조정이 예정되어 있습니다.',
            'fairness_adjustment'
          )
          successCount++
        } catch (error) {
          failedCount++
        }
      }
    }
    
    return { success_count: successCount, failed_count: failedCount }
  }

  /**
   * 배정 근거 데이터 저장 (스케줄링 엔진에서 생성된 데이터 활용)
   */
  private async saveAssignmentReasons(scheduleId: string, scheduleData: any): Promise<void> {
    const assignmentRecords = []
    
    for (const employee of scheduleData.employees) {
      for (const assignment of employee.assignments) {
        // 스케줄링 엔진에서 생성된 실제 근거 데이터 사용
        const assignmentReasons = assignment.assignment_reasons || [
          {
            category: 'optimization',
            priority: 5,
            score: assignment.confidence_score || 70,
            explanation: '종합적인 최적화 결과 배정되었습니다',
            details: { 
              confidence_score: assignment.confidence_score || 70,
              shift_type: assignment.shift_type
            }
          }
        ]

        // 공정성 분석 기반 근거 추가
        const teamAverages = this.calculateTeamAverages(scheduleData.employees)
        const fairnessMetrics = this.fairnessAnalyzer.analyzeEmployeeFairness(
          { id: employee.employee_id, name: employee.employee_name },
          employee.assignments.map((a: any) => ({
            date: a.date,
            shift_type: a.shift_type,
            leave_type: a.leave_type,
            is_preferred: a.is_preferred
          })),
          teamAverages
        )

        if (fairnessMetrics.fairness_scores.overall_fairness < 60) {
          assignmentReasons.unshift({
            category: 'fairness',
            priority: 9,
            score: fairnessMetrics.fairness_scores.overall_fairness,
            explanation: '공정성 개선을 위해 우선적으로 배정되었습니다',
            details: {
              current_fairness: fairnessMetrics.fairness_scores.overall_fairness,
              night_shift_ratio: fairnessMetrics.workload_comparison.night_shift_ratio,
              weekend_ratio: fairnessMetrics.workload_comparison.weekend_ratio
            }
          })
        }

        // 안전성 분석 기반 근거 추가
        const safetyAnalysis = this.nursingAnalyzer.analyzeEmployeePattern(
          employee.employee_id,
          employee.employee_name,
          employee.assignments.map((a: any) => ({
            date: a.date,
            shift_type: a.shift_type,
            leave_type: a.leave_type
          }))
        )

        if (safetyAnalysis.risk_score > 30) {
          assignmentReasons.push({
            category: 'pattern_safety',
            priority: 8,
            score: Math.max(0, 100 - safetyAnalysis.risk_score),
            explanation: '안전한 근무 패턴 유지를 위해 조정되었습니다',
            details: {
              risk_score: safetyAnalysis.risk_score,
              detected_patterns: safetyAnalysis.detected_patterns,
              consecutive_days: safetyAnalysis.consecutive_work_days
            }
          })
        }

        const auditRecord = {
          schedule_id: scheduleId,
          employee_id: employee.employee_id,
          date: assignment.date,
          shift_type: assignment.shift_type,
          assignment_reasons: JSON.stringify(assignmentReasons),
          confidence_score: assignment.confidence_score || 0.7,
          alternative_options: JSON.stringify(assignment.alternative_options || []),
          scoring_breakdown: JSON.stringify({
            preference_score: assignment.preference_score || 50,
            fairness_score: fairnessMetrics.fairness_scores.overall_fairness,
            safety_score: Math.max(0, 100 - safetyAnalysis.risk_score),
            coverage_score: assignment.coverage_score || 50,
            constraint_score: assignment.constraint_score || 50,
            weighted_total: assignment.confidence_score * 100 || 70,
            weights: {
              preference: 0.25,
              fairness: 0.30,
              safety: 0.25,
              coverage: 0.15,
              constraint: 0.05
            }
          }),
          constraints_applied: JSON.stringify(assignment.constraints_applied || []),
          rules_checked: JSON.stringify(assignment.rules_checked || []),
          pattern_analysis: JSON.stringify({
            consecutive_days: safetyAnalysis.consecutive_work_days,
            consecutive_nights: safetyAnalysis.consecutive_night_shifts,
            pattern_safety_score: Math.max(0, 100 - safetyAnalysis.risk_score),
            detected_risks: safetyAnalysis.detected_patterns.map((p: any) => ({
              risk_type: p.pattern_name,
              severity: p.risk_level,
              description: p.description
            })),
            recovery_recommendations: safetyAnalysis.recommendations
          }),
          safety_score: Math.max(0, 1.0 - (safetyAnalysis.risk_score / 100)),
          fairness_context: JSON.stringify({
            employee_fairness_score: fairnessMetrics.fairness_scores.overall_fairness,
            team_average_comparison: {
              night_shifts_vs_avg: fairnessMetrics.workload_comparison.night_shift_ratio - (teamAverages.avg_night_shifts || 0),
              weekend_shifts_vs_avg: fairnessMetrics.workload_comparison.weekend_ratio - (teamAverages.avg_weekend_shifts || 0),
              preferred_shifts_vs_avg: fairnessMetrics.workload_comparison.preferred_ratio - (teamAverages.avg_preferred_ratio || 0)
            },
            gini_coefficient_impact: fairnessMetrics.fairness_scores.gini_contribution || 0,
            equity_justification: this.generateEquityJustification(fairnessMetrics, assignment.shift_type)
          }),
          team_balance_impact: JSON.stringify({
            level_distribution_before: {},
            level_distribution_after: {},
            experience_balance_score: 70, // 기본값
            shift_coverage_impact: {
              coverage_before: 0,
              coverage_after: 1,
              improvement: 1
            },
            team_stability_impact: 5
          }),
          decision_timestamp: new Date().toISOString(),
          engine_version: '1.0.0',
          created_by: assignment.created_by
        }

        assignmentRecords.push(auditRecord)
      }
    }
    
    // 배치 삽입으로 성능 최적화
    if (assignmentRecords.length > 0) {
      const { error } = await this.supabase
        .from('assignment_audit_trail')
        .insert(assignmentRecords)
      
      if (error) {
        throw new Error(`Failed to save assignment audit trail: ${error.message}`)
      }

      console.log(`✅ Saved ${assignmentRecords.length} assignment audit records`)
    }
  }

  /**
   * 공정성 근거 설명 생성
   */
  private generateEquityJustification(metrics: any, shiftType: string): string {
    if (metrics.fairness_scores.overall_fairness >= 80) {
      return '현재 높은 공정성 수준을 유지하고 있어 배정에 제약이 적습니다'
    } else if (shiftType === 'night' && metrics.workload_comparison.night_shift_ratio < 0.3) {
      return '야간근무 횟수가 팀 평균 이하로 공정성 개선을 위해 배정되었습니다'
    } else if (shiftType === 'off' && metrics.fairness_scores.overall_fairness < 50) {
      return '과도한 근무부담을 완화하기 위해 휴무로 배정되었습니다'
    }
    return '팀 전체 공정성 밸런스를 고려하여 배정되었습니다'
  }

  /**
   * 리포팅 결과 저장
   */
  private async saveReportingResults(reportGeneration: ReportGeneration): Promise<void> {
    const { error } = await this.supabase
      .from('schedule_reporting_logs')
      .insert({
        schedule_id: reportGeneration.schedule_id,
        generation_date: reportGeneration.generation_date,
        total_employees: reportGeneration.total_employees,
        reports_generated: reportGeneration.reports_generated,
        notifications_sent: reportGeneration.notifications_sent,
        fairness_alerts: reportGeneration.fairness_alerts,
        processing_time_ms: reportGeneration.processing_time_ms,
        status: reportGeneration.status,
        error_details: reportGeneration.error_details
      })
    
    if (error) {
      console.error('Failed to save reporting results:', error)
    }
  }

  /**
   * 개인별 리포트 이메일 발송 (구현 필요)
   */
  private async sendIndividualReportEmail(report: ScheduleExplanation): Promise<void> {
    // 이메일 발송 로직 구현
    // Resend나 다른 이메일 서비스 활용
    console.log(`📧 Sending individual report email to ${report.employee_name}`)
  }

  /**
   * 팀 리포트 이메일 발송 (구현 필요)
   */
  private async sendTeamReportEmail(teamAnalysis: TeamFairnessAnalysis, safetyReport: any): Promise<void> {
    // 관리자용 팀 리포트 이메일 발송
    console.log('📧 Sending team report email to managers')
  }

  /**
   * 앱 내 알림 발송 (구현 필요)
   */
  private async sendAppNotification(
    employeeId: string,
    title: string,
    message: string,
    type: string
  ): Promise<void> {
    // 앱 내 알림 발송 로직
    console.log(`📱 Sending app notification: ${title}`)
  }

  /**
   * 팀 평균 계산
   */
  private calculateTeamAverages(employees: any[]): any {
    const totalEmployees = employees.length
    if (totalEmployees === 0) return { avg_night_shifts: 0, avg_weekend_shifts: 0, avg_work_hours: 0, avg_preferred_ratio: 0 }
    
    const totals = employees.reduce((acc, emp) => {
      const workDays = emp.assignments.filter((a: any) => a.shift_type !== 'off' && !a.leave_type)
      const nightShifts = workDays.filter((a: any) => a.shift_type === 'night').length
      const weekendShifts = emp.assignments.filter((a: any) => {
        const date = new Date(a.date)
        const dayOfWeek = date.getDay()
        return (dayOfWeek === 0 || dayOfWeek === 6) && a.shift_type !== 'off'
      }).length
      const preferredShifts = workDays.filter((a: any) => a.is_preferred === true).length
      
      return {
        night_shifts: acc.night_shifts + nightShifts,
        weekend_shifts: acc.weekend_shifts + weekendShifts,
        work_hours: acc.work_hours + workDays.length * 8,
        preferred_shifts: acc.preferred_shifts + preferredShifts,
        total_work_days: acc.total_work_days + workDays.length
      }
    }, { night_shifts: 0, weekend_shifts: 0, work_hours: 0, preferred_shifts: 0, total_work_days: 0 })
    
    return {
      avg_night_shifts: totals.night_shifts / totalEmployees,
      avg_weekend_shifts: totals.weekend_shifts / totalEmployees,
      avg_work_hours: totals.work_hours / totalEmployees,
      avg_preferred_ratio: totals.total_work_days > 0 ? totals.preferred_shifts / totals.total_work_days : 0
    }
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultConfig(): ScheduleReportingConfig {
    return {
      generate_individual_reports: true,
      generate_team_reports: true,
      send_email_notifications: true,
      send_app_notifications: true,
      save_audit_trail: true,
      notify_on_fairness_issues: true
    }
  }
}

/**
 * 스케줄 확정 버튼 클릭 시 호출되는 함수
 */
export async function triggerScheduleConfirmation(
  scheduleId: string,
  tenantId: string,
  config?: Partial<ScheduleReportingConfig>
): Promise<ReportGeneration> {
  const reportingSystem = new AutoReportingSystem()
  
  const fullConfig: ScheduleReportingConfig = {
    ...reportingSystem['getDefaultConfig'](), // private 메소드 접근
    ...config
  }
  
  return await reportingSystem.triggerScheduleReporting(scheduleId, tenantId, fullConfig)
}
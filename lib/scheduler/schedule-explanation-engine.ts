// 개인별 스케줄 설명 리포트 생성 엔진
export interface ScheduleExplanation {
  employee_id: string
  employee_name: string
  schedule_period: string
  generation_date: string
  
  // 메인 메시지
  main_message: {
    title: string
    summary: string // "이번 달 김○○님만을 위한 맞춤 스케줄입니다"
    tone: 'positive' | 'neutral' | 'apologetic' // 감정 톤 조절
  }
  
  // 배정 근거 설명
  assignment_reasons: {
    date: string
    shift_type: string
    korean_label: string // "데이", "나이트" 등
    
    reasons: {
      category: 'preference' | 'health' | 'fairness' | 'team_balance' | 'safety' | 'request'
      explanation: string
      importance: 'primary' | 'secondary' | 'supporting'
      user_friendly_text: string
    }[]
    
    alternative_explanation?: string // "다른 선택지는 왜 없었는지"
  }[]
  
  // 개인별 공정성 리포트
  fairness_report: {
    your_stats: {
      night_shifts: number
      weekend_shifts: number
      preferred_shifts_ratio: number
      consecutive_work_avg: number
    }
    team_comparison: {
      night_shifts_vs_avg: string // "+2회 (평균보다 약간 많음)"
      weekend_shifts_vs_avg: string
      overall_fairness_level: string // "매우 공정함", "약간 불리함" 등
    }
    next_month_outlook: string // "다음 달에는 나이트 근무를 줄여드릴 예정입니다"
  }
  
  // 건강 및 안전 고려사항
  health_considerations: {
    safety_score: number // 0-100
    avoided_risks: string[] // "연속 3교대 패턴을 피했습니다"
    recovery_time: string // "충분한 휴식 시간을 확보했습니다"
    recommendations: string[] // "개인 건강 권장사항"
  }
  
  // 감사 및 격려 메시지
  appreciation_message: {
    acknowledgment: string // "항상 성실하게 근무해 주셔서 감사합니다"
    contribution: string // "팀 전체의 균형을 위해 중요한 역할을 해주셨습니다"
    encouragement: string // "다음 달도 함께 화이팅해요!"
  }
  
  // 이의제기 또는 교환 안내
  feedback_options: {
    trade_suggestions: string[] // 교환 가능한 날짜들
    feedback_contact: string
    deadline: string // 교환 요청 마감일
  }
}

export class ScheduleExplanationEngine {
  
  /**
   * 개인별 스케줄 설명 생성
   */
  generatePersonalExplanation(
    employee: { id: string, name: string, preferences?: any },
    assignments: Array<{
      date: string
      shift_type: string
      assignment_reasons: Array<{
        category: string
        score: number
        explanation: string
      }>
      alternative_options?: Array<{
        shift_type: string
        score: number
        reason_not_selected: string
      }>
    }>,
    fairnessMetrics: any,
    teamStats: any
  ): ScheduleExplanation {
    
    const mainMessage = this.generateMainMessage(employee, assignments, fairnessMetrics)
    const assignmentReasons = this.generateAssignmentReasons(assignments, employee)
    const fairnessReport = this.generateFairnessReport(fairnessMetrics, teamStats, employee.name)
    const healthConsiderations = this.generateHealthConsiderations(assignments, employee)
    const appreciationMessage = this.generateAppreciationMessage(employee, fairnessMetrics)
    const feedbackOptions = this.generateFeedbackOptions(assignments)
    
    return {
      employee_id: employee.id,
      employee_name: employee.name,
      schedule_period: new Date().toISOString().substring(0, 7),
      generation_date: new Date().toISOString(),
      main_message: mainMessage,
      assignment_reasons: assignmentReasons,
      fairness_report: fairnessReport,
      health_considerations: healthConsiderations,
      appreciation_message: appreciationMessage,
      feedback_options: feedbackOptions
    }
  }
  
  /**
   * 메인 메시지 생성 - 감정적 배려가 들어간 톤으로
   */
  private generateMainMessage(
    employee: any, 
    assignments: any[], 
    fairnessMetrics: any
  ): { title: string, summary: string, tone: 'positive' | 'neutral' | 'apologetic' } {
    
    const nightShifts = assignments.filter(a => a.shift_type === 'night').length
    const preferredRatio = assignments.filter(a => a.assignment_reasons.some(r => r.category === 'preference')).length / assignments.length
    
    let tone: 'positive' | 'neutral' | 'apologetic' = 'positive'
    const title = `${employee.name}님을 위한 3월 스케줄`
    let summary = ''
    
    if (preferredRatio >= 0.7) {
      // 선호도가 많이 반영된 경우
      tone = 'positive'
      summary = `이번 달은 ${employee.name}님의 선호사항이 ${Math.round(preferredRatio * 100)}% 반영된 맞춤 스케줄입니다. 😊`
    } else if (nightShifts >= 8) {
      // 나이트가 많은 경우
      tone = 'apologetic'
      summary = `이번 달은 나이트 근무가 다소 많지만, 다음 달에는 균형을 맞춰드릴 예정입니다. 항상 고생 많으십니다.`
    } else if (fairnessMetrics?.fairness_scores?.overall_fairness >= 80) {
      // 공정성이 높은 경우
      tone = 'positive'
      summary = `팀 전체의 균형을 고려하여 공정하게 배정된 스케줄입니다. 함께 만들어가는 좋은 팀워크에 감사드려요! 💪`
    } else {
      tone = 'neutral'
      summary = `${employee.name}님의 상황과 팀 전체의 균형을 모두 고려한 스케줄입니다.`
    }
    
    return { title, summary, tone }
  }
  
  /**
   * 배정 근거 설명 생성 - 사용자 친화적 언어로
   */
  private generateAssignmentReasons(assignments: any[], employee: any): any[] {
    return assignments.map(assignment => {
      const koreanLabels = {
        'day': '데이',
        'evening': '이브닝', 
        'night': '나이트',
        'off': '휴무'
      }
      
      const reasons = assignment.assignment_reasons.map((reason: any) => {
        const userFriendlyTexts = this.convertToUserFriendlyText(reason, employee.name, assignment.date)
        
        return {
          category: reason.category,
          explanation: reason.explanation,
          importance: reason.score > 30 ? 'primary' : reason.score > 15 ? 'secondary' : 'supporting',
          user_friendly_text: userFriendlyTexts
        }
      }).sort((a: any, b: any) => {
        const importanceOrder = { 'primary': 3, 'secondary': 2, 'supporting': 1 }
        return importanceOrder[b.importance] - importanceOrder[a.importance]
      })
      
      // 대안 설명 생성
      const alternativeExplanation = assignment.alternative_options 
        ? this.generateAlternativeExplanation(assignment.alternative_options, assignment.date)
        : undefined
      
      return {
        date: assignment.date,
        shift_type: assignment.shift_type,
        korean_label: koreanLabels[assignment.shift_type as keyof typeof koreanLabels] || assignment.shift_type,
        reasons,
        alternative_explanation: alternativeExplanation
      }
    })
  }
  
  /**
   * 개발자 언어를 사용자 친화적 언어로 변환
   */
  private convertToUserFriendlyText(reason: any, employeeName: string, date: string): string {
    const dateObj = new Date(date)
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const dayName = dayNames[dateObj.getDay()]
    const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${dayName}`
    
    switch (reason.category) {
      case 'preference':
        if (reason.score >= 35) {
          return `✨ ${employeeName}님이 원하시는 시간대라서 우선 배정해드렸습니다`
        } else {
          return `${employeeName}님의 선호사항을 고려했습니다`
        }
        
      case 'health':
        if (reason.explanation.includes('consecutive')) {
          return `💚 연속 근무로 인한 피로를 방지하기 위해 충분한 휴식을 제공했습니다`
        } else if (reason.explanation.includes('night')) {
          return `🌙 나이트 근무 후 건강한 회복을 위해 배려했습니다`
        } else {
          return `건강과 안전을 위해 신중하게 고려했습니다`
        }
        
      case 'fairness':
        if (reason.score >= 20) {
          return `⚖️ 팀 전체의 공정한 근무 분배를 위해 ${employeeName}님의 차례였습니다`
        } else {
          return `팀 내 공정성을 고려하여 배정했습니다`
        }
        
      case 'team_balance':
        return `🤝 팀 전체의 균형잡힌 운영을 위해 ${employeeName}님의 도움이 필요했습니다`
        
      case 'safety':
        if (reason.explanation.includes('triple')) {
          return `🚨 위험한 3교대 연속 패턴을 피하기 위해 안전하게 배정했습니다`
        } else if (reason.explanation.includes('consecutive nights')) {
          return `⚠️ 연속 나이트 근무를 제한하여 안전을 보장했습니다`
        } else {
          return `안전한 근무 패턴을 위해 신중하게 배정했습니다`
        }
        
      case 'request':
        return `📝 ${employeeName}님의 사전 요청사항을 반영했습니다`
        
      default:
        return reason.explanation
    }
  }
  
  /**
   * 대안 선택지 설명 생성
   */
  private generateAlternativeExplanation(alternatives: any[], date: string): string {
    if (alternatives.length === 0) return ''
    
    const dateObj = new Date(date)
    const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`
    
    const reasons = alternatives.map(alt => {
      const shiftLabel = {
        'day': '데이', 'evening': '이브닝', 'night': '나이트', 'off': '휴무'
      }[alt.shift_type] || alt.shift_type
      
      if (alt.reason_not_selected.includes('health')) {
        return `${shiftLabel} 근무는 건강상의 이유로 적합하지 않았습니다`
      } else if (alt.reason_not_selected.includes('fairness')) {
        return `${shiftLabel} 근무는 팀 내 공정성을 위해 다른 분께 기회를 드렸습니다`
      } else if (alt.reason_not_selected.includes('safety')) {
        return `${shiftLabel} 근무는 안전한 패턴을 위해 피했습니다`
      } else {
        return `${shiftLabel} 근무보다 현재 배정이 더 적합했습니다`
      }
    })
    
    return `${dateStr}에 다른 선택지도 있었지만, ${reasons.join(', ')} 따라서 현재의 배정이 최선의 선택이었습니다.`
  }
  
  /**
   * 공정성 리포트 생성
   */
  private generateFairnessReport(fairnessMetrics: any, teamStats: any, employeeName: string): any {
    const yourStats = {
      night_shifts: fairnessMetrics?.burden_distribution?.night_shifts_count || 0,
      weekend_shifts: fairnessMetrics?.burden_distribution?.weekend_shifts_count || 0,
      preferred_shifts_ratio: Math.round((fairnessMetrics?.opportunity_distribution?.preferred_shifts_count || 0) / (fairnessMetrics?.burden_distribution?.total_work_hours / 8 || 1) * 100),
      consecutive_work_avg: fairnessMetrics?.burden_distribution?.consecutive_work_days_avg || 0
    }
    
    const nightDiff = yourStats.night_shifts - (teamStats?.avg_night_shifts || 0)
    const weekendDiff = yourStats.weekend_shifts - (teamStats?.avg_weekend_shifts || 0)
    
    const teamComparison = {
      night_shifts_vs_avg: this.generateComparisonText(nightDiff, '나이트 근무'),
      weekend_shifts_vs_avg: this.generateComparisonText(weekendDiff, '주말 근무'),
      overall_fairness_level: this.getFairnessLevelText(fairnessMetrics?.fairness_scores?.overall_fairness || 50)
    }
    
    const nextMonthOutlook = this.generateNextMonthOutlook(nightDiff, weekendDiff, employeeName)
    
    return {
      your_stats: yourStats,
      team_comparison: teamComparison,
      next_month_outlook: nextMonthOutlook
    }
  }
  
  /**
   * 비교 텍스트 생성
   */
  private generateComparisonText(diff: number, shiftType: string): string {
    if (Math.abs(diff) <= 1) {
      return `평균과 동일 (매우 공정함) ✅`
    } else if (diff > 1) {
      return `평균보다 ${diff}회 많음 (다음 달 조정 예정) ⚖️`
    } else {
      return `평균보다 ${Math.abs(diff)}회 적음 (다음 달 더 많이 배정 예정) 📈`
    }
  }
  
  /**
   * 공정성 레벨 텍스트
   */
  private getFairnessLevelText(score: number): string {
    if (score >= 90) return '매우 공정함 🌟'
    if (score >= 80) return '공정함 ✅'
    if (score >= 60) return '보통 수준 📊'
    if (score >= 40) return '약간 불리함 (개선 예정) ⚖️'
    return '많이 불리함 (긴급 조정 필요) 🚨'
  }
  
  /**
   * 다음 달 전망 생성
   */
  private generateNextMonthOutlook(nightDiff: number, weekendDiff: number, employeeName: string): string {
    if (nightDiff > 2) {
      return `다음 달에는 ${employeeName}님의 나이트 근무를 ${Math.ceil(nightDiff / 2)}회 정도 줄여서 균형을 맞춰드릴 예정입니다. 🌅`
    } else if (nightDiff < -2) {
      return `이번 달 나이트 근무가 적었으니, 다음 달에는 조금 더 배정될 수 있습니다. 미리 양해 부탁드려요! 🙏`
    } else if (weekendDiff > 2) {
      return `다음 달에는 주말 휴무를 더 많이 드릴 수 있도록 노력하겠습니다. 😊`
    } else {
      return `현재 매우 균형잡힌 상태입니다. 다음 달에도 이런 좋은 밸런스를 유지해 나가겠습니다! 💪`
    }
  }
  
  /**
   * 건강 고려사항 생성
   */
  private generateHealthConsiderations(assignments: any[], employee: any): any {
    const safetyScore = this.calculateSafetyScore(assignments)
    const avoidedRisks = this.identifyAvoidedRisks(assignments)
    const recoveryTime = this.analyzeRecoveryTime(assignments)
    const recommendations = this.generateHealthRecommendations(assignments, employee)
    
    return {
      safety_score: safetyScore,
      avoided_risks: avoidedRisks,
      recovery_time: recoveryTime,
      recommendations: recommendations
    }
  }
  
  private calculateSafetyScore(assignments: any[]): number {
    // 간단한 안전도 계산
    const nightShifts = assignments.filter(a => a.shift_type === 'night').length
    const maxConsecutive = this.getMaxConsecutiveWorkDays(assignments)
    
    let score = 100
    if (nightShifts > 8) score -= (nightShifts - 8) * 5
    if (maxConsecutive > 4) score -= (maxConsecutive - 4) * 10
    
    return Math.max(0, score)
  }
  
  private identifyAvoidedRisks(assignments: any[]): string[] {
    const risks = []
    
    // 3교대 연속 패턴 체크
    let hasTripleShift = false
    for (let i = 0; i <= assignments.length - 3; i++) {
      const threeShifts = assignments.slice(i, i + 3).map(a => a.shift_type)
      const uniqueShifts = new Set(threeShifts)
      if (uniqueShifts.size === 3 && uniqueShifts.has('day') && uniqueShifts.has('evening') && uniqueShifts.has('night')) {
        hasTripleShift = true
        break
      }
    }
    
    if (!hasTripleShift) {
      risks.push('🚨 위험한 연속 3교대 패턴을 완전히 피했습니다')
    }
    
    // 연속 나이트 체크
    const maxConsecutiveNights = this.getMaxConsecutiveNights(assignments)
    if (maxConsecutiveNights <= 3) {
      risks.push('🌙 연속 나이트 근무를 안전한 범위로 제한했습니다')
    }
    
    return risks
  }
  
  private analyzeRecoveryTime(assignments: any[]): string {
    const avgRecoveryTime = this.getAverageRecoveryTime(assignments)
    
    if (avgRecoveryTime >= 2) {
      return '😴 충분한 휴식 시간을 확보했습니다 (평균 2일 이상)'
    } else if (avgRecoveryTime >= 1.5) {
      return '😊 적절한 휴식 시간을 제공했습니다'
    } else {
      return '⚠️ 휴식 시간이 다소 부족할 수 있으니 개인 건강관리에 신경써 주세요'
    }
  }
  
  private generateHealthRecommendations(assignments: any[], employee: any): string[] {
    const recommendations = []
    const nightShifts = assignments.filter(a => a.shift_type === 'night').length
    
    if (nightShifts >= 8) {
      recommendations.push('🌙 나이트 근무가 많으니 수면 패턴 관리에 특히 신경써 주세요')
      recommendations.push('💊 비타민 D 섭취와 적절한 운동을 권장합니다')
    }
    
    const maxConsecutive = this.getMaxConsecutiveWorkDays(assignments)
    if (maxConsecutive >= 4) {
      recommendations.push('💪 연속 근무 중에는 충분한 수분 섭취와 짧은 휴식을 취하세요')
    }
    
    recommendations.push('🏥 정기 건강검진을 통해 컨디션을 체크하시기 바랍니다')
    
    return recommendations
  }
  
  /**
   * 감사 및 격려 메시지 생성
   */
  private generateAppreciationMessage(employee: any, fairnessMetrics: any): any {
    const nightShifts = fairnessMetrics?.burden_distribution?.night_shifts_count || 0
    const overallFairness = fairnessMetrics?.fairness_scores?.overall_fairness || 50
    
    const acknowledgment = `${employee.name}님, 항상 성실하게 근무해 주셔서 진심으로 감사드립니다. 🙏`
    let contribution = ''
    let encouragement = '다음 달도 함께 좋은 팀워크로 화이팅해요! 💪✨'
    
    if (nightShifts >= 8) {
      contribution = '이번 달 나이트 근무를 많이 맡아주셔서 팀 전체 운영에 큰 도움이 되었습니다. 정말 고생 많으셨어요. 👏'
      encouragement = '다음 달에는 좀 더 편안한 스케줄로 보답하겠습니다. 건강 관리 잘하세요! 😊'
    } else if (overallFairness >= 80) {
      contribution = '팀 전체의 균형을 위해 언제나 협조해 주시는 모습이 정말 감사합니다. 🤝'
    } else {
      contribution = '팀의 소중한 구성원으로서 중요한 역할을 해주고 계십니다. 💝'
    }
    
    return {
      acknowledgment,
      contribution,
      encouragement
    }
  }
  
  /**
   * 피드백 옵션 생성
   */
  private generateFeedbackOptions(assignments: any[]): any {
    const tradeSuggestions = []
    
    // 교환 가능한 날짜 제안 (간단화)
    const workDays = assignments.filter(a => a.shift_type !== 'off')
    for (const workDay of workDays.slice(0, 3)) { // 첫 3개 근무일만
      if (workDay.shift_type !== 'night') { // 나이트가 아닌 경우만 교환 제안
        const dateObj = new Date(workDay.date)
        const dateStr = `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`
        tradeSuggestions.push(`${dateStr} ${workDay.shift_type === 'day' ? '데이' : '이브닝'} → 다른 시간대 교환 가능`)
      }
    }
    
    return {
      trade_suggestions: tradeSuggestions,
      feedback_contact: '관리자 또는 팀장에게 문의해 주세요',
      deadline: '매월 25일까지 교환 요청 가능합니다'
    }
  }
  
  // 헬퍼 메소드들
  private getMaxConsecutiveWorkDays(assignments: any[]): number {
    let maxConsecutive = 0
    let currentConsecutive = 0
    
    for (const assignment of assignments) {
      if (assignment.shift_type !== 'off') {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 0
      }
    }
    
    return maxConsecutive
  }
  
  private getMaxConsecutiveNights(assignments: any[]): number {
    let maxConsecutive = 0
    let currentConsecutive = 0
    
    for (const assignment of assignments) {
      if (assignment.shift_type === 'night') {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 0
      }
    }
    
    return maxConsecutive
  }
  
  private getAverageRecoveryTime(assignments: any[]): number {
    const restPeriods = []
    let currentRest = 0
    let inRestPeriod = false
    
    for (const assignment of assignments) {
      if (assignment.shift_type === 'off') {
        if (!inRestPeriod) {
          inRestPeriod = true
          currentRest = 1
        } else {
          currentRest++
        }
      } else {
        if (inRestPeriod) {
          restPeriods.push(currentRest)
          inRestPeriod = false
          currentRest = 0
        }
      }
    }
    
    return restPeriods.length > 0 ? restPeriods.reduce((a, b) => a + b, 0) / restPeriods.length : 0
  }
}
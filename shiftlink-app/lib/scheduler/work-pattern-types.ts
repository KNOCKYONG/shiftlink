// 근무 패턴 선호도 타입 정의
export interface WorkPatternPreference {
  id: string
  employee_id: string
  pattern_type: 'short_frequent' | 'long_break' | 'balanced' | 'custom'
  work_intensity: 'high' | 'medium' | 'low'
  rest_preference: 'short_frequent' | 'long_concentrated' | 'flexible'
  
  // 세부 설정
  preferred_consecutive_work_days: number // 연속 근무 선호 일수
  preferred_consecutive_rest_days: number // 연속 휴무 선호 일수
  max_consecutive_work_days: number // 최대 연속 근무 허용 일수
  min_rest_between_cycles: number // 사이클 간 최소 휴식
  
  // 시간대 선호도
  shift_type_preferences: {
    day: number    // 1-10 점수
    evening: number
    night: number
  }
  
  // 요일별 선호도 (1-10)
  weekday_preferences: {
    monday: number
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
    saturday: number
    sunday: number
  }
  
  // 특별 설정
  avoid_friday_night: boolean // 금요일 야간 기피
  prefer_weekend_off: boolean // 주말 휴무 선호
  flexible_schedule: boolean // 스케줄 유연성
  
  created_at: string
  updated_at: string
}

// 미리 정의된 패턴 템플릿
export const WORK_PATTERN_TEMPLATES = {
  // 짧게 일하고 짧게 쉬는 패턴 (고빈도 로테이션)
  short_frequent: {
    name: '짧은 주기 근무',
    description: '2-3일 일하고 1-2일 쉬는 패턴을 선호',
    preferred_consecutive_work_days: 2,
    preferred_consecutive_rest_days: 1,
    max_consecutive_work_days: 3,
    min_rest_between_cycles: 1,
    work_intensity: 'high' as const,
    rest_preference: 'short_frequent' as const,
    weekday_preferences: {
      monday: 8,
      tuesday: 8,
      wednesday: 8,
      thursday: 8,
      friday: 6,
      saturday: 7,
      sunday: 5
    }
  },
  
  // 길게 일하고 길게 쉬는 패턴 (저빈도 로테이션)
  long_break: {
    name: '긴 주기 근무',
    description: '4-5일 연속 일하고 2-3일 연속 쉬는 패턴을 선호',
    preferred_consecutive_work_days: 4,
    preferred_consecutive_rest_days: 3,
    max_consecutive_work_days: 5,
    min_rest_between_cycles: 2,
    work_intensity: 'medium' as const,
    rest_preference: 'long_concentrated' as const,
    weekday_preferences: {
      monday: 9,
      tuesday: 9,
      wednesday: 9,
      thursday: 9,
      friday: 8,
      saturday: 4,
      sunday: 3
    }
  },
  
  // 균형잡힌 패턴
  balanced: {
    name: '균형 근무',
    description: '3일 일하고 1-2일 쉬는 표준 패턴',
    preferred_consecutive_work_days: 3,
    preferred_consecutive_rest_days: 2,
    max_consecutive_work_days: 4,
    min_rest_between_cycles: 1,
    work_intensity: 'medium' as const,
    rest_preference: 'flexible' as const,
    weekday_preferences: {
      monday: 7,
      tuesday: 7,
      wednesday: 7,
      thursday: 7,
      friday: 7,
      saturday: 6,
      sunday: 6
    }
  }
}

// 패턴 호환성 체크
export function checkPatternCompatibility(
  employee1Pattern: WorkPatternPreference,
  employee2Pattern: WorkPatternPreference
): {
  compatible: boolean
  score: number // 0-100
  reasons: string[]
} {
  const reasons: string[] = []
  let score = 50 // 기본 점수
  
  // 근무 주기 호환성
  const workDaysDiff = Math.abs(
    employee1Pattern.preferred_consecutive_work_days - 
    employee2Pattern.preferred_consecutive_work_days
  )
  
  if (workDaysDiff <= 1) {
    score += 20
    reasons.push('비슷한 근무 주기 선호')
  } else if (workDaysDiff >= 3) {
    score -= 15
    reasons.push('근무 주기 선호도 차이 큼')
  }
  
  // 휴식 패턴 호환성
  if (employee1Pattern.rest_preference === employee2Pattern.rest_preference) {
    score += 15
    reasons.push('동일한 휴식 패턴 선호')
  }
  
  // 근무 강도 호환성
  const intensityScore = {
    'high': 3,
    'medium': 2,
    'low': 1
  }
  
  const intensityDiff = Math.abs(
    intensityScore[employee1Pattern.work_intensity] - 
    intensityScore[employee2Pattern.work_intensity]
  )
  
  if (intensityDiff === 0) {
    score += 10
    reasons.push('유사한 근무 강도')
  } else if (intensityDiff === 2) {
    score -= 10
    reasons.push('근무 강도 차이 큼')
  }
  
  return {
    compatible: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    reasons
  }
}

// 스케줄 생성 시 패턴 점수 계산
export function calculatePatternScore(
  employee: any,
  assignment: any,
  recentAssignments: any[],
  pattern: WorkPatternPreference
): number {
  let score = 0
  
  // 연속 근무 일수 체크
  const consecutiveWorkDays = calculateConsecutiveWorkDays(recentAssignments)
  
  if (consecutiveWorkDays < pattern.preferred_consecutive_work_days) {
    // 아직 선호 근무 일수에 못 미침 -> 계속 근무 권장
    score += 30
  } else if (consecutiveWorkDays === pattern.preferred_consecutive_work_days) {
    // 딱 선호 근무 일수 -> 휴식을 고려할 시점
    score += 10
  } else if (consecutiveWorkDays > pattern.max_consecutive_work_days) {
    // 최대 근무 일수 초과 -> 반드시 휴식 필요
    score -= 50
  }
  
  // 요일별 선호도 반영
  const dayOfWeek = new Date(assignment.date).getDay()
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayPreference = pattern.weekday_preferences[weekdays[dayOfWeek] as keyof typeof pattern.weekday_preferences]
  score += (dayPreference - 5) * 5 // -25 to +25 점수
  
  // 시간대 선호도 반영
  const shiftTypePreference = pattern.shift_type_preferences[assignment.shift_type as keyof typeof pattern.shift_type_preferences]
  score += (shiftTypePreference - 5) * 3 // -15 to +15 점수
  
  return Math.max(0, Math.min(100, score))
}

function calculateConsecutiveWorkDays(recentAssignments: any[]): number {
  if (recentAssignments.length === 0) return 0
  
  let consecutive = 0
  const sortedAssignments = recentAssignments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  for (let i = 0; i < sortedAssignments.length; i++) {
    const assignment = sortedAssignments[i]
    if (assignment.shift_type !== 'off') {
      consecutive++
    } else {
      break
    }
  }
  
  return consecutive
}

// 패턴 추천 시스템
export function recommendWorkPattern(
  employeeWorkHistory: any[],
  personalPreferences: any
): {
  recommendedPattern: keyof typeof WORK_PATTERN_TEMPLATES
  confidence: number
  reasons: string[]
} {
  const reasons: string[] = []
  let shortPatternScore = 0
  let longPatternScore = 0
  let balancedScore = 0
  
  // 과거 근무 이력 분석
  const workStreaks = analyzeWorkStreaks(employeeWorkHistory)
  const avgWorkStreak = workStreaks.reduce((sum, streak) => sum + streak, 0) / workStreaks.length || 0
  const avgRestBetween = analyzeRestBetweenWork(employeeWorkHistory)
  
  // 짧은 주기 패턴 점수
  if (avgWorkStreak <= 2.5) {
    shortPatternScore += 30
    reasons.push('과거 짧은 근무 주기 선호 이력')
  }
  
  if (avgRestBetween <= 1.5) {
    shortPatternScore += 20
    reasons.push('짧은 휴식 후 빠른 복귀 패턴')
  }
  
  // 긴 주기 패턴 점수
  if (avgWorkStreak >= 4) {
    longPatternScore += 30
    reasons.push('과거 긴 근무 주기 이력')
  }
  
  if (avgRestBetween >= 2.5) {
    longPatternScore += 20
    reasons.push('충분한 휴식 선호 패턴')
  }
  
  // 개인 선호도 반영
  if (personalPreferences?.energy_level === 'morning') {
    shortPatternScore += 10
    reasons.push('아침형 인간 - 짧은 주기 적합')
  } else if (personalPreferences?.energy_level === 'evening') {
    longPatternScore += 10
    reasons.push('저녁형 인간 - 긴 주기 적합')
  }
  
  // 스트레스 관리 스타일
  if (personalPreferences?.stress_management === 'frequent_breaks') {
    shortPatternScore += 15
  } else if (personalPreferences?.stress_management === 'deep_rest') {
    longPatternScore += 15
  } else {
    balancedScore += 10
  }
  
  // 기본 균형 점수
  balancedScore += 20
  
  // 최고 점수 패턴 선택
  const scores = {
    short_frequent: shortPatternScore,
    long_break: longPatternScore,
    balanced: balancedScore
  }
  
  const maxScore = Math.max(...Object.values(scores))
  const recommendedPattern = Object.entries(scores)
    .find(([, score]) => score === maxScore)?.[0] as keyof typeof WORK_PATTERN_TEMPLATES
  
  const confidence = Math.min(100, maxScore)
  
  return {
    recommendedPattern: recommendedPattern || 'balanced',
    confidence,
    reasons
  }
}

function analyzeWorkStreaks(workHistory: any[]): number[] {
  const streaks: number[] = []
  let currentStreak = 0
  
  workHistory.forEach(day => {
    if (day.shift_type && day.shift_type !== 'off') {
      currentStreak++
    } else {
      if (currentStreak > 0) {
        streaks.push(currentStreak)
        currentStreak = 0
      }
    }
  })
  
  if (currentStreak > 0) {
    streaks.push(currentStreak)
  }
  
  return streaks
}

function analyzeRestBetweenWork(workHistory: any[]): number {
  const restPeriods: number[] = []
  let currentRest = 0
  let inRestPeriod = false
  
  workHistory.forEach(day => {
    if (!day.shift_type || day.shift_type === 'off') {
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
  })
  
  return restPeriods.reduce((sum, period) => sum + period, 0) / restPeriods.length || 0
}
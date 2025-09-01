import type { ShiftType } from '@/types'

// 교대 관련 유틸리티 함수들

/**
 * 교대 유형을 한글로 변환
 */
export function getShiftTypeName(shiftType: ShiftType): string {
  const names: Record<ShiftType, string> = {
    day: '주간',
    evening: '오후', 
    night: '야간',
    off: '휴무'
  }
  return names[shiftType] || shiftType
}

/**
 * 교대 유형별 색상 반환
 */
export function getShiftTypeColor(shiftType: ShiftType, variant: 'bg' | 'text' | 'border' = 'bg'): string {
  const colors = {
    day: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300'
    },
    evening: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700', 
      border: 'border-yellow-300'
    },
    night: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300'
    },
    off: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300'
    }
  }
  
  return colors[shiftType]?.[variant] || colors.off[variant]
}

/**
 * 교대 유형별 아이콘 반환
 */
export function getShiftTypeIcon(shiftType: ShiftType): string {
  const icons: Record<ShiftType, string> = {
    day: '☀️',
    evening: '🌅',
    night: '🌙', 
    off: '😴'
  }
  return icons[shiftType] || '❓'
}

/**
 * 교대 시간대 정보 반환
 */
export function getShiftTimeInfo(shiftType: ShiftType): {
  name: string
  defaultStart: string
  defaultEnd: string
  description: string
} {
  const timeInfo = {
    day: {
      name: '주간',
      defaultStart: '09:00',
      defaultEnd: '18:00',
      description: '오전 9시부터 오후 6시까지'
    },
    evening: {
      name: '오후',
      defaultStart: '14:00', 
      defaultEnd: '23:00',
      description: '오후 2시부터 오후 11시까지'
    },
    night: {
      name: '야간',
      defaultStart: '23:00',
      defaultEnd: '08:00',
      description: '오후 11시부터 오전 8시까지'
    },
    off: {
      name: '휴무',
      defaultStart: '',
      defaultEnd: '',
      description: '휴무일'
    }
  }
  
  return timeInfo[shiftType] || timeInfo.off
}

/**
 * 시간대별 교대 유형 판별
 */
export function determineShiftType(startTime: string): ShiftType {
  const hour = parseInt(startTime.split(':')[0])
  
  if (hour >= 6 && hour < 14) {
    return 'day'
  } else if (hour >= 14 && hour < 22) {
    return 'evening'  
  } else {
    return 'night'
  }
}

/**
 * 교대 간 최소 휴식시간 검증
 */
export function validateRestTime(
  prevShiftEnd: string,
  nextShiftStart: string,
  minRestHours: number = 11
): boolean {
  const prevEnd = new Date(`2000-01-01 ${prevShiftEnd}`)
  let nextStart = new Date(`2000-01-01 ${nextShiftStart}`)
  
  // 다음 시작이 이전 종료보다 이르면 다음 날로 간주
  if (nextStart <= prevEnd) {
    nextStart = new Date(`2000-01-02 ${nextShiftStart}`)
  }
  
  const restHours = (nextStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60)
  return restHours >= minRestHours
}

/**
 * 연속 같은 교대 횟수 계산
 */
export function countConsecutiveShifts(
  shifts: Array<{ date: string; shift_type: ShiftType }>,
  targetShiftType: ShiftType
): number {
  let count = 0
  
  // 날짜 순으로 정렬
  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  
  for (let i = sortedShifts.length - 1; i >= 0; i--) {
    if (sortedShifts[i].shift_type === targetShiftType) {
      count++
    } else {
      break
    }
  }
  
  return count
}

/**
 * 주간 근무시간 계산
 */
export function calculateWeeklyHours(
  shifts: Array<{
    date: string
    shift_type: ShiftType
    start_time?: string
    end_time?: string
  }>
): number {
  return shifts.reduce((total, shift) => {
    if (shift.shift_type === 'off' || !shift.start_time || !shift.end_time) {
      return total
    }
    
    const startHour = parseInt(shift.start_time.split(':')[0])
    const startMin = parseInt(shift.start_time.split(':')[1])
    const endHour = parseInt(shift.end_time.split(':')[0])
    const endMin = parseInt(shift.end_time.split(':')[1])
    
    let hours = endHour - startHour
    const minutes = endMin - startMin
    
    // 야간 교대의 경우 다음 날까지 계산
    if (endHour < startHour) {
      hours += 24
    }
    
    return total + hours + (minutes / 60)
  }, 0)
}

/**
 * 교대 패턴 분석
 */
export function analyzeShiftPattern(
  shifts: Array<{ date: string; shift_type: ShiftType }>
): {
  mostCommon: ShiftType
  distribution: Record<ShiftType, number>
  consecutiveNights: number
  workDays: number
  offDays: number
} {
  const distribution: Record<ShiftType, number> = {
    day: 0,
    evening: 0,
    night: 0,
    off: 0
  }
  
  let consecutiveNights = 0
  let currentNightStreak = 0
  
  shifts.forEach(shift => {
    distribution[shift.shift_type]++
    
    if (shift.shift_type === 'night') {
      currentNightStreak++
      consecutiveNights = Math.max(consecutiveNights, currentNightStreak)
    } else {
      currentNightStreak = 0
    }
  })
  
  const mostCommon = (Object.entries(distribution) as [ShiftType, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0]
  
  const workDays = shifts.length - distribution.off
  const offDays = distribution.off
  
  return {
    mostCommon,
    distribution,
    consecutiveNights,
    workDays,
    offDays
  }
}

/**
 * 교대 호환성 검사
 */
export function areShiftsCompatible(
  shift1: ShiftType,
  shift2: ShiftType,
  allowCrossType: boolean = true
): boolean {
  // 휴무는 항상 호환 가능
  if (shift1 === 'off' || shift2 === 'off') {
    return true
  }
  
  // 같은 교대 유형은 항상 호환
  if (shift1 === shift2) {
    return true
  }
  
  // 다른 교대 유형 간 교환 허용 여부에 따라
  return allowCrossType
}

/**
 * 교대 우선순위 반환 (스케줄링용)
 */
export function getShiftPriority(shiftType: ShiftType): number {
  const priorities: Record<ShiftType, number> = {
    night: 4, // 가장 높은 우선순위 (배정 어려움)
    evening: 3,
    day: 2,
    off: 1    // 가장 낮은 우선순위
  }
  
  return priorities[shiftType] || 1
}

/**
 * 교대 교체 가능성 점수 계산
 */
export function calculateSwapScore(
  requesterShift: ShiftType,
  targetShift: ShiftType,
  requesterLevel: number,
  targetLevel: number,
  sameTeam: boolean = false
): number {
  let score = 50 // 기본 점수
  
  // 같은 교대 유형이면 점수 증가
  if (requesterShift === targetShift) {
    score += 20
  }
  
  // 레벨 차이가 적을수록 점수 증가
  const levelDiff = Math.abs(requesterLevel - targetLevel)
  score += Math.max(0, 10 - levelDiff * 2)
  
  // 같은 팀이면 점수 증가
  if (sameTeam) {
    score += 15
  }
  
  // 야간 교대는 점수 감소 (어려운 시간대)
  if (requesterShift === 'night' || targetShift === 'night') {
    score -= 5
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * 교대별 권장 인원수 계산
 */
export function getRecommendedStaffing(
  shiftType: ShiftType,
  totalStaff: number,
  workloadDistribution?: Record<ShiftType, number>
): number {
  const defaultDistribution: Record<ShiftType, number> = {
    day: 0.4,     // 40%
    evening: 0.35, // 35%
    night: 0.25,   // 25%
    off: 0         // 휴무는 계산하지 않음
  }
  
  const distribution = workloadDistribution || defaultDistribution
  const ratio = distribution[shiftType] || 0
  
  return Math.ceil(totalStaff * ratio)
}

/**
 * 교대 밸런스 검증
 */
export function validateShiftBalance(
  assignments: Array<{ shift_type: ShiftType; employee_level: number }>,
  minStaffPerShift: number = 1
): {
  isBalanced: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // 교대별 인원수 계산
  const shiftCounts: Record<ShiftType, number> = {
    day: 0,
    evening: 0,
    night: 0,
    off: 0
  }
  
  // 교대별 레벨 분포
  const shiftLevels: Record<ShiftType, number[]> = {
    day: [],
    evening: [],
    night: [],
    off: []
  }
  
  assignments.forEach(assignment => {
    shiftCounts[assignment.shift_type]++
    shiftLevels[assignment.shift_type].push(assignment.employee_level)
  })
  
  // 최소 인원 검증
  (['day', 'evening', 'night'] as ShiftType[]).forEach(shift => {
    if (shiftCounts[shift] < minStaffPerShift) {
      issues.push(`${getShiftTypeName(shift)} 근무 인원이 부족합니다 (${shiftCounts[shift]}/${minStaffPerShift})`)
      recommendations.push(`${getShiftTypeName(shift)} 근무에 ${minStaffPerShift - shiftCounts[shift]}명 더 배정하세요`)
    }
  })
  
  // 레벨 밸런스 검증
  (['day', 'evening', 'night'] as ShiftType[]).forEach(shift => {
    const levels = shiftLevels[shift]
    if (levels.length === 0) return
    
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length
    const hasHighLevel = levels.some(level => level >= 4) // 시니어 레벨
    
    if (!hasHighLevel && levels.length > 1) {
      issues.push(`${getShiftTypeName(shift)} 근무에 시니어 직원이 없습니다`)
      recommendations.push(`${getShiftTypeName(shift)} 근무에 시니어 직원을 배정하세요`)
    }
  })
  
  return {
    isBalanced: issues.length === 0,
    issues,
    recommendations
  }
}
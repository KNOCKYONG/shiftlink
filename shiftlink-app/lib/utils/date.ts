// 날짜 관련 유틸리티 함수들

/**
 * 날짜 포맷팅 - 한국어
 */
export function formatDate(date: Date | string, options?: {
  includeTime?: boolean
  includeWeekday?: boolean
  format?: 'short' | 'long' | 'numeric'
}): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const { includeTime = false, includeWeekday = false, format = 'short' } = options || {}
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'numeric' ? '2-digit' : format,
    day: '2-digit'
  }
  
  if (includeWeekday) {
    formatOptions.weekday = format === 'long' ? 'long' : 'short'
  }
  
  if (includeTime) {
    formatOptions.hour = '2-digit'
    formatOptions.minute = '2-digit'
    formatOptions.hour12 = false
  }
  
  return dateObj.toLocaleDateString('ko-KR', formatOptions)
}

/**
 * 시간 포맷팅 - HH:MM 형식
 */
export function formatTime(time: string | Date): string {
  if (typeof time === 'string') {
    // "HH:MM:SS" 또는 "HH:MM" 형식에서 HH:MM 추출
    return time.slice(0, 5)
  }
  
  return time.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * 날짜 범위 생성 (주간)
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay()) // 일요일로 설정
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setDate(start.getDate() + 6) // 토요일로 설정
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * 날짜 범위 생성 (월간)
 */
export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}

/**
 * 날짜 배열 생성
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * 요일 이름 반환
 */
export function getWeekdayName(date: Date | number, short: boolean = true): string {
  const weekdays = short 
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  
  const dayIndex = typeof date === 'number' ? date : date.getDay()
  return weekdays[dayIndex]
}

/**
 * 날짜 차이 계산 (일수)
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 시간 차이 계산 (시간)
 */
export function getHoursDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.round(diffTime / (1000 * 60 * 60))
}

/**
 * 날짜가 오늘인지 확인
 */
export function isToday(date: Date | string): boolean {
  const today = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  return today.toDateString() === targetDate.toDateString()
}

/**
 * 날짜가 이번 주인지 확인
 */
export function isThisWeek(date: Date | string): boolean {
  const { start, end } = getWeekRange()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  return targetDate >= start && targetDate <= end
}

/**
 * 날짜가 이번 달인지 확인
 */
export function isThisMonth(date: Date | string): boolean {
  const today = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  
  return today.getFullYear() === targetDate.getFullYear() &&
         today.getMonth() === targetDate.getMonth()
}

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 */
export function toDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0]
}

/**
 * ISO 문자열을 로컬 날짜로 변환
 */
export function fromISOString(isoString: string): Date {
  return new Date(isoString)
}

/**
 * 날짜 유효성 검사
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * 시간 문자열 유효성 검사 (HH:MM 형식)
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

/**
 * 날짜 범위가 겹치는지 확인
 */
export function isDateRangeOverlapping(
  range1: { start: Date | string; end: Date | string },
  range2: { start: Date | string; end: Date | string }
): boolean {
  const r1Start = typeof range1.start === 'string' ? new Date(range1.start) : range1.start
  const r1End = typeof range1.end === 'string' ? new Date(range1.end) : range1.end
  const r2Start = typeof range2.start === 'string' ? new Date(range2.start) : range2.start
  const r2End = typeof range2.end === 'string' ? new Date(range2.end) : range2.end
  
  return r1Start <= r2End && r2Start <= r1End
}

/**
 * 상대 시간 표시 (예: "2시간 전", "3일 후")
 */
export function getRelativeTime(date: Date | string, now: Date = new Date()): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = targetDate.getTime() - now.getTime()
  const diffSec = Math.floor(Math.abs(diffMs) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  const isPast = diffMs < 0
  const suffix = isPast ? '전' : '후'
  
  if (diffSec < 60) {
    return `방금 ${isPast ? '전' : ''}`
  } else if (diffMin < 60) {
    return `${diffMin}분 ${suffix}`
  } else if (diffHour < 24) {
    return `${diffHour}시간 ${suffix}`
  } else if (diffDay < 7) {
    return `${diffDay}일 ${suffix}`
  } else if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7)
    return `${weeks}주 ${suffix}`
  } else if (diffDay < 365) {
    const months = Math.floor(diffDay / 30)
    return `${months}개월 ${suffix}`
  } else {
    const years = Math.floor(diffDay / 365)
    return `${years}년 ${suffix}`
  }
}

/**
 * 근무일만 필터링 (월~금)
 */
export function getWorkdays(dates: Date[]): Date[] {
  return dates.filter(date => {
    const day = date.getDay()
    return day !== 0 && day !== 6 // 일요일(0), 토요일(6) 제외
  })
}

/**
 * 주말만 필터링 (토~일)
 */
export function getWeekends(dates: Date[]): Date[] {
  return dates.filter(date => {
    const day = date.getDay()
    return day === 0 || day === 6 // 일요일(0), 토요일(6)만
  })
}
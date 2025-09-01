import { createEvents, EventAttributes, DateArray } from 'ics'
import { format, addHours } from 'date-fns'
import type { Schedule, ScheduleAssignment, Employee } from '@/types'

interface CalendarEvent {
  assignment: ScheduleAssignment & {
    employee: Employee
  }
}

export class ScheduleCalendarGenerator {
  private timezone = 'Asia/Seoul'
  
  generateICS(assignments: CalendarEvent[]): string | null {
    const events: EventAttributes[] = assignments.map(({ assignment }) => {
      const startDate = new Date(assignment.shift_date)
      const shiftTimes = this.getShiftTimes(assignment.shift_type)
      
      // Set the actual start and end times
      startDate.setHours(shiftTimes.startHour, 0, 0, 0)
      const endDate = new Date(startDate)
      endDate.setHours(shiftTimes.endHour, 0, 0, 0)
      
      // Handle overnight shifts
      if (shiftTimes.endHour < shiftTimes.startHour) {
        endDate.setDate(endDate.getDate() + 1)
      }
      
      return {
        start: this.dateToArray(startDate),
        end: this.dateToArray(endDate),
        title: `${this.getShiftTitle(assignment.shift_type)} - ${assignment.employee.name}`,
        description: this.generateDescription(assignment),
        location: assignment.employee.team_id || '',
        status: assignment.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
        busyStatus: assignment.shift_type === 'off' ? 'FREE' : 'BUSY',
        categories: ['근무', assignment.shift_type],
        organizer: { name: 'ShiftLink', email: 'noreply@shiftlink.com' },
        attendees: [{
          name: assignment.employee.name,
          email: assignment.employee.email || 'noreply@shiftlink.com',
          rsvp: false,
          partstat: 'ACCEPTED'
        }],
        uid: assignment.id,
        created: this.dateToArray(new Date(assignment.created_at)),
        lastModified: this.dateToArray(new Date(assignment.updated_at || assignment.created_at))
      }
    })
    
    const { error, value } = createEvents(events)
    
    if (error) {
      console.error('Error creating calendar events:', error)
      return null
    }
    
    return value || null
  }
  
  generateGoogleCalendarLink(assignment: ScheduleAssignment & { employee: Employee }): string {
    const startDate = new Date(assignment.shift_date)
    const shiftTimes = this.getShiftTimes(assignment.shift_type)
    
    startDate.setHours(shiftTimes.startHour, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(shiftTimes.endHour, 0, 0, 0)
    
    if (shiftTimes.endHour < shiftTimes.startHour) {
      endDate.setDate(endDate.getDate() + 1)
    }
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${this.getShiftTitle(assignment.shift_type)} - ${assignment.employee.name}`,
      dates: `${format(startDate, "yyyyMMdd'T'HHmmss")}/${format(endDate, "yyyyMMdd'T'HHmmss")}`,
      details: this.generateDescription(assignment),
      location: assignment.employee.team_id || '',
      ctz: this.timezone
    })
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }
  
  generateOutlookLink(assignment: ScheduleAssignment & { employee: Employee }): string {
    const startDate = new Date(assignment.shift_date)
    const shiftTimes = this.getShiftTimes(assignment.shift_type)
    
    startDate.setHours(shiftTimes.startHour, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(shiftTimes.endHour, 0, 0, 0)
    
    if (shiftTimes.endHour < shiftTimes.startHour) {
      endDate.setDate(endDate.getDate() + 1)
    }
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: `${this.getShiftTitle(assignment.shift_type)} - ${assignment.employee.name}`,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      body: this.generateDescription(assignment),
      location: assignment.employee.team_id || ''
    })
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
  }
  
  generateSubscriptionURL(token: string): string {
    // This would be the URL for calendar subscription feed
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftlink.app'
    return `${baseUrl}/api/ical/${token}`
  }
  
  private getShiftTimes(shiftType: string): { startHour: number; endHour: number } {
    switch (shiftType) {
      case 'day':
        return { startHour: 7, endHour: 15 }
      case 'evening':
        return { startHour: 15, endHour: 23 }
      case 'night':
        return { startHour: 23, endHour: 7 }
      case 'off':
        return { startHour: 0, endHour: 0 }
      default:
        return { startHour: 9, endHour: 18 }
    }
  }
  
  private getShiftTitle(shiftType: string): string {
    const titles: Record<string, string> = {
      day: '주간 근무',
      evening: '저녁 근무',
      night: '야간 근무',
      off: '휴무'
    }
    return titles[shiftType] || '근무'
  }
  
  private generateDescription(assignment: ScheduleAssignment & { employee: Employee }): string {
    const lines = [
      `직원: ${assignment.employee.name}`,
      `근무 유형: ${this.getShiftTitle(assignment.shift_type)}`,
      `날짜: ${format(new Date(assignment.shift_date), 'yyyy년 MM월 dd일')}`,
      `상태: ${assignment.status === 'confirmed' ? '확정' : '임시'}`,
    ]
    
    if (assignment.notes) {
      lines.push(`메모: ${assignment.notes}`)
    }
    
    lines.push('', '이 일정은 ShiftLink에서 자동 생성되었습니다.')
    
    return lines.join('\n')
  }
  
  private dateToArray(date: Date): DateArray {
    return [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    ]
  }
}
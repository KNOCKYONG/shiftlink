import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Schedule, ScheduleAssignment, Employee } from '@/types'

interface ScheduleCSVData {
  schedule: Schedule
  assignments: (ScheduleAssignment & {
    employee: Employee
  })[]
  teamName: string
  month: Date
}

export class ScheduleCSVExporter {
  generate(data: ScheduleCSVData): string {
    const { assignments, teamName, month } = data
    
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month)
    })
    
    // Headers
    const headers = [
      '직원명',
      '직원번호',
      ...days.map(day => format(day, 'MM/dd', { locale: ko }))
    ]
    
    // Group assignments by employee
    const byEmployee = this.groupByEmployee(assignments)
    
    // Build rows
    const rows: string[][] = []
    
    Object.entries(byEmployee).forEach(([employeeId, empData]) => {
      const row = [
        empData.name,
        empData.employeeNumber || '',
        ...days.map(day => {
          const assignment = empData.assignments.find(a => 
            format(new Date(a.shift_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
          )
          
          if (!assignment) return ''
          
          switch (assignment.shift_type) {
            case 'day': return 'D'
            case 'evening': return 'E'
            case 'night': return 'N'
            case 'off': return 'OFF'
            default: return ''
          }
        })
      ]
      rows.push(row)
    })
    
    // Add summary section
    rows.push([])
    rows.push(['=== 요약 ==='])
    rows.push([`팀명: ${teamName}`])
    rows.push([`기간: ${format(month, 'yyyy년 MM월', { locale: ko })}`])
    rows.push([`총 인원: ${Object.keys(byEmployee).length}명`])
    
    // Calculate shift counts
    const shiftCounts = this.calculateShiftCounts(assignments, days)
    rows.push([])
    rows.push(['근무유형', '일수'])
    Object.entries(shiftCounts).forEach(([type, count]) => {
      rows.push([this.getShiftLabel(type), count.toString()])
    })
    
    // Convert to CSV
    return this.arrayToCSV([headers, ...rows])
  }
  
  generateDetailed(data: ScheduleCSVData): string {
    const { assignments, teamName, month } = data
    
    const headers = [
      '날짜',
      '요일',
      '직원명',
      '직원번호',
      '근무유형',
      '시작시간',
      '종료시간',
      '상태'
    ]
    
    const rows: string[][] = assignments.map(assignment => {
      const date = new Date(assignment.shift_date)
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'EEEE', { locale: ko }),
        assignment.employee.name,
        assignment.employee.employee_number || '',
        this.getShiftLabel(assignment.shift_type),
        assignment.start_time || '',
        assignment.end_time || '',
        this.getStatusLabel(assignment.status)
      ]
    })
    
    // Sort by date and employee name
    rows.sort((a, b) => {
      const dateCompare = a[0].localeCompare(b[0])
      if (dateCompare !== 0) return dateCompare
      return a[2].localeCompare(b[2])
    })
    
    return this.arrayToCSV([headers, ...rows])
  }
  
  private groupByEmployee(assignments: (ScheduleAssignment & { employee: Employee })[]) {
    return assignments.reduce((acc, assignment) => {
      const empId = assignment.employee_id
      if (!acc[empId]) {
        acc[empId] = {
          name: assignment.employee.name,
          employeeNumber: assignment.employee.employee_number,
          assignments: []
        }
      }
      acc[empId].assignments.push(assignment)
      return acc
    }, {} as Record<string, {
      name: string
      employeeNumber: string | null
      assignments: typeof assignments
    }>)
  }
  
  private calculateShiftCounts(
    assignments: ScheduleAssignment[],
    days: Date[]
  ): Record<string, number> {
    const counts: Record<string, number> = {
      day: 0,
      evening: 0,
      night: 0,
      off: 0
    }
    
    assignments.forEach(assignment => {
      if (counts[assignment.shift_type] !== undefined) {
        counts[assignment.shift_type]++
      }
    })
    
    return counts
  }
  
  private getShiftLabel(type: string): string {
    const labels: Record<string, string> = {
      day: '주간(D)',
      evening: '저녁(E)',
      night: '야간(N)',
      off: '휴무(OFF)'
    }
    return labels[type] || type
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmed: '확정',
      tentative: '임시',
      cancelled: '취소'
    }
    return labels[status] || status
  }
  
  private arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or quotes
        const escaped = cell.replace(/"/g, '""')
        return /[,"\n]/.test(cell) ? `"${escaped}"` : escaped
      }).join(',')
    ).join('\n')
  }
  
  // BOM for Excel UTF-8 compatibility
  toBlobWithBOM(csvContent: string): Blob {
    const BOM = '\uFEFF'
    return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  }
}
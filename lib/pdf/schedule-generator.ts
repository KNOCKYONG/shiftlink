import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Schedule, ScheduleAssignment, Employee } from '@/types'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface SchedulePDFData {
  schedule: Schedule
  assignments: (ScheduleAssignment & {
    employee: Employee
  })[]
  teamName: string
  month: Date
}

export class SchedulePDFGenerator {
  private doc: jsPDF

  constructor() {
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })
  }

  generate(data: SchedulePDFData): Blob {
    const { schedule, assignments, teamName, month } = data
    
    // Set font (you may need to add Korean font support)
    this.doc.setFont('helvetica')
    
    // Title
    this.doc.setFontSize(20)
    this.doc.text(
      `${teamName} - ${format(month, 'yyyy년 MM월', { locale: ko })} 근무표`,
      this.doc.internal.pageSize.width / 2,
      20,
      { align: 'center' }
    )
    
    // Generate calendar grid
    const days = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month)
    })
    
    // Group assignments by employee and date
    const scheduleGrid = this.buildScheduleGrid(assignments, days)
    
    // Create table data
    const headers = ['직원명', ...days.map(day => format(day, 'd', { locale: ko }))]
    const rows = Object.entries(scheduleGrid).map(([employeeName, shifts]) => [
      employeeName,
      ...shifts
    ])
    
    // Add table
    this.doc.autoTable({
      head: [headers],
      body: rows,
      startY: 35,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 }
      },
      didDrawCell: (data: any) => {
        // Color code shifts
        if (data.row.index >= 0 && data.column.index > 0) {
          const shift = data.cell.raw
          if (shift) {
            let bgColor: number[] = [255, 255, 255]
            let textColor: number[] = [0, 0, 0]
            
            switch (shift) {
              case 'D':
                bgColor = [255, 243, 224] // Light yellow
                break
              case 'E':
                bgColor = [232, 245, 233] // Light green
                break
              case 'N':
                bgColor = [225, 245, 254] // Light blue
                break
              case 'OFF':
                bgColor = [245, 245, 245] // Light gray
                textColor = [150, 150, 150]
                break
            }
            
            this.doc.setFillColor(...bgColor)
            this.doc.rect(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              'F'
            )
            
            this.doc.setTextColor(...textColor)
            this.doc.text(
              shift,
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2,
              { align: 'center', baseline: 'middle' }
            )
          }
        }
      }
    })
    
    // Add legend
    const finalY = (this.doc as any).lastAutoTable.finalY + 10
    this.addLegend(finalY)
    
    // Add footer
    this.addFooter()
    
    return this.doc.output('blob')
  }
  
  private buildScheduleGrid(
    assignments: (ScheduleAssignment & { employee: Employee })[],
    days: Date[]
  ): Record<string, string[]> {
    const grid: Record<string, string[]> = {}
    
    // Group assignments by employee
    const byEmployee = assignments.reduce((acc, assignment) => {
      const employeeName = assignment.employee.name
      if (!acc[employeeName]) {
        acc[employeeName] = []
      }
      acc[employeeName].push(assignment)
      return acc
    }, {} as Record<string, typeof assignments>)
    
    // Build grid
    Object.entries(byEmployee).forEach(([employeeName, empAssignments]) => {
      grid[employeeName] = days.map(day => {
        const assignment = empAssignments.find(a => 
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
    })
    
    return grid
  }
  
  private addLegend(yPosition: number) {
    const legends = [
      { label: 'D: Day (주간)', color: [255, 243, 224] },
      { label: 'E: Evening (저녁)', color: [232, 245, 233] },
      { label: 'N: Night (야간)', color: [225, 245, 254] },
      { label: 'OFF: 휴무', color: [245, 245, 245] }
    ]
    
    this.doc.setFontSize(10)
    this.doc.text('범례:', 20, yPosition)
    
    legends.forEach((legend, index) => {
      const x = 20 + (index * 60)
      const y = yPosition + 5
      
      // Draw color box
      this.doc.setFillColor(...legend.color)
      this.doc.rect(x, y, 5, 5, 'F')
      
      // Draw label
      this.doc.setTextColor(0, 0, 0)
      this.doc.text(legend.label, x + 7, y + 3.5)
    })
  }
  
  private addFooter() {
    const pageHeight = this.doc.internal.pageSize.height
    
    this.doc.setFontSize(8)
    this.doc.setTextColor(150, 150, 150)
    this.doc.text(
      `생성일: ${format(new Date(), 'yyyy-MM-dd HH:mm', { locale: ko })}`,
      20,
      pageHeight - 10
    )
    
    this.doc.text(
      'ShiftLink - 3교대 소통형 스케줄링 시스템',
      this.doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }
}
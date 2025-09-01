import { Resend } from 'resend'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Schedule, ScheduleAssignment, Employee } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build')

interface EmailData {
  to: string[]
  subject: string
  html: string
  attachments?: {
    filename: string
    content: Buffer | string
    contentType?: string
  }[]
}

export class ScheduleMailer {
  async sendScheduleEmail(
    recipients: string[],
    schedule: Schedule,
    assignments: (ScheduleAssignment & { employee: Employee })[],
    attachments?: {
      pdf?: Blob
      csv?: string
      ics?: string
    }
  ) {
    const subject = `${format(new Date(schedule.schedule_date), 'yyyy년 MM월', { locale: ko })} 근무표`
    
    const html = this.generateEmailHTML(schedule, assignments)
    
    const emailAttachments: EmailData['attachments'] = []
    
    if (attachments?.pdf) {
      const buffer = await attachments.pdf.arrayBuffer()
      emailAttachments.push({
        filename: `schedule_${format(new Date(schedule.schedule_date), 'yyyy-MM')}.pdf`,
        content: Buffer.from(buffer),
        contentType: 'application/pdf'
      })
    }
    
    if (attachments?.csv) {
      emailAttachments.push({
        filename: `schedule_${format(new Date(schedule.schedule_date), 'yyyy-MM')}.csv`,
        content: attachments.csv,
        contentType: 'text/csv'
      })
    }
    
    if (attachments?.ics) {
      emailAttachments.push({
        filename: `schedule_${format(new Date(schedule.schedule_date), 'yyyy-MM')}.ics`,
        content: attachments.ics,
        contentType: 'text/calendar'
      })
    }
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'ShiftLink <noreply@shiftlink.com>',
        to: recipients,
        subject,
        html,
        attachments: emailAttachments
      })
      
      if (error) {
        throw error
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Failed to send email:', error)
      return { success: false, error }
    }
  }
  
  async sendSwapRequestEmail(
    requester: Employee,
    target: Employee,
    requestDate: Date,
    targetDate: Date,
    requesterShift: string,
    targetShift: string
  ) {
    const subject = '근무 교환 요청'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .swap-details { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .button.reject { background-color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>근무 교환 요청</h2>
          </div>
          <div class="content">
            <p>안녕하세요 ${target.name}님,</p>
            <p>${requester.name}님이 근무 교환을 요청했습니다.</p>
            
            <div class="swap-details">
              <h3>교환 상세 정보</h3>
              <p><strong>요청자:</strong> ${requester.name}</p>
              <p><strong>요청자 근무:</strong> ${format(requestDate, 'yyyy년 MM월 dd일', { locale: ko })} - ${this.getShiftLabel(requesterShift)}</p>
              <p><strong>교환 대상:</strong> ${target.name}</p>
              <p><strong>대상 근무:</strong> ${format(targetDate, 'yyyy년 MM월 dd일', { locale: ko })} - ${this.getShiftLabel(targetShift)}</p>
            </div>
            
            <p>아래 버튼을 클릭하여 요청을 처리해주세요:</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/swaps/accept" class="button">수락</a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/swaps/reject" class="button reject">거절</a>
            </div>
            
            <div class="footer">
              <p>이 이메일은 ShiftLink 시스템에서 자동으로 발송되었습니다.</p>
              <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'ShiftLink <noreply@shiftlink.com>',
        to: target.email || '',
        subject,
        html
      })
      
      if (error) {
        throw error
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Failed to send swap request email:', error)
      return { success: false, error }
    }
  }
  
  async sendLeaveApprovalEmail(
    employee: Employee,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    status: 'approved' | 'rejected',
    reason?: string
  ) {
    const subject = `휴가 신청 ${status === 'approved' ? '승인' : '거절'}`
    const statusText = status === 'approved' ? '승인되었습니다' : '거절되었습니다'
    const statusColor = status === 'approved' ? '#10b981' : '#ef4444'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .leave-details { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>휴가 신청 ${status === 'approved' ? '승인' : '거절'}</h2>
          </div>
          <div class="content">
            <p>안녕하세요 ${employee.name}님,</p>
            <p>귀하의 휴가 신청이 ${statusText}.</p>
            
            <div class="leave-details">
              <h3>휴가 상세 정보</h3>
              <p><strong>휴가 유형:</strong> ${this.getLeaveTypeLabel(leaveType)}</p>
              <p><strong>시작일:</strong> ${format(startDate, 'yyyy년 MM월 dd일', { locale: ko })}</p>
              <p><strong>종료일:</strong> ${format(endDate, 'yyyy년 MM월 dd일', { locale: ko })}</p>
              ${reason ? `<p><strong>사유:</strong> ${reason}</p>` : ''}
            </div>
            
            <div class="footer">
              <p>이 이메일은 ShiftLink 시스템에서 자동으로 발송되었습니다.</p>
              <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    
    try {
      const { data, error } = await resend.emails.send({
        from: 'ShiftLink <noreply@shiftlink.com>',
        to: employee.email || '',
        subject,
        html
      })
      
      if (error) {
        throw error
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Failed to send leave approval email:', error)
      return { success: false, error }
    }
  }
  
  private generateEmailHTML(
    schedule: Schedule,
    assignments: (ScheduleAssignment & { employee: Employee })[]
  ): string {
    const scheduleDate = new Date(schedule.schedule_date)
    const monthStr = format(scheduleDate, 'yyyy년 MM월', { locale: ko })
    
    // Group assignments by date
    const byDate: Record<string, typeof assignments> = {}
    assignments.forEach(assignment => {
      const dateKey = format(new Date(assignment.shift_date), 'MM월 dd일', { locale: ko })
      if (!byDate[dateKey]) {
        byDate[dateKey] = []
      }
      byDate[dateKey].push(assignment)
    })
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .schedule-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .schedule-table th, .schedule-table td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
          .schedule-table th { background-color: #f3f4f6; font-weight: bold; }
          .shift-day { background-color: #fef3c7; }
          .shift-evening { background-color: #d1fae5; }
          .shift-night { background-color: #dbeafe; }
          .shift-off { background-color: #f3f4f6; color: #6b7280; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${monthStr} 근무표</h1>
            <p>ShiftLink - 3교대 소통형 스케줄링 시스템</p>
          </div>
          <div class="content">
            <p>안녕하세요,</p>
            <p>${monthStr} 근무표를 안내드립니다.</p>
            
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>직원</th>
                  <th>근무</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(byDate).map(([date, dateAssignments]) => 
                  dateAssignments.map((assignment, index) => `
                    <tr class="shift-${assignment.shift_type}">
                      ${index === 0 ? `<td rowspan="${dateAssignments.length}">${date}</td>` : ''}
                      <td>${assignment.employee.name}</td>
                      <td>${this.getShiftLabel(assignment.shift_type)}</td>
                      <td>${assignment.start_time || '-'} ~ ${assignment.end_time || '-'}</td>
                    </tr>
                  `).join('')
                ).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>첨부 파일로 PDF, CSV, 캘린더 파일이 포함되어 있습니다.</p>
              <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p>이 이메일은 ShiftLink 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
  
  private getShiftLabel(type: string): string {
    const labels: Record<string, string> = {
      day: '주간',
      evening: '저녁',
      night: '야간',
      off: '휴무'
    }
    return labels[type] || type
  }
  
  private getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      annual: '연차',
      sick: '병가',
      personal: '개인사유',
      family: '가족돌봄',
      maternity: '출산휴가',
      paternity: '배우자출산휴가',
      childcare: '육아휴직',
      other: '기타'
    }
    return labels[type] || type
  }
}
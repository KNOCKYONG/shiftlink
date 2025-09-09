'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, Clock, User } from 'lucide-react'

interface MobileScheduleViewProps {
  schedules: any[]
  currentDate: Date
  getShiftTypeColor: (type: string, leaveType?: string) => string
  getShiftTypeLabel: (type: string, leaveType?: string, koreanStyle?: boolean) => string
}

export function MobileScheduleView({ 
  schedules = [], 
  currentDate,
  getShiftTypeColor,
  getShiftTypeLabel 
}: MobileScheduleViewProps) {
  // Group schedules by date
  const schedulesByDate: { [key: string]: any[] } = {}
  
  // Create 7 days view
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + i)
    const dateKey = format(date, 'yyyy-MM-dd')
    schedulesByDate[dateKey] = []
  }

  // Populate with schedule data
  schedules.forEach(schedule => {
    const dateKey = format(new Date(schedule.date), 'yyyy-MM-dd')
    if (schedulesByDate[dateKey]) {
      schedulesByDate[dateKey].push(schedule)
    }
  })

  return (
    <div className="space-y-4">
      {Object.entries(schedulesByDate).map(([dateKey, daySchedules]) => {
        const date = new Date(dateKey)
        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
        
        return (
          <Card key={dateKey} className={isToday ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(date, 'MM/dd (EEE)', { locale: ko })}</span>
                </div>
                {isToday && (
                  <Badge variant="default" className="text-xs">오늘</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {daySchedules.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  스케줄 데이터가 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {['day', 'evening', 'night'].map(shiftType => {
                    const shiftWorkers = daySchedules.filter(s => s.shiftType === shiftType)
                    if (shiftWorkers.length === 0) return null
                    
                    return (
                      <div key={shiftType} className="space-y-1">
                        <Badge 
                          className={`${getShiftTypeColor(shiftType)} w-full justify-center`}
                          variant="outline"
                        >
                          {getShiftTypeLabel(shiftType)}
                        </Badge>
                        <div className="text-xs text-gray-600 pl-1">
                          {shiftWorkers.map(worker => worker.employeeName).join(', ')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Summary stats */}
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                <span>총 {daySchedules.length}명</span>
                <span>
                  주간: {daySchedules.filter(s => s.shiftType === 'day').length} | 
                  저녁: {daySchedules.filter(s => s.shiftType === 'evening').length} | 
                  야간: {daySchedules.filter(s => s.shiftType === 'night').length}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeftRight, Clock, User, Calendar, MessageSquare, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleAssignment {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off'
  status: string
  start_time?: string
  end_time?: string
}

interface SwapDialogProps {
  isOpen: boolean
  onClose: () => void
  myShift: ScheduleAssignment | null
  targetShift: ScheduleAssignment | null
  onSwapRequest: (data: {
    target_employee_id: string
    original_date: string
    original_shift_type: string
    target_date: string
    target_shift_type: string
    message?: string
  }) => Promise<void>
}

function SwapRequestDialog({ isOpen, onClose, myShift, targetShift, onSwapRequest }: SwapDialogProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!myShift || !targetShift) return

    setIsSubmitting(true)
    try {
      await onSwapRequest({
        target_employee_id: targetShift.employee_id,
        original_date: myShift.date,
        original_shift_type: myShift.shift_type,
        target_date: targetShift.date,
        target_shift_type: targetShift.shift_type,
        message: message || undefined
      })
      
      setMessage('')
      onClose()
    } catch (error) {
      console.error('Failed to create swap request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getShiftTypeDisplay = (shiftType: string, date: string, time?: string) => {
    const types = {
      day: '주간',
      evening: '오후',
      night: '야간',
      off: '휴무'
    }
    
    const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    })
    
    return `${formattedDate} ${types[shiftType as keyof typeof types]} ${time || ''}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            교환 요청
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {myShift && targetShift && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">내 일정</span>
                </div>
                <span className="text-sm text-blue-700">
                  {getShiftTypeDisplay(myShift.shift_type, myShift.date, myShift.start_time)}
                </span>
              </div>
              
              <div className="flex justify-center">
                <ArrowLeftRight className="h-6 w-6 text-gray-400" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{targetShift.employee_name}</span>
                </div>
                <span className="text-sm text-green-700">
                  {getShiftTypeDisplay(targetShift.shift_type, targetShift.date, targetShift.start_time)}
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="swap-message">메시지 (선택사항)</Label>
            <Textarea
              id="swap-message"
              placeholder="교환 사유나 메시지를 입력하세요..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              교환 요청이 승인되면 두 일정이 서로 바뀝니다. 상대방이 수락하면 자동으로 반영되거나 관리자 승인이 필요할 수 있습니다.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? '요청 중...' : '교환 요청'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface InteractiveScheduleGridProps {
  scheduleData: ScheduleAssignment[]
  currentUserId: string
  onSwapRequest?: (data: any) => Promise<void>
  enableSwap?: boolean
}

export function InteractiveScheduleGrid({ 
  scheduleData, 
  currentUserId, 
  onSwapRequest,
  enableSwap = true 
}: InteractiveScheduleGridProps) {
  const [selectedMyShift, setSelectedMyShift] = useState<ScheduleAssignment | null>(null)
  const [selectedTargetShift, setSelectedTargetShift] = useState<ScheduleAssignment | null>(null)
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // 현재 주/월의 날짜 범위 계산
  const getDateRange = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay())
      
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      
      return { start, end }
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      return { start, end }
    }
  }

  const { start, end } = getDateRange()

  // 날짜 범위 내 일정 필터링
  const filteredSchedule = scheduleData.filter(assignment => {
    const assignmentDate = new Date(assignment.date)
    return assignmentDate >= start && assignmentDate <= end
  })

  // 직원별로 그룹화
  const employeeSchedules = filteredSchedule.reduce((acc, assignment) => {
    if (!acc[assignment.employee_id]) {
      acc[assignment.employee_id] = {
        name: assignment.employee_name,
        code: assignment.employee_code,
        shifts: []
      }
    }
    acc[assignment.employee_id].shifts.push(assignment)
    return acc
  }, {} as Record<string, { name: string; code: string; shifts: ScheduleAssignment[] }>)

  const handleShiftClick = (shift: ScheduleAssignment) => {
    if (!enableSwap) return

    const isMyShift = shift.employee_id === currentUserId
    const isOff = shift.shift_type === 'off'

    if (isOff) return // 휴무는 교환 불가

    if (isMyShift) {
      setSelectedMyShift(shift)
      if (selectedTargetShift) {
        setShowSwapDialog(true)
      }
    } else {
      setSelectedTargetShift(shift)
      if (selectedMyShift) {
        setShowSwapDialog(true)
      }
    }
  }

  const getShiftTypeColor = (shiftType: string, isSelected = false) => {
    const colors = {
      day: isSelected ? 'bg-blue-200 border-blue-500' : 'bg-blue-100 hover:bg-blue-200 border-blue-300',
      evening: isSelected ? 'bg-yellow-200 border-yellow-500' : 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
      night: isSelected ? 'bg-purple-200 border-purple-500' : 'bg-purple-100 hover:bg-purple-200 border-purple-300',
      off: 'bg-gray-100 border-gray-300'
    }
    return colors[shiftType as keyof typeof colors] || colors.off
  }

  const getShiftTypeText = (shiftType: string) => {
    const types = {
      day: '주간',
      evening: '오후', 
      night: '야간',
      off: '휴무'
    }
    return types[shiftType as keyof typeof types] || shiftType
  }

  const generateDateHeaders = () => {
    const dates = []
    const current = new Date(start)
    
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }

  const dateHeaders = generateDateHeaders()

  const resetSelection = () => {
    setSelectedMyShift(null)
    setSelectedTargetShift(null)
    setShowSwapDialog(false)
  }

  const handleSwapRequestSubmit = async (data: any) => {
    if (onSwapRequest) {
      await onSwapRequest(data)
      resetSelection()
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-semibold">소통형 스케줄 - 교환 요청하기</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
            <TabsList className="grid grid-cols-2 w-32">
              <TabsTrigger value="week" className="text-xs">주간</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">월간</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 선택 상태 표시 */}
      {(selectedMyShift || selectedTargetShift) && (
        <Alert>
          <ArrowLeftRight className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {selectedMyShift && selectedTargetShift
                  ? '두 일정을 선택했습니다. 교환 요청을 진행하세요.'
                  : selectedMyShift
                  ? '내 일정을 선택했습니다. 교환하고 싶은 다른 직원의 일정을 선택하세요.'
                  : '교환할 직원의 일정을 선택했습니다. 내 일정을 선택하세요.'
                }
              </span>
              <Button variant="ghost" size="sm" onClick={resetSelection}>
                선택 초기화
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 스케줄 그리드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {start.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })}
              {viewMode === 'week' && (
                <span className="text-sm text-muted-foreground ml-2">
                  {start.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - 
                  {end.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                주간
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                오후
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                야간
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* 날짜 헤더 */}
              <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `120px repeat(${dateHeaders.length}, 1fr)` }}>
                <div className="p-2 text-sm font-medium text-muted-foreground">직원</div>
                {dateHeaders.map(date => (
                  <div key={date.toISOString()} className="p-2 text-center">
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-medium">
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 직원별 스케줄 */}
              {Object.entries(employeeSchedules).map(([employeeId, employee]) => (
                <div key={employeeId} className="grid gap-1 py-1" style={{ gridTemplateColumns: `120px repeat(${dateHeaders.length}, 1fr)` }}>
                  <div className="p-2 flex items-center">
                    <div>
                      <div className="text-sm font-medium truncate">{employee.name}</div>
                      <div className="text-xs text-muted-foreground">{employee.code}</div>
                      {employeeId === currentUserId && (
                        <Badge variant="secondary" className="text-xs mt-1">나</Badge>
                      )}
                    </div>
                  </div>
                  
                  {dateHeaders.map(date => {
                    const dateStr = date.toISOString().split('T')[0]
                    const shift = employee.shifts.find(s => s.date === dateStr)
                    
                    if (!shift) {
                      return <div key={dateStr} className="p-1 h-12 border border-gray-200 rounded"></div>
                    }

                    const isSelected = 
                      (selectedMyShift?.id === shift.id) || 
                      (selectedTargetShift?.id === shift.id)
                    
                    const isClickable = enableSwap && shift.shift_type !== 'off'

                    return (
                      <div key={dateStr} className="p-1">
                        <button
                          onClick={() => handleShiftClick(shift)}
                          disabled={!isClickable}
                          className={cn(
                            'w-full h-12 p-2 rounded border-2 transition-all text-xs',
                            getShiftTypeColor(shift.shift_type, isSelected),
                            isClickable ? 'cursor-pointer' : 'cursor-default',
                            isSelected && 'ring-2 ring-offset-1 ring-blue-500'
                          )}
                        >
                          <div className="font-medium">
                            {getShiftTypeText(shift.shift_type)}
                          </div>
                          {shift.start_time && (
                            <div className="text-xs opacity-75">
                              {shift.start_time.slice(0, 5)}
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {Object.keys(employeeSchedules).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              선택된 기간에 스케줄이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 교환 요청 다이얼로그 */}
      <SwapRequestDialog
        isOpen={showSwapDialog}
        onClose={resetSelection}
        myShift={selectedMyShift}
        targetShift={selectedTargetShift}
        onSwapRequest={handleSwapRequestSubmit}
      />
    </div>
  )
}
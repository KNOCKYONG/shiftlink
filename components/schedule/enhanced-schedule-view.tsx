'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Calendar, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Filter,
  Download,
  Search
} from 'lucide-react'
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  name: string
  role: string
  team: string
  avatar?: string
  level: number
}

interface ShiftAssignment {
  id: string
  employeeId: string
  employee: Employee
  shiftType: 'day' | 'evening' | 'night' | 'off'
  startTime: string
  endTime: string
  date: string
  isOvertime?: boolean
  isSwap?: boolean
}

interface EnhancedScheduleViewProps {
  assignments?: ShiftAssignment[]
  employees?: Employee[]
  onDateChange?: (date: Date) => void
  onShiftClick?: (assignment: ShiftAssignment) => void
}

export function EnhancedScheduleView({
  assignments = [],
  employees = [],
  onDateChange,
  onShiftClick
}: EnhancedScheduleViewProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')

  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0')
    return `${hour}:00`
  })

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    return addDays(currentWeek, i)
  })

  // Mock data for demonstration
  const mockEmployees: Employee[] = [
    { id: '1', name: '김철수', role: 'manager', team: 'A팀', level: 3 },
    { id: '2', name: '박영희', role: 'senior', team: 'A팀', level: 2 },
    { id: '3', name: '이민호', role: 'junior', team: 'B팀', level: 1 },
    { id: '4', name: '정수진', role: 'senior', team: 'B팀', level: 2 },
    { id: '5', name: '최동욱', role: 'manager', team: 'C팀', level: 3 },
    { id: '6', name: '김지은', role: 'junior', team: 'C팀', level: 1 },
  ]

  const mockAssignments: ShiftAssignment[] = [
    // Day shift (06:00-14:00)
    { id: '1', employeeId: '1', employee: mockEmployees[0], shiftType: 'day', startTime: '06:00', endTime: '14:00', date: format(weekDays[0], 'yyyy-MM-dd') },
    { id: '2', employeeId: '2', employee: mockEmployees[1], shiftType: 'day', startTime: '06:00', endTime: '14:00', date: format(weekDays[0], 'yyyy-MM-dd') },
    // Evening shift (14:00-22:00)
    { id: '3', employeeId: '3', employee: mockEmployees[2], shiftType: 'evening', startTime: '14:00', endTime: '22:00', date: format(weekDays[0], 'yyyy-MM-dd') },
    { id: '4', employeeId: '4', employee: mockEmployees[3], shiftType: 'evening', startTime: '14:00', endTime: '22:00', date: format(weekDays[0], 'yyyy-MM-dd') },
    // Night shift (22:00-06:00)
    { id: '5', employeeId: '5', employee: mockEmployees[4], shiftType: 'night', startTime: '22:00', endTime: '06:00', date: format(weekDays[0], 'yyyy-MM-dd') },
    { id: '6', employeeId: '6', employee: mockEmployees[5], shiftType: 'night', startTime: '22:00', endTime: '06:00', date: format(weekDays[0], 'yyyy-MM-dd') },
  ]

  const displayAssignments = assignments.length > 0 ? assignments : mockAssignments
  const displayEmployees = employees.length > 0 ? employees : mockEmployees

  const getShiftColor = (shiftType: string) => {
    const colors = {
      day: 'from-blue-400 to-blue-600',
      evening: 'from-orange-400 to-orange-600',
      night: 'from-purple-400 to-purple-600',
      off: 'from-gray-300 to-gray-400'
    }
    return colors[shiftType as keyof typeof colors] || colors.off
  }

  const getAssignmentsForTimeSlot = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return displayAssignments.filter(assignment => {
      if (assignment.date !== dateStr) return false
      
      const startHour = parseInt(assignment.startTime.split(':')[0])
      const endHour = parseInt(assignment.endTime.split(':')[0])
      
      // Handle overnight shifts
      if (startHour > endHour) {
        return hour >= startHour || hour < endHour
      }
      
      return hour >= startHour && hour < endHour
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(currentWeek, 1) 
      : addWeeks(currentWeek, 1)
    setCurrentWeek(newWeek)
    onDateChange?.(newWeek)
  }

  const WorkerPopover = ({ assignments: cellAssignments, date, hour }: { assignments: ShiftAssignment[], date: Date, hour: number }) => {
    if (cellAssignments.length === 0) return null

    return (
      <PopoverContent className="w-80 p-0" side="top" align="start">
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="font-semibold text-lg">
            {format(date, 'MM월 dd일 (EEE)', { locale: ko })} {hour}:00
          </h3>
          <p className="text-sm text-gray-600">근무자 {cellAssignments.length}명</p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-2">
            {cellAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onShiftClick?.(assignment)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={assignment.employee.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {assignment.employee.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{assignment.employee.name}</p>
                  <p className="text-xs text-gray-500">{assignment.employee.team} · {assignment.employee.role}</p>
                </div>
                <div className="text-right">
                  <Badge 
                    className={cn(
                      "text-xs bg-gradient-to-r text-white border-0",
                      getShiftColor(assignment.shiftType)
                    )}
                  >
                    {assignment.startTime}-{assignment.endTime}
                  </Badge>
                  {assignment.isOvertime && (
                    <Badge variant="destructive" className="ml-1 text-xs">초과</Badge>
                  )}
                  {assignment.isSwap && (
                    <Badge variant="secondary" className="ml-1 text-xs">교환</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                스케줄 관리
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                {format(currentWeek, 'yyyy년 MM월', { locale: ko })} 주간 근무 스케줄
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white rounded-lg border shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="rounded-r-none hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="border-x rounded-none px-4 hover:bg-gray-50"
                >
                  오늘
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="rounded-l-none hover:bg-gray-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                <Filter className="h-4 w-4 mr-2" />
                필터
              </Button>
              
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Schedule Grid */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="p-4 font-semibold text-gray-700 border-r bg-gray-100">
                  시간
                </div>
                {weekDays.map((date, index) => (
                  <div key={index} className="p-4 text-center border-r last:border-r-0">
                    <div className="font-semibold text-gray-800">
                      {format(date, 'EEE', { locale: ko })}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {format(date, 'dd')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'MM월', { locale: ko })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <TooltipProvider>
                {timeSlots.map((timeSlot, timeIndex) => (
                  <div key={timeSlot} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <div className="p-3 font-mono text-sm text-gray-600 border-r bg-gray-50/50 flex items-center">
                      <Clock className="h-3 w-3 mr-2 text-gray-400" />
                      {timeSlot}
                    </div>
                    
                    {weekDays.map((date, dayIndex) => {
                      const cellAssignments = getAssignmentsForTimeSlot(date, timeIndex)
                      const cellKey = `${format(date, 'yyyy-MM-dd')}-${timeIndex}`
                      const hasWorkers = cellAssignments.length > 0
                      
                      return (
                        <Popover key={`${timeSlot}-${dayIndex}`}>
                          <PopoverTrigger asChild>
                            <div
                              className={cn(
                                "p-2 border-r last:border-r-0 min-h-[60px] cursor-pointer transition-all duration-200",
                                "hover:bg-blue-50 hover:shadow-inner",
                                hasWorkers && "bg-gradient-to-br from-blue-50 to-indigo-50",
                                selectedCell === cellKey && "ring-2 ring-blue-400 bg-blue-100"
                              )}
                              onClick={() => setSelectedCell(cellKey)}
                              onMouseEnter={() => setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {hasWorkers ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 mb-2">
                                    <Users className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-700">
                                      {cellAssignments.length}명
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {cellAssignments.slice(0, 3).map((assignment, idx) => (
                                      <Tooltip key={idx}>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                                            <AvatarImage src={assignment.employee.avatar} />
                                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                              {assignment.employee.name[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-medium">{assignment.employee.name}</p>
                                          <p className="text-xs text-gray-600">
                                            {assignment.startTime} - {assignment.endTime}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                    {cellAssignments.length > 3 && (
                                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs flex items-center justify-center border-2 border-white shadow-sm">
                                        +{cellAssignments.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full opacity-50">
                                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <WorkerPopover 
                            assignments={cellAssignments} 
                            date={date} 
                            hour={timeIndex}
                          />
                        </Popover>
                      )
                    })}
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 근무자</p>
                <p className="text-2xl font-bold text-blue-700">{displayEmployees.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">평균 근무시간</p>
                <p className="text-2xl font-bold text-green-700">8.2시간</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">교체 요청</p>
                <p className="text-2xl font-bold text-orange-700">3건</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500 text-white">
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">초과 근무</p>
                <p className="text-2xl font-bold text-purple-700">12시간</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
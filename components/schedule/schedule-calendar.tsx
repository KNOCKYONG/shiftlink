'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react'

interface Employee {
  id: string
  name: string
  level: string // 'lv1', 'lv2', 'lv3', etc.
  level_title?: string // '신규간호사', '일반간호사', etc.
  team: string
}

interface ShiftAssignment {
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off' | 'leave'
  employees: Employee[]
}

interface ScheduleCalendarProps {
  startDate: string
  endDate: string
  assignments: ShiftAssignment[]
  onDateClick?: (date: string) => void
  onEmployeeMove?: (employeeId: string, fromDate: string, fromShift: string, toDate: string, toShift: string, targetEmployeeId?: string) => Promise<boolean>
}

// 동적 레벨 색상 팔레트 (schedule-generator와 동일)
const levelColorPalette = [
  'bg-red-100 text-red-700 border-red-200',      // Lv 1
  'bg-orange-100 text-orange-700 border-orange-200', // Lv 2  
  'bg-yellow-100 text-yellow-700 border-yellow-200', // Lv 3
  'bg-green-100 text-green-700 border-green-200',   // Lv 4
  'bg-teal-100 text-teal-700 border-teal-200',     // Lv 5
  'bg-blue-100 text-blue-700 border-blue-200',     // Lv 6
  'bg-indigo-100 text-indigo-700 border-indigo-200', // Lv 7
  'bg-purple-100 text-purple-700 border-purple-200', // Lv 8
  'bg-pink-100 text-pink-700 border-pink-200',     // Lv 9
  'bg-gray-100 text-gray-700 border-gray-200'      // Lv 10
]

// 레벨 색상 가져오기 함수
const getLevelColor = (level: string) => {
  const levelNumber = parseInt(level.replace('lv', '')) || 1
  return levelColorPalette[levelNumber - 1] || 'bg-gray-100 text-gray-700 border-gray-200'
}

// 레벨별 정렬 함수
const sortByLevel = (employees: Employee[]) => {
  return employees.sort((a, b) => {
    const levelA = parseInt(a.level.replace('lv', '')) || 1
    const levelB = parseInt(b.level.replace('lv', '')) || 1
    return levelA - levelB
  })
}

const shiftIcons = {
  day: '☀️',
  evening: '🌆',
  night: '🌙',
  off: '🏠',
  leave: '🌴'
}

export function ScheduleCalendar({ 
  startDate, 
  endDate, 
  assignments,
  onDateClick,
  onEmployeeMove 
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(startDate)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [visibleShifts, setVisibleShifts] = useState({
    day: true,
    evening: true,
    night: true,
    off: true,
    leave: true
  })
  const [draggedEmployee, setDraggedEmployee] = useState<{
    employee: Employee
    fromDate: string
    fromShift: string
  } | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<{
    date: string
    shift: string
  } | null>(null)

  const toggleShiftVisibility = (shiftType: string) => {
    setVisibleShifts(prev => ({
      ...prev,
      [shiftType]: !prev[shiftType]
    }))
  }

  // 달력 생성
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startCalendar = new Date(firstDay)
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startCalendar)
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(newMonth.getMonth() + direction)
      return newMonth
    })
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getAssignmentsForDate = (date: string) => {
    return assignments.filter(a => a.date === date)
  }

  // 드래그앤드롭 핸들러
  const handleDragStart = (employee: Employee, fromDate: string, fromShift: string) => {
    setDraggedEmployee({ employee, fromDate, fromShift })
  }

  const handleDragEnd = () => {
    setDraggedEmployee(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, toDate: string, toShift: string) => {
    e.preventDefault()
    setDragOverTarget({ date: toDate, shift: toShift })
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, toDate: string, toShift: string, targetEmployeeId?: string) => {
    e.preventDefault()
    
    if (!draggedEmployee || !onEmployeeMove) {
      setDraggedEmployee(null)
      setDragOverTarget(null)
      return
    }

    const { employee, fromDate, fromShift } = draggedEmployee

    // 같은 위치로 드롭하면 무시
    if (fromDate === toDate && fromShift === toShift) {
      setDraggedEmployee(null)
      setDragOverTarget(null)
      return
    }

    try {
      const success = await onEmployeeMove(employee.id, fromDate, fromShift, toDate, toShift, targetEmployeeId)
      if (!success) {
        console.log('Move cancelled or failed')
      }
    } catch (error) {
      console.error('Error moving employee:', error)
    } finally {
      setDraggedEmployee(null)
      setDragOverTarget(null)
    }
  }

  const renderEmployeeCard = (employee: Employee, fromDate: string, fromShift: string) => {
    const levelColor = getLevelColor(employee.level)
    const displayTitle = employee.level_title || employee.level.toUpperCase()
    const isDragging = draggedEmployee?.employee.id === employee.id
    
    return (
      <div
        key={employee.id}
        draggable={!!onEmployeeMove}
        onDragStart={() => handleDragStart(employee, fromDate, fromShift)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => {
          e.stopPropagation() // 버블링 방지
          handleDrop(e, fromDate, fromShift, employee.id) // 직원 위에 드롭하면 스위칭
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className={`px-1.5 py-0.5 text-xs rounded border transition-all cursor-move ${levelColor} ${
          isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md hover:scale-105'
        }`}
        style={{ fontSize: '10px' }}
        title={`${employee.name} (${displayTitle}) - 드래그하여 이동`}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">{employee.name}</span>
          <span className="text-xs opacity-75 ml-1">{displayTitle}</span>
        </div>
      </div>
    )
  }

  const calendarDays = generateCalendarDays()
  const monthYear = currentMonth.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long' 
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            스케줄 캘린더
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[120px] text-center">
              {monthYear}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 근무 타입 필터 버튼 - 미니멀 디자인 */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-gray-500 mr-2 self-center">필터:</span>
          <Button
            variant={visibleShifts.day ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleShiftVisibility('day')}
            className={`h-7 px-2 text-xs ${visibleShifts.day ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'text-gray-600'}`}
          >
            주간
          </Button>
          <Button
            variant={visibleShifts.evening ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleShiftVisibility('evening')}
            className={`h-7 px-2 text-xs ${visibleShifts.evening ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'text-gray-600'}`}
          >
            저녁
          </Button>
          <Button
            variant={visibleShifts.night ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleShiftVisibility('night')}
            className={`h-7 px-2 text-xs ${visibleShifts.night ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'text-gray-600'}`}
          >
            야간
          </Button>
          <Button
            variant={visibleShifts.off ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleShiftVisibility('off')}
            className={`h-7 px-2 text-xs ${visibleShifts.off ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'text-gray-600'}`}
          >
            오프
          </Button>
          <Button
            variant={visibleShifts.leave ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleShiftVisibility('leave')}
            className={`h-7 px-2 text-xs ${visibleShifts.leave ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'text-gray-600'}`}
          >
            휴가
          </Button>
        </div>
        
        {/* 범례 - 컴팩트 디자인 */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
          <span className="text-gray-500">레벨:</span>
          {/* 동적으로 표시할 레벨들 - assignments에서 추출 */}
          {(() => {
            // assignments에서 모든 직원의 레벨을 추출하여 중복 제거 및 정렬
            const allLevels = new Set<string>()
            assignments.forEach(assignment => {
              assignment.employees.forEach(emp => {
                allLevels.add(emp.level)
              })
            })
            
            // 레벨 번호로 정렬
            const sortedLevels = Array.from(allLevels).sort((a, b) => {
              const numA = parseInt(a.replace('lv', '')) || 0
              const numB = parseInt(b.replace('lv', '')) || 0
              return numA - numB
            })
            
            // 최대 10개 레벨까지만 표시
            return sortedLevels.slice(0, 10).map(level => {
              const levelNum = parseInt(level.replace('lv', '')) || 1
              const levelColor = getLevelColor(level)
              
              return (
                <div key={level} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${levelColor.split(' ')[0]}`}></div>
                  <span className="text-gray-600">Lv{levelNum}</span>
                </div>
              )
            })
          })()}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div 
              key={day} 
              className={`text-center text-sm font-semibold p-2 ${
                day === '일' ? 'text-red-500' : day === '토' ? 'text-blue-500' : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dateStr = formatDate(date)
            const dayAssignments = getAssignmentsForDate(dateStr)
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const isInRange = dateStr >= startDate && dateStr <= endDate
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border rounded-lg ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isWeekend ? 'bg-orange-50' : ''} ${
                  isInRange ? 'border-blue-300' : 'border-gray-200'
                } ${onDateClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={() => onDateClick && isInRange && onDateClick(dateStr)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${
                    !isCurrentMonth ? 'text-gray-400' : 
                    date.getDay() === 0 ? 'text-red-500' : 
                    date.getDay() === 6 ? 'text-blue-500' : ''
                  }`}>
                    {date.getDate()}
                  </span>
                </div>

                {isInRange && dayAssignments.length > 0 && (
                  <div className="space-y-1">
                    {['day', 'evening', 'night', 'off', 'leave'].map(shiftType => {
                      // Check if this shift type should be visible
                      if (!visibleShifts[shiftType]) return null
                      
                      const shift = dayAssignments.find(a => a.shift_type === shiftType)
                      if (!shift || !shift.employees || shift.employees.length === 0) return null

                      // 레벨별로 정렬
                      const sortedEmployees = sortByLevel([...shift.employees])

                      const isDropTarget = dragOverTarget?.date === dateStr && dragOverTarget?.shift === shiftType
                      
                      return (
                        <div 
                          key={shiftType} 
                          className={`space-y-0.5 p-1 rounded transition-all ${
                            isDropTarget ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, dateStr, shiftType)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dateStr, shiftType)}
                        >
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <span>{shiftIcons[shiftType]}</span>
                            <span className="font-medium">
                              {shiftType === 'day' ? '주간' : 
                               shiftType === 'evening' ? '저녁' : 
                               shiftType === 'night' ? '야간' :
                               shiftType === 'off' ? '오프' : '휴가'}
                            </span>
                          </div>
                          <div className="space-y-0.5 min-h-[20px]">
                            {sortedEmployees.map(emp => renderEmployeeCard(emp, dateStr, shiftType))}
                            {isDropTarget && (
                              <div className="text-xs text-blue-600 italic">
                                여기에 놓으세요
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {isInRange && dayAssignments.length === 0 && (
                  <div className="space-y-1 mt-2">
                    {['day', 'evening', 'night'].map(shiftType => {
                      if (!visibleShifts[shiftType]) return null
                      
                      const isDropTarget = dragOverTarget?.date === dateStr && dragOverTarget?.shift === shiftType
                      
                      return (
                        <div
                          key={shiftType}
                          className={`p-2 rounded border-2 border-dashed transition-all min-h-[30px] ${
                            isDropTarget ? 'bg-blue-100 border-blue-400' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onDragOver={(e) => handleDragOver(e, dateStr, shiftType)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dateStr, shiftType)}
                        >
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{shiftIcons[shiftType]}</span>
                            <span>
                              {shiftType === 'day' ? '주간' : 
                               shiftType === 'evening' ? '저녁' : 
                               shiftType === 'night' ? '야간' : shiftType}
                            </span>
                            {isDropTarget && (
                              <span className="text-blue-600 ml-2">여기에 놓으세요</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
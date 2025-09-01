'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, TableIcon, FileTextIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ScheduleViewProps {
  schedules?: any[]
  employees?: any[]
  currentDate?: Date
}

export function ScheduleView({ schedules = [], employees = [], currentDate = new Date() }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(currentDate)
  const [viewMode, setViewMode] = useState<'table' | 'calendar' | 'log'>('table')

  const getShiftTypeColor = (type: string, leaveType?: string) => {
    // 연차/휴가인 경우 전용 색상
    if (leaveType) {
      switch (leaveType) {
        case 'annual':
          return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        case 'sick':
          return 'bg-red-100 text-red-800 border border-red-200'
        case 'personal':
          return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        case 'emergency':
          return 'bg-pink-100 text-pink-800 border border-pink-200'
        default:
          return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      }
    }

    // 일반 시프트 색상 (한국 간호사 표준)
    switch (type) {
      case 'day':
        return 'bg-sky-100 text-sky-800 border border-sky-200'
      case 'evening':
        return 'bg-amber-100 text-amber-800 border border-amber-200'
      case 'night':
        return 'bg-purple-100 text-purple-800 border border-purple-200'
      case 'off':
        return 'bg-slate-100 text-slate-600 border border-slate-200'
      default:
        return 'bg-gray-100 text-gray-600 border border-gray-200'
    }
  }

  const getShiftTypeLabel = (type: string, leaveType?: string, koreanStyle = false) => {
    // 연차/휴가인 경우
    if (leaveType) {
      const leaveLabels = {
        annual: koreanStyle ? '연' : '연차',
        sick: koreanStyle ? '병' : '병가',
        personal: koreanStyle ? '개' : '개인사유',
        emergency: koreanStyle ? '응' : '응급휴가'
      }
      return leaveLabels[leaveType as keyof typeof leaveLabels] || '휴'
    }

    // 일반 시프트 (한국 간호사 용어)
    if (koreanStyle) {
      switch (type) {
        case 'day':
          return '데'
        case 'evening':
          return '이'
        case 'night':
          return '나'
        case 'off':
          return '오'
        default:
          return type.charAt(0)
      }
    }

    switch (type) {
      case 'day':
        return '데이'
      case 'evening':
        return '이브닝'
      case 'night':
        return '나이트'
      case 'off':
        return '휴무'
      default:
        return type
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>스케줄 관리</CardTitle>
        <CardDescription>
          {format(currentDate, 'yyyy년 MM월', { locale: ko })} 근무 스케줄
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="table">
              <TableIcon className="mr-2 h-4 w-4" />
              표 보기
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon className="mr-2 h-4 w-4" />
              캘린더
            </TabsTrigger>
            <TabsTrigger value="log">
              <FileTextIcon className="mr-2 h-4 w-4" />
              반영사항
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">직원</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>팀</TableHead>
                    {[...Array(7)].map((_, i) => {
                      const date = new Date(currentDate)
                      date.setDate(date.getDate() + i)
                      return (
                        <TableHead key={i} className="text-center">
                          <div>{format(date, 'MM/dd')}</div>
                          <div className="text-xs text-gray-500">
                            {format(date, 'EEE', { locale: ko })}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.role}</Badge>
                      </TableCell>
                      <TableCell>{employee.team}</TableCell>
                      {[...Array(7)].map((_, i) => {
                        // 임시 데이터 - 실제로는 schedules에서 가져와야 함
                        const shiftTypes = ['day', 'evening', 'night', 'off']
                        const randomShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)]
                        return (
                          <TableCell key={i} className="text-center">
                            <Badge className={getShiftTypeColor(randomShift)}>
                              {getShiftTypeLabel(randomShift)}
                            </Badge>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ko}
                className="rounded-md border"
              />
            </div>
            {selectedDate && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">
                  {format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko })} 근무자
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Badge className="bg-blue-100 text-blue-800">주간</Badge>
                    <p className="text-sm mt-1">10명</p>
                  </div>
                  <div>
                    <Badge className="bg-orange-100 text-orange-800">저녁</Badge>
                    <p className="text-sm mt-1">8명</p>
                  </div>
                  <div>
                    <Badge className="bg-purple-100 text-purple-800">야간</Badge>
                    <p className="text-sm mt-1">6명</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">스케줄 생성</h4>
                  <span className="text-sm text-gray-500">2025-09-01 09:00</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  2025년 9월 스케줄이 자동 생성되었습니다.
                </p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">교환 요청</h4>
                  <span className="text-sm text-gray-500">2025-09-01 14:30</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  김철수님이 박영희님과 9월 5일 근무 교환을 요청했습니다.
                </p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">휴가 승인</h4>
                  <span className="text-sm text-gray-500">2025-09-01 16:00</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  이민호님의 9월 10-12일 휴가가 승인되었습니다.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
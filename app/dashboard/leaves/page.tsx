'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { CalendarDays, Check, X, Clock, FileText, Plus, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LeaveRequest {
  id: string
  employee_name: string
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function LeavesPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLeaveRequests()
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchLeaveRequests = async () => {
    try {
      // 실제로는 leave_requests 테이블에서 가져와야 함
      // 지금은 더미 데이터 사용
      setLeaveRequests([
        {
          id: '1',
          employee_name: '김간호',
          leave_type: 'annual',
          start_date: '2025-09-15',
          end_date: '2025-09-17',
          days: 3,
          reason: '가족 여행',
          status: 'pending',
          created_at: '2025-09-07T10:00:00'
        },
        {
          id: '2',
          employee_name: '이간호',
          leave_type: 'sick',
          start_date: '2025-09-08',
          end_date: '2025-09-08',
          days: 1,
          reason: '병원 진료',
          status: 'approved',
          created_at: '2025-09-06T14:00:00'
        },
        {
          id: '3',
          employee_name: '박간호',
          leave_type: 'personal',
          start_date: '2025-09-20',
          end_date: '2025-09-22',
          days: 3,
          reason: '개인 사유',
          status: 'pending',
          created_at: '2025-09-05T09:00:00'
        }
      ])
    } catch (error) {
      console.error('Error fetching leave requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    // API 호출하여 승인 처리
    console.log('Approve leave:', id)
    fetchLeaveRequests()
  }

  const handleReject = async (id: string) => {
    // API 호출하여 거절 처리
    console.log('Reject leave:', id)
    fetchLeaveRequests()
  }

  const filteredRequests = leaveRequests.filter(req => 
    filter === 'all' || req.status === filter
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">승인됨</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">거절됨</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '연차'
      case 'sick': return '병가'
      case 'personal': return '개인휴가'
      default: return type
    }
  }

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'annual':
        return <Badge className="bg-blue-100 text-blue-800">연차</Badge>
      case 'sick':
        return <Badge className="bg-red-100 text-red-800">병가</Badge>
      case 'personal':
        return <Badge className="bg-purple-100 text-purple-800">개인휴가</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">휴가 관리</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            휴가 및 결근 요청을 관리하고 승인하세요.
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          휴가 신청
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size={isMobile ? 'sm' : 'default'}
            >
              전체
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              size={isMobile ? 'sm' : 'default'}
            >
              대기중
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              onClick={() => setFilter('approved')}
              size={isMobile ? 'sm' : 'default'}
            >
              승인됨
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setFilter('rejected')}
              size={isMobile ? 'sm' : 'default'}
            >
              거절됨
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">휴가 요청 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">데이터를 불러오는 중...</div>
              ) : isMobile ? (
                // Mobile card view
                <div className="space-y-3">
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <Card key={request.id} className="p-4">
                        <div className="space-y-3">
                          {/* Header with employee name and status */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-sm">{request.employee_name}</div>
                              {getLeaveTypeBadge(request.leave_type)}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>

                          {/* Leave details */}
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">기간:</span>
                              <span className="font-medium">
                                {request.start_date} ~ {request.end_date}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">일수:</span>
                              <span className="font-medium">{request.days}일</span>
                            </div>
                            {request.reason && (
                              <div className="pt-2 border-t">
                                <span className="text-gray-500">사유: </span>
                                <span className="text-sm">{request.reason}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions for pending requests */}
                          {request.status === 'pending' && (
                            <div className="flex gap-2 pt-3 border-t">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1"
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                승인
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1"
                                onClick={() => handleReject(request.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                거절
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>휴가 요청이 없습니다.</p>
                    </div>
                  )}
                </div>
              ) : (
                // Desktop table view
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>직원</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>시작일</TableHead>
                        <TableHead>종료일</TableHead>
                        <TableHead>일수</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.employee_name}</TableCell>
                          <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                          <TableCell>{request.start_date}</TableCell>
                          <TableCell>{request.end_date}</TableCell>
                          <TableCell>{request.days}일</TableCell>
                          <TableCell>{request.reason || '-'}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleApprove(request.id)}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleReject(request.id)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle>휴가 캘린더</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">휴가 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">대기중 요청</span>
                <span className="text-sm sm:text-base font-semibold">
                  {leaveRequests.filter(r => r.status === 'pending').length}건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">이번 달 승인</span>
                <span className="text-sm sm:text-base font-semibold">
                  {leaveRequests.filter(r => r.status === 'approved').length}건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">총 휴가 일수</span>
                <span className="text-sm sm:text-base font-semibold">
                  {leaveRequests
                    .filter(r => r.status === 'approved')
                    .reduce((sum, r) => sum + r.days, 0)}일
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
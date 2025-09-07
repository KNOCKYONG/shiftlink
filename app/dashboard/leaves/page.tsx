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
import { CalendarDays, Check, X, Clock, FileText, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

  useEffect(() => {
    fetchLeaveRequests()
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">휴가 관리</h2>
          <p className="text-muted-foreground">
            휴가 및 결근 요청을 관리하고 승인하세요.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          휴가 신청
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              전체
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
            >
              대기중
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              onClick={() => setFilter('approved')}
            >
              승인됨
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setFilter('rejected')}
            >
              거절됨
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>휴가 요청 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">데이터를 불러오는 중...</div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
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
              <CardTitle>휴가 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">대기중 요청</span>
                <span className="font-semibold">
                  {leaveRequests.filter(r => r.status === 'pending').length}건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">이번 달 승인</span>
                <span className="font-semibold">
                  {leaveRequests.filter(r => r.status === 'approved').length}건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">총 휴가 일수</span>
                <span className="font-semibold">
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
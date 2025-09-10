'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { ArrowLeftRight, Check, X, Clock, Calendar, MoreVertical, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SwapRequest {
  id: string
  requester_name: string
  target_name: string
  request_date: string
  target_date: string
  shift_type: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  created_at: string
}

export default function SwapsPage() {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSwapRequests()
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchSwapRequests = async () => {
    try {
      // 실제로는 swap_requests 테이블에서 가져와야 함
      // 지금은 더미 데이터 사용
      setSwapRequests([
        {
          id: '1',
          requester_name: '김간호',
          target_name: '이간호',
          request_date: '2025-09-10',
          target_date: '2025-09-12',
          shift_type: 'night',
          status: 'pending',
          reason: '개인 사정',
          created_at: '2025-09-07T10:00:00'
        },
        {
          id: '2',
          requester_name: '박간호',
          target_name: '최간호',
          request_date: '2025-09-11',
          target_date: '2025-09-11',
          shift_type: 'day',
          status: 'approved',
          reason: '병원 진료',
          created_at: '2025-09-06T14:00:00'
        }
      ])
    } catch (error) {
      console.error('Error fetching swap requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    // API 호출하여 승인 처리
    console.log('Approve swap:', id)
    fetchSwapRequests()
  }

  const handleReject = async (id: string) => {
    // API 호출하여 거절 처리
    console.log('Reject swap:', id)
    fetchSwapRequests()
  }

  const filteredRequests = swapRequests.filter(req => 
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

  const getShiftTypeLabel = (type: string) => {
    switch (type) {
      case 'day': return '주간'
      case 'evening': return '저녁'
      case 'night': return '야간'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">교환 요청</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            근무 교환 요청을 관리하고 승인하세요.
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          교환 요청하기
        </Button>
      </div>

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
          <CardTitle className="text-lg sm:text-xl">교환 요청 목록</CardTitle>
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
                      {/* Header with status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 rounded-full p-2">
                            <ArrowLeftRight className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{request.requester_name}</div>
                            <div className="text-xs text-gray-500">→ {request.target_name}</div>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* Request details */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">요청 날짜:</span>
                          <span className="font-medium">{request.request_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">교환 날짜:</span>
                          <span className="font-medium">{request.target_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">근무 유형:</span>
                          <Badge variant="outline" className="text-xs">
                            {getShiftTypeLabel(request.shift_type)}
                          </Badge>
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
                  <p>교환 요청이 없습니다.</p>
                </div>
              )}
            </div>
          ) : (
            // Desktop table view
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청자</TableHead>
                    <TableHead>대상자</TableHead>
                    <TableHead>요청 날짜</TableHead>
                    <TableHead>교환 날짜</TableHead>
                    <TableHead>근무 유형</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.requester_name}</TableCell>
                      <TableCell>{request.target_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {request.request_date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {request.target_date}
                        </div>
                      </TableCell>
                      <TableCell>{getShiftTypeLabel(request.shift_type)}</TableCell>
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
  )
}
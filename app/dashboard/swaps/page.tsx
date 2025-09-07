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
import { ArrowLeftRight, Check, X, Clock, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

  useEffect(() => {
    fetchSwapRequests()
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">교환 요청</h2>
          <p className="text-muted-foreground">
            근무 교환 요청을 관리하고 승인하세요.
          </p>
        </div>
        <Button>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          교환 요청하기
        </Button>
      </div>

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
          <CardTitle>교환 요청 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">데이터를 불러오는 중...</div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
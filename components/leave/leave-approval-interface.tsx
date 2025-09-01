'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar, 
  AlertTriangle,
  MessageSquare,
  Filter,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveRequest, LeaveType } from '@/types'

interface LeaveApprovalInterfaceProps {
  className?: string
}

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: '연차',
  sick: '병가',
  personal: '개인사유',
  maternity: '출산휴가',
  paternity: '육아휴가',
  emergency: '응급',
  bereavement: '경조사',
  other: '기타'
}

const leaveTypeColors: Record<LeaveType, string> = {
  annual: 'bg-blue-100 text-blue-700',
  sick: 'bg-red-100 text-red-700',
  personal: 'bg-green-100 text-green-700',
  maternity: 'bg-pink-100 text-pink-700',
  paternity: 'bg-purple-100 text-purple-700',
  emergency: 'bg-orange-100 text-orange-700',
  bereavement: 'bg-gray-100 text-gray-700',
  other: 'bg-yellow-100 text-yellow-700'
}

export function LeaveApprovalInterface({ className }: LeaveApprovalInterfaceProps) {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([])
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const [pendingRes, allRes] = await Promise.all([
        fetch('/api/leaves?status=pending&limit=20'),
        fetch('/api/leaves?limit=50')
      ])

      if (!pendingRes.ok || !allRes.ok) {
        throw new Error('Failed to fetch leave requests')
      }

      const pendingData = await pendingRes.json()
      const allData = await allRes.json()

      setPendingRequests(pendingData.data || [])
      setAllRequests(allData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setActionType(action)
    setRejectionReason('')
    
    if (action === 'approve') {
      // 승인은 바로 처리
      await processAction(request.id, action)
    } else {
      // 거부는 사유 입력을 위해 다이얼로그 열기
      setIsDialogOpen(true)
    }
  }

  const processAction = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    if (processingIds.has(requestId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(requestId))

      const response = await fetch(`/api/leaves/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          rejection_reason: reason
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Failed to ${action} leave request`)
      }

      // 성공 시 목록 새로고침
      await fetchLeaveRequests()
      setIsDialogOpen(false)
      setSelectedRequest(null)
      setActionType(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} leave request`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectWithReason = () => {
    if (selectedRequest && rejectionReason.trim()) {
      processAction(selectedRequest.id, 'reject', rejectionReason.trim())
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('ko-KR')
    const end = new Date(endDate).toLocaleDateString('ko-KR')
    return start === end ? start : `${start} ~ ${end}`
  }

  const renderLeaveRequest = (request: LeaveRequest) => {
    const isProcessing = processingIds.has(request.id)
    
    return (
      <Card key={request.id} className={cn("transition-opacity", isProcessing && "opacity-50")}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={leaveTypeColors[request.leave_type]}
                >
                  {leaveTypeLabels[request.leave_type]}
                </Badge>
                {request.is_emergency && (
                  <Badge variant="destructive">응급</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toLocaleDateString('ko-KR')} 신청
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{request.employee?.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({request.employee?.employee_code})
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatDateRange(request.start_date, request.end_date)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({request.days_count}일)
                </span>
              </div>
              
              {request.reason && (
                <div className="flex items-start gap-1 mt-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm text-muted-foreground">
                    {request.reason}
                  </span>
                </div>
              )}
            </div>
            
            {request.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleAction(request, 'reject')}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  거부
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction(request, 'approve')}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  승인
                </Button>
              </div>
            )}
            
            {request.status !== 'pending' && (
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant="secondary" 
                  className={
                    request.status === 'approved' 
                      ? 'bg-green-100 text-green-700'
                      : request.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  {request.status === 'approved' ? '승인됨' :
                   request.status === 'rejected' ? '거부됨' : '취소됨'}
                </Badge>
                {request.approved_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(request.approved_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
                {request.approver && (
                  <span className="text-xs text-muted-foreground">
                    처리자: {request.approver.name}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {request.rejection_reason && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>거부 사유:</strong> {request.rejection_reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            휴가 승인 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            휴가 승인 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                승인 대기 ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                전체 내역 ({allRequests.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  승인 대기 중인 휴가 신청이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(renderLeaveRequest)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4 mt-4">
              {allRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  휴가 신청 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {allRequests.map(renderLeaveRequest)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 거부 사유 입력 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 신청 거부</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="font-medium">{selectedRequest.employee?.name}님의 휴가 신청</div>
                  <div className="text-sm text-muted-foreground">
                    {leaveTypeLabels[selectedRequest.leave_type]} - {' '}
                    {formatDateRange(selectedRequest.start_date, selectedRequest.end_date)} ({selectedRequest.days_count}일)
                  </div>
                  {selectedRequest.reason && (
                    <div className="text-sm text-muted-foreground">
                      신청 사유: {selectedRequest.reason}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-sm font-medium">
                거부 사유 <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="휴가 신청을 거부하는 사유를 입력해주세요..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectWithReason}
                disabled={!rejectionReason.trim() || (selectedRequest ? processingIds.has(selectedRequest.id) : false)}
              >
                거부하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowRightLeft, Check, X, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SwapRequest {
  id: string
  requester: {
    id: string
    name: string
    avatar?: string
  }
  target: {
    id: string
    name: string
    avatar?: string
  }
  requestDate: Date
  swapDate: Date
  requesterShift: string
  targetShift: string
  status: 'pending' | 'accepted' | 'rejected' | 'approved'
  reason?: string
}

interface SwapRequestPanelProps {
  requests?: SwapRequest[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  currentUserId?: string
}

export function SwapRequestPanel({
  requests = [],
  onApprove,
  onReject,
  currentUserId
}: SwapRequestPanelProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'default' as const, label: '대기중', icon: <Clock className="h-3 w-3" /> },
      accepted: { variant: 'secondary' as const, label: '수락됨', icon: <Check className="h-3 w-3" /> },
      rejected: { variant: 'destructive' as const, label: '거절됨', icon: <X className="h-3 w-3" /> },
      approved: { variant: 'default' as const, label: '승인됨', icon: <Check className="h-3 w-3" /> }
    }
    const config = variants[status as keyof typeof variants] || variants.pending
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const getShiftBadge = (shift: string) => {
    const colors = {
      day: 'bg-blue-100 text-blue-800',
      evening: 'bg-orange-100 text-orange-800',
      night: 'bg-purple-100 text-purple-800',
      off: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      day: '주간',
      evening: '저녁',
      night: '야간',
      off: '휴무'
    }
    return (
      <Badge className={colors[shift as keyof typeof colors] || colors.day}>
        {labels[shift as keyof typeof labels] || shift}
      </Badge>
    )
  }

  // 임시 교환 요청 데이터
  const mockRequests: SwapRequest[] = [
    {
      id: '1',
      requester: { id: '1', name: '김철수' },
      target: { id: '2', name: '박영희' },
      requestDate: new Date(),
      swapDate: new Date(Date.now() + 86400000 * 3),
      requesterShift: 'night',
      targetShift: 'day',
      status: 'pending',
      reason: '개인 사정으로 주간 근무가 필요합니다.'
    },
    {
      id: '2',
      requester: { id: '3', name: '이민호' },
      target: { id: '4', name: '정수진' },
      requestDate: new Date(Date.now() - 86400000),
      swapDate: new Date(Date.now() + 86400000 * 7),
      requesterShift: 'evening',
      targetShift: 'off',
      status: 'accepted',
      reason: '가족 행사 참석'
    },
    {
      id: '3',
      requester: { id: '5', name: '최동욱' },
      target: { id: '6', name: '김지은' },
      requestDate: new Date(Date.now() - 86400000 * 2),
      swapDate: new Date(Date.now() + 86400000 * 5),
      requesterShift: 'day',
      targetShift: 'evening',
      status: 'pending'
    }
  ]

  const displayRequests = requests.length > 0 ? requests : mockRequests
  const pendingCount = displayRequests.filter(r => r.status === 'pending').length

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>교환 요청</CardTitle>
        <CardDescription>
          {pendingCount > 0 ? `처리 대기중 ${pendingCount}건` : '대기중인 요청이 없습니다'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {displayRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.requester.avatar} />
                      <AvatarFallback>{request.requester.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{request.requester.name}</span>
                    <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.target.avatar} />
                      <AvatarFallback>{request.target.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{request.target.name}</span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">교환일:</span>
                    <span className="font-medium">
                      {format(request.swapDate, 'MM월 dd일 (EEE)', { locale: ko })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getShiftBadge(request.requesterShift)}
                    <ArrowRightLeft className="h-3 w-3" />
                    {getShiftBadge(request.targetShift)}
                  </div>
                </div>

                {request.reason && (
                  <p className="text-sm text-gray-600 italic">"{request.reason}"</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {format(request.requestDate, 'MM월 dd일 HH:mm', { locale: ko })} 요청
                  </span>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReject?.(request.id)}
                      >
                        거절
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove?.(request.id)}
                      >
                        승인
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
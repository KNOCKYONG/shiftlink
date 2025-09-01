'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus,
  CalendarDays 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/types'

interface LeaveBalanceWidgetProps {
  onRequestLeave?: () => void
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

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
}

const statusLabels = {
  pending: '승인대기',
  approved: '승인됨',
  rejected: '거부됨',
  cancelled: '취소됨'
}

export function LeaveBalanceWidget({ onRequestLeave, className }: LeaveBalanceWidgetProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaveData()
  }, [])

  const fetchLeaveData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [balancesRes, requestsRes] = await Promise.all([
        fetch('/api/leaves/balance'),
        fetch('/api/leaves?status=pending&limit=5')
      ])

      if (!balancesRes.ok || !requestsRes.ok) {
        throw new Error('Failed to fetch leave data')
      }

      const balancesData = await balancesRes.json()
      const requestsData = await requestsRes.json()

      setBalances(balancesData.data || [])
      setPendingRequests(requestsData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  const calculateUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0
    return Math.min((used / total) * 100, 100)
  }

  const getBalanceStatus = (used: number, total: number) => {
    const percentage = calculateUsagePercentage(used, total)
    if (percentage >= 90) return { color: 'text-red-600', status: '부족' }
    if (percentage >= 70) return { color: 'text-yellow-600', status: '주의' }
    return { color: 'text-green-600', status: '충분' }
  }

  if (loading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            휴가 잔여 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const totalAnnualBalance = balances.find(b => b.leave_type === 'annual')
  const hasLowBalance = balances.some(balance => 
    calculateUsagePercentage(balance.used_days, balance.total_days) >= 90
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* 휴가 잔여 현황 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">휴가 잔여 현황</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">휴가 정보를 불러올 수 없습니다.</p>
            ) : (
              balances.map((balance) => {
                const percentage = calculateUsagePercentage(balance.used_days, balance.total_days)
                const status = getBalanceStatus(balance.used_days, balance.total_days)
                const remaining = balance.total_days - balance.used_days

                return (
                  <div key={balance.leave_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {leaveTypeLabels[balance.leave_type]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {remaining}일 남음
                        </span>
                        <Badge variant="outline" className={status.color}>
                          {status.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>사용: {balance.used_days}일</span>
                        <span>총: {balance.total_days}일</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 경고 메시지 */}
      {hasLowBalance && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            일부 휴가 종류의 잔여일수가 부족합니다. 계획적인 사용을 권장합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 최근 신청 내역 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">최근 신청 내역</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">최근 신청 내역이 없습니다.</p>
            ) : (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {leaveTypeLabels[request.leave_type]}
                      </span>
                      <Badge variant="secondary" className={statusColors[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {request.start_date} ~ {request.end_date} ({request.days_count}일)
                    </div>
                    {request.reason && (
                      <div className="text-xs text-muted-foreground">
                        사유: {request.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {request.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {request.status === 'rejected' && <XCircle className="h-4 w-4 text-red-600" />}
                    {request.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 휴가 신청 버튼 */}
      <Card>
        <CardContent className="p-4">
          <Button 
            onClick={onRequestLeave} 
            className="w-full" 
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            휴가 신청하기
          </Button>
        </CardContent>
      </Card>

      {/* 휴가 정보 */}
      {totalAnnualBalance && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">
                {totalAnnualBalance.total_days - totalAnnualBalance.used_days}일
              </div>
              <div className="text-sm text-muted-foreground">
                연차 잔여일수
              </div>
              <div className="text-xs text-muted-foreground">
                올해 총 {totalAnnualBalance.total_days}일 중 {totalAnnualBalance.used_days}일 사용
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
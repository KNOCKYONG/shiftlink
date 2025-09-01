'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  Moon,
  Sun,
  Sunset
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkTimeSummaryProps {
  employeeId?: string
  period?: 'daily' | 'weekly' | 'monthly'
  className?: string
}

interface WorkTimeData {
  total_hours: number
  regular_hours: number
  overtime_hours: number
  night_hours: number
  weekend_hours: number
  total_shifts: number
  day_shifts: number
  evening_shifts: number
  night_shifts: number
  weekly_limit_violations: number
  rest_time_violations: number
}

export function WorkTimeSummary({ employeeId, period = 'weekly', className }: WorkTimeSummaryProps) {
  const [workTimeData, setWorkTimeData] = useState<WorkTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkTimeData()
  }, [employeeId, period])

  const fetchWorkTimeData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        period,
        ...(employeeId && { employeeId })
      })

      const response = await fetch(`/api/monitoring/work-time?${params}`)
      if (!response.ok) throw new Error('Failed to fetch work time data')

      const data = await response.json()
      setWorkTimeData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work time data')
      // Set mock data for demo
      setWorkTimeData({
        total_hours: 42.5,
        regular_hours: 32,
        overtime_hours: 10.5,
        night_hours: 8,
        weekend_hours: 0,
        total_shifts: 5,
        day_shifts: 2,
        evening_shifts: 2,
        night_shifts: 1,
        weekly_limit_violations: 0,
        rest_time_violations: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const getHoursColor = (hours: number, limit: number) => {
    const percentage = (hours / limit) * 100
    if (percentage >= 100) return 'text-red-600'
    if (percentage >= 90) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (hours: number, limit: number) => {
    const percentage = (hours / limit) * 100
    if (percentage >= 100) return 'bg-red-600'
    if (percentage >= 90) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            근무시간 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workTimeData) {
    return null
  }

  const weeklyLimit = 52
  const weeklyWarning = 48
  const overtimeLimit = 12

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            근무시간 요약
          </div>
          <Badge variant="outline">
            {period === 'daily' ? '일간' : period === 'weekly' ? '주간' : '월간'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 총 근무시간 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">총 근무시간</span>
            <span className={cn("text-2xl font-bold", getHoursColor(workTimeData.total_hours, weeklyLimit))}>
              {workTimeData.total_hours.toFixed(1)}시간
            </span>
          </div>
          <Progress 
            value={(workTimeData.total_hours / weeklyLimit) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0시간</span>
            <span>주 52시간 한도</span>
          </div>
        </div>

        {/* 근무시간 내역 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">정규 근무</span>
            </div>
            <p className="text-xl font-semibold">{workTimeData.regular_hours.toFixed(1)}시간</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">초과 근무</span>
            </div>
            <p className={cn("text-xl font-semibold", workTimeData.overtime_hours > 0 && "text-orange-600")}>
              {workTimeData.overtime_hours.toFixed(1)}시간
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">야간 근무</span>
            </div>
            <p className="text-xl font-semibold">{workTimeData.night_hours.toFixed(1)}시간</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">주말 근무</span>
            </div>
            <p className="text-xl font-semibold">{workTimeData.weekend_hours.toFixed(1)}시간</p>
          </div>
        </div>

        {/* 교대 근무 분포 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">교대 근무 분포</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-blue-50 rounded">
              <Sun className="h-4 w-4 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-semibold">{workTimeData.day_shifts}</div>
              <div className="text-xs text-muted-foreground">주간</div>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <Sunset className="h-4 w-4 mx-auto mb-1 text-orange-600" />
              <div className="text-lg font-semibold">{workTimeData.evening_shifts}</div>
              <div className="text-xs text-muted-foreground">오후</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded">
              <Moon className="h-4 w-4 mx-auto mb-1 text-purple-600" />
              <div className="text-lg font-semibold">{workTimeData.night_shifts}</div>
              <div className="text-xs text-muted-foreground">야간</div>
            </div>
          </div>
        </div>

        {/* 규정 위반 경고 */}
        {(workTimeData.weekly_limit_violations > 0 || workTimeData.rest_time_violations > 0) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {workTimeData.weekly_limit_violations > 0 && (
                <div>주 52시간 초과: {workTimeData.weekly_limit_violations}회</div>
              )}
              {workTimeData.rest_time_violations > 0 && (
                <div>최소 휴식시간 위반: {workTimeData.rest_time_violations}회</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 초과근무 경고 */}
        {workTimeData.overtime_hours > overtimeLimit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              초과근무 시간이 {overtimeLimit}시간을 초과했습니다. 
              건강과 업무 효율을 위해 적절한 휴식이 필요합니다.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Coffee,
  Moon,
  Zap,
  Heart,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FatigueMonitorProps {
  employeeId?: string
  teamId?: string
  showRecommendations?: boolean
  className?: string
}

interface FatigueData {
  fatigue_score: number
  risk_level: 'low' | 'moderate' | 'high' | 'critical'
  consecutive_night_shifts: number
  consecutive_work_days: number
  hours_worked_7days: number
  hours_worked_30days: number
  factors: {
    night_shift_ratio: number
    overtime_ratio: number
    rest_time_average: number
    shift_pattern_changes: number
    weekend_work_count: number
  }
  recommendations: string[]
  trend: 'improving' | 'stable' | 'worsening'
}

const riskLevelConfig = {
  low: {
    label: '낮음',
    color: 'bg-green-100 text-green-700',
    icon: Heart,
    iconColor: 'text-green-600',
    progressColor: 'bg-green-600'
  },
  moderate: {
    label: '보통',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Coffee,
    iconColor: 'text-yellow-600',
    progressColor: 'bg-yellow-600'
  },
  high: {
    label: '높음',
    color: 'bg-orange-100 text-orange-700',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    progressColor: 'bg-orange-600'
  },
  critical: {
    label: '위험',
    color: 'bg-red-100 text-red-700',
    icon: Zap,
    iconColor: 'text-red-600',
    progressColor: 'bg-red-600'
  }
}

export function FatigueMonitor({ 
  employeeId, 
  teamId, 
  showRecommendations = true, 
  className 
}: FatigueMonitorProps) {
  const [fatigueData, setFatigueData] = useState<FatigueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFatigueData()
  }, [employeeId, teamId])

  const fetchFatigueData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (employeeId) params.append('employeeId', employeeId)
      if (teamId) params.append('teamId', teamId)

      const response = await fetch(`/api/monitoring/fatigue?${params}`)
      if (!response.ok) throw new Error('Failed to fetch fatigue data')

      const data = await response.json()
      setFatigueData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fatigue data')
      // Set mock data for demo
      setFatigueData({
        fatigue_score: 6.5,
        risk_level: 'high',
        consecutive_night_shifts: 3,
        consecutive_work_days: 7,
        hours_worked_7days: 48,
        hours_worked_30days: 185,
        factors: {
          night_shift_ratio: 0.4,
          overtime_ratio: 0.2,
          rest_time_average: 10.5,
          shift_pattern_changes: 3,
          weekend_work_count: 2
        },
        recommendations: [
          '연속 야간 근무를 줄이고 충분한 휴식을 취하세요',
          '다음 주에는 주간 근무 위주로 배정받는 것을 권장합니다',
          '수면 패턴을 일정하게 유지하도록 노력하세요'
        ],
        trend: 'worsening'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            피로도 모니터링
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

  if (!fatigueData) {
    return null
  }

  const riskConfig = riskLevelConfig[fatigueData.risk_level]
  const RiskIcon = riskConfig.icon

  return (
    <div className={cn("space-y-4", className)}>
      {/* 피로도 점수 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              피로도 지표
            </div>
            <div className="flex items-center gap-2">
              {fatigueData.trend === 'improving' && (
                <Badge variant="outline" className="bg-green-50">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  개선중
                </Badge>
              )}
              {fatigueData.trend === 'worsening' && (
                <Badge variant="outline" className="bg-red-50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  악화중
                </Badge>
              )}
              {fatigueData.trend === 'stable' && (
                <Badge variant="outline">
                  안정적
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 피로도 점수 */}
          <div className="text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="text-5xl font-bold">{fatigueData.fatigue_score.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground ml-2">/10</div>
            </div>
            <Badge className={cn("text-lg px-4 py-1", riskConfig.color)}>
              <RiskIcon className="h-4 w-4 mr-2" />
              위험도: {riskConfig.label}
            </Badge>
            <Progress 
              value={fatigueData.fatigue_score * 10} 
              className="h-3"
              style={{
                background: `linear-gradient(to right, 
                  rgb(34 197 94) 0%, 
                  rgb(250 204 21) 50%, 
                  rgb(239 68 68) 100%)`
              }}
            />
          </div>

          {/* 주요 지표 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">연속 야간</span>
              </div>
              <p className={cn(
                "text-2xl font-semibold",
                fatigueData.consecutive_night_shifts >= 3 && "text-orange-600"
              )}>
                {fatigueData.consecutive_night_shifts}일
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">연속 근무</span>
              </div>
              <p className={cn(
                "text-2xl font-semibold",
                fatigueData.consecutive_work_days >= 6 && "text-orange-600"
              )}>
                {fatigueData.consecutive_work_days}일
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">7일 근무시간</span>
              <p className={cn(
                "text-xl font-semibold",
                fatigueData.hours_worked_7days > 52 && "text-red-600"
              )}>
                {fatigueData.hours_worked_7days.toFixed(1)}시간
              </p>
            </div>
            
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">30일 근무시간</span>
              <p className="text-xl font-semibold">
                {fatigueData.hours_worked_30days.toFixed(1)}시간
              </p>
            </div>
          </div>

          {/* 기여 요인 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">피로도 기여 요인</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">야간 근무 비율</span>
                <span className="font-medium">
                  {(fatigueData.factors.night_shift_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={fatigueData.factors.night_shift_ratio * 100} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">초과 근무 비율</span>
                <span className="font-medium">
                  {(fatigueData.factors.overtime_ratio * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={fatigueData.factors.overtime_ratio * 100} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">평균 휴식시간</span>
                <span className="font-medium">
                  {fatigueData.factors.rest_time_average.toFixed(1)}시간
                </span>
              </div>
              <Progress 
                value={(fatigueData.factors.rest_time_average / 11) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 권장사항 */}
      {showRecommendations && fatigueData.recommendations.length > 0 && (
        <Alert className={fatigueData.risk_level === 'critical' ? 'border-red-600' : ''}>
          <Info className="h-4 w-4" />
          <AlertTitle>피로 관리 권장사항</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {fatigueData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 위험 경고 */}
      {fatigueData.risk_level === 'critical' && (
        <Alert variant="destructive">
          <Zap className="h-4 w-4" />
          <AlertTitle>높은 피로도 경고</AlertTitle>
          <AlertDescription>
            현재 피로도가 위험 수준입니다. 즉시 충분한 휴식을 취하고, 
            필요시 관리자와 상담하여 근무 일정을 조정하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 액션 버튼 */}
      {fatigueData.risk_level === 'high' || fatigueData.risk_level === 'critical' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Coffee className="h-4 w-4 mr-2" />
                휴식 요청
              </Button>
              <Button variant="outline" className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                일정 조정 요청
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
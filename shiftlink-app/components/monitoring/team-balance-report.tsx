'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Award, 
  BarChart3, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Star,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamBalanceReportProps {
  teamId: string
  className?: string
}

interface TeamBalanceData {
  total_members: number
  seniority_distribution: {
    junior: { count: number; percentage: number }
    intermediate: { count: number; percentage: number }
    senior: { count: number; percentage: number }
    lead: { count: number; percentage: number }
  }
  average_skill_level: number
  skill_diversity_index: number
  seniority_balance_score: number
  skill_balance_score: number
  shift_balance_score: number
  overall_balance_score: number
  shift_coverage: {
    day: { senior: number; junior: number }
    evening: { senior: number; junior: number }
    night: { senior: number; junior: number }
  }
  imbalances: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  recommendations: string[]
}

const seniorityColors = {
  junior: 'bg-blue-100 text-blue-700',
  intermediate: 'bg-green-100 text-green-700',
  senior: 'bg-purple-100 text-purple-700',
  lead: 'bg-orange-100 text-orange-700'
}

const seniorityIcons = {
  junior: User,
  intermediate: Star,
  senior: Award,
  lead: Shield
}

export function TeamBalanceReport({ teamId, className }: TeamBalanceReportProps) {
  const [balanceData, setBalanceData] = useState<TeamBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamBalance()
  }, [teamId])

  const fetchTeamBalance = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/monitoring/team-balance?teamId=${teamId}`)
      if (!response.ok) throw new Error('Failed to fetch team balance data')

      const data = await response.json()
      setBalanceData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team balance')
      // Set mock data for demo
      setBalanceData({
        total_members: 15,
        seniority_distribution: {
          junior: { count: 5, percentage: 33.3 },
          intermediate: { count: 6, percentage: 40 },
          senior: { count: 3, percentage: 20 },
          lead: { count: 1, percentage: 6.7 }
        },
        average_skill_level: 6.2,
        skill_diversity_index: 7.5,
        seniority_balance_score: 75,
        skill_balance_score: 82,
        shift_balance_score: 68,
        overall_balance_score: 75,
        shift_coverage: {
          day: { senior: 2, junior: 3 },
          evening: { senior: 1, junior: 4 },
          night: { senior: 0, junior: 3 }
        },
        imbalances: [
          {
            type: 'shift_coverage',
            severity: 'high',
            description: '야간 근무에 시니어 직원이 배치되지 않음'
          },
          {
            type: 'seniority',
            severity: 'medium',
            description: '주니어 직원 비율이 높음'
          }
        ],
        recommendations: [
          '야간 근무에 최소 1명의 시니어 직원 배치 필요',
          '신입 직원을 위한 멘토링 프로그램 강화 권장',
          '교대별 숙련도 균형을 위한 재배치 검토'
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            팀 균형 리포트
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

  if (!balanceData) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 전체 균형 점수 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              팀 균형 리포트
            </div>
            <Badge className={getScoreBadgeColor(balanceData.overall_balance_score)}>
              종합 점수: {balanceData.overall_balance_score.toFixed(0)}/100
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 균형 점수 요약 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">연차 균형</div>
              <div className={cn("text-2xl font-bold", getScoreColor(balanceData.seniority_balance_score))}>
                {balanceData.seniority_balance_score.toFixed(0)}
              </div>
              <Progress value={balanceData.seniority_balance_score} className="h-2" />
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">숙련도 균형</div>
              <div className={cn("text-2xl font-bold", getScoreColor(balanceData.skill_balance_score))}>
                {balanceData.skill_balance_score.toFixed(0)}
              </div>
              <Progress value={balanceData.skill_balance_score} className="h-2" />
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-sm text-muted-foreground">교대 균형</div>
              <div className={cn("text-2xl font-bold", getScoreColor(balanceData.shift_balance_score))}>
                {balanceData.shift_balance_score.toFixed(0)}
              </div>
              <Progress value={balanceData.shift_balance_score} className="h-2" />
            </div>
          </div>

          {/* 팀 구성 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              팀 구성 ({balanceData.total_members}명)
            </h4>
            <div className="space-y-2">
              {Object.entries(balanceData.seniority_distribution).map(([level, data]) => {
                const Icon = seniorityIcons[level as keyof typeof seniorityIcons]
                return (
                  <div key={level} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary" className={seniorityColors[level as keyof typeof seniorityColors]}>
                      {level === 'junior' ? '주니어' : 
                       level === 'intermediate' ? '중급' :
                       level === 'senior' ? '시니어' : '리드'}
                    </Badge>
                    <div className="flex-1 flex items-center gap-2">
                      <Progress value={data.percentage} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-16 text-right">
                        {data.count}명
                      </span>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        ({data.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 교대별 커버리지 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">교대별 숙련도 분포</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-sm font-medium mb-2">주간</div>
                <div className="flex justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    시니어 {balanceData.shift_coverage.day.senior}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    주니어 {balanceData.shift_coverage.day.junior}
                  </Badge>
                </div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-sm font-medium mb-2">오후</div>
                <div className="flex justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    시니어 {balanceData.shift_coverage.evening.senior}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    주니어 {balanceData.shift_coverage.evening.junior}
                  </Badge>
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-sm font-medium mb-2">야간</div>
                <div className="flex justify-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    시니어 {balanceData.shift_coverage.night.senior}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    주니어 {balanceData.shift_coverage.night.junior}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 숙련도 지표 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">평균 숙련도</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{balanceData.average_skill_level.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">/10</div>
              </div>
              <Progress value={balanceData.average_skill_level * 10} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">숙련도 다양성</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{balanceData.skill_diversity_index.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">/10</div>
              </div>
              <Progress value={balanceData.skill_diversity_index * 10} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 불균형 경고 */}
      {balanceData.imbalances.length > 0 && (
        <Alert variant={balanceData.imbalances.some(i => i.severity === 'high') ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">발견된 불균형</div>
            <ul className="space-y-1">
              {balanceData.imbalances.map((imbalance, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      imbalance.severity === 'high' && 'border-red-600 text-red-600',
                      imbalance.severity === 'medium' && 'border-yellow-600 text-yellow-600',
                      imbalance.severity === 'low' && 'border-blue-600 text-blue-600'
                    )}
                  >
                    {imbalance.severity === 'high' ? '높음' : 
                     imbalance.severity === 'medium' ? '중간' : '낮음'}
                  </Badge>
                  <span className="text-sm">{imbalance.description}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 권장사항 */}
      {balanceData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              개선 권장사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {balanceData.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
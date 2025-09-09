'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Gauge,
  PieChart,
  Calendar,
  Clock,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  team: string
  totalShifts: number
  dayShifts: number
  eveningShifts: number
  nightShifts: number
  weekendShifts: number
  totalHours: number
  overtimeHours: number
}

interface TeamFairness {
  teamName: string
  memberCount: number
  avgShiftsPerMember: number
  avgHoursPerMember: number
  fairnessScore: number
  giniCoefficient: number
}

interface FairnessMetrics {
  overallGini: number
  targetGini: number
  fairnessScore: number
  workloadVariance: number
  shiftDistributionBalance: number
  employeeFairness: Employee[]
  teamFairness: TeamFairness[]
  recommendations: Array<{
    type: 'critical' | 'warning' | 'suggestion'
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
  }>
}

interface FairnessAnalysisDashboardProps {
  metrics: FairnessMetrics
  scheduleId?: string
  scheduleName?: string
  generatedAt?: string
}

export function FairnessAnalysisDashboard({
  metrics,
  scheduleId,
  scheduleName,
  generatedAt
}: FairnessAnalysisDashboardProps) {
  // 공정성 등급 계산
  const getFairnessGrade = (gini: number): { grade: string; color: string; description: string } => {
    if (gini <= 0.2) return { grade: 'A+', color: 'text-green-600', description: '매우 공정' }
    if (gini <= 0.3) return { grade: 'A', color: 'text-blue-600', description: '공정' }
    if (gini <= 0.4) return { grade: 'B', color: 'text-yellow-600', description: '보통' }
    if (gini <= 0.5) return { grade: 'C', color: 'text-orange-600', description: '주의 필요' }
    return { grade: 'D', color: 'text-red-600', description: '불공정' }
  }

  // 변화 방향 아이콘
  const getTrendIcon = (current: number, target: number) => {
    if (current < target) return <ArrowUp className="h-4 w-4 text-green-600" />
    if (current > target) return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  // 개선도 계산
  const improvementPercent = Math.round(((metrics.targetGini - metrics.overallGini) / metrics.targetGini) * 100)
  
  // 상위/하위 성과자
  const sortedEmployees = [...metrics.employeeFairness].sort((a, b) => b.totalHours - a.totalHours)
  const topPerformers = sortedEmployees.slice(0, 3)
  const bottomPerformers = sortedEmployees.slice(-3).reverse()

  // 팀별 공정성 순위
  const rankedTeams = [...metrics.teamFairness].sort((a, b) => a.giniCoefficient - b.giniCoefficient)

  const fairnessGrade = getFairnessGrade(metrics.overallGini)

  return (
    <div className="space-y-6">
      {/* 📊 헤더 및 전체 점수 */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                공정성 분석 대시보드
              </CardTitle>
              <CardDescription className="mt-1">
                {scheduleName && `${scheduleName} • `}
                Gini 계수 기반 업무 분배 공정성 분석 결과
                {generatedAt && ` • ${generatedAt}`}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">전체 공정성 등급</div>
              <div className={`text-3xl font-bold ${fairnessGrade.color}`}>
                {fairnessGrade.grade}
              </div>
              <div className="text-sm text-gray-600">{fairnessGrade.description}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 🎯 핵심 지표 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Gini 계수</p>
                <p className="text-2xl font-bold text-green-800">{metrics.overallGini.toFixed(3)}</p>
                <p className="text-xs text-green-600">목표: {metrics.targetGini.toFixed(3)}</p>
              </div>
              <div className="flex flex-col items-center">
                <Target className="h-8 w-8 text-green-600" />
                {getTrendIcon(metrics.overallGini, metrics.targetGini)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">공정성 점수</p>
                <p className="text-2xl font-bold text-blue-800">{metrics.fairnessScore}점</p>
                <p className="text-xs text-blue-600">100점 만점</p>
              </div>
              <div className="flex flex-col items-center">
                <Gauge className="h-8 w-8 text-blue-600" />
                <Progress value={metrics.fairnessScore} className="w-12 h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">업무량 분산</p>
                <p className="text-2xl font-bold text-purple-800">{metrics.workloadVariance.toFixed(2)}</p>
                <p className="text-xs text-purple-600">낮을수록 균등</p>
              </div>
              <div className="flex flex-col items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <Badge 
                  variant={metrics.workloadVariance < 0.3 ? "default" : "destructive"}
                  className="text-xs mt-1"
                >
                  {metrics.workloadVariance < 0.3 ? "양호" : "주의"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">시프트 균형</p>
                <p className="text-2xl font-bold text-orange-800">{Math.round(metrics.shiftDistributionBalance)}%</p>
                <p className="text-xs text-orange-600">분배 균형도</p>
              </div>
              <div className="flex flex-col items-center">
                <PieChart className="h-8 w-8 text-orange-600" />
                <Badge 
                  variant={metrics.shiftDistributionBalance >= 80 ? "default" : "secondary"}
                  className="text-xs mt-1"
                >
                  {metrics.shiftDistributionBalance >= 80 ? "균형" : "불균형"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📈 세부 분석 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 직원별 공정성 순위 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              직원별 업무량 분석
            </CardTitle>
            <CardDescription>
              총 근무시간 기준 상위/하위 직원 현황
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                <ArrowUp className="h-4 w-4" />
                상위 근무자 (많은 근무)
              </h4>
              <div className="space-y-2">
                {topPerformers.map((employee, index) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-600">{employee.team}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">{employee.totalHours}h</div>
                      <div className="text-xs text-gray-500">{employee.totalShifts}회</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                <ArrowDown className="h-4 w-4" />
                하위 근무자 (적은 근무)
              </h4>
              <div className="space-y-2">
                {bottomPerformers.map((employee, index) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {sortedEmployees.length - index}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{employee.name}</div>
                        <div className="text-xs text-gray-600">{employee.team}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-700">{employee.totalHours}h</div>
                      <div className="text-xs text-gray-500">{employee.totalShifts}회</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 팀별 공정성 분석 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              팀별 공정성 순위
            </CardTitle>
            <CardDescription>
              팀 내 업무 분배 공정성 Gini 계수 기준
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankedTeams.map((team, index) => {
              const teamGrade = getFairnessGrade(team.giniCoefficient)
              return (
                <div key={team.teamName} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={index === 0 ? "default" : "outline"} 
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{team.teamName}</div>
                        <div className="text-xs text-gray-600">{team.memberCount}명</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${teamGrade.color}`}>
                        {teamGrade.grade}
                      </div>
                      <div className="text-xs text-gray-500">
                        Gini {team.giniCoefficient.toFixed(3)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div>평균 근무: {team.avgShiftsPerMember.toFixed(1)}회</div>
                    <div>평균 시간: {team.avgHoursPerMember.toFixed(1)}시간</div>
                  </div>
                  <Progress 
                    value={team.fairnessScore} 
                    className="mt-2 h-2" 
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 💡 개선 권장사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            AI 기반 개선 권장사항
          </CardTitle>
          <CardDescription>
            현재 스케줄의 공정성 향상을 위한 구체적인 개선 방안
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.recommendations.map((recommendation, index) => (
            <Alert 
              key={index}
              className={`${
                recommendation.type === 'critical' ? 'border-red-200 bg-red-50' :
                recommendation.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  recommendation.type === 'critical' ? 'text-red-600' :
                  recommendation.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {recommendation.type === 'critical' ? <AlertTriangle className="h-4 w-4" /> :
                   recommendation.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                   <CheckCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`font-medium ${
                      recommendation.type === 'critical' ? 'text-red-800' :
                      recommendation.type === 'warning' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {recommendation.title}
                    </div>
                    <Badge 
                      variant={
                        recommendation.impact === 'high' ? 'destructive' :
                        recommendation.impact === 'medium' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {recommendation.impact === 'high' ? '높은 영향' :
                       recommendation.impact === 'medium' ? '중간 영향' : '낮은 영향'}
                    </Badge>
                  </div>
                  <div className={`text-sm ${
                    recommendation.type === 'critical' ? 'text-red-600' :
                    recommendation.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {recommendation.description}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* 📊 요약 통계 */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {metrics.employeeFairness.length}
              </div>
              <div className="text-sm text-gray-600">총 분석 직원</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {metrics.teamFairness.length}
              </div>
              <div className="text-sm text-gray-600">분석 팀 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {improvementPercent >= 0 ? `+${improvementPercent}` : improvementPercent}%
              </div>
              <div className="text-sm text-gray-600">목표 대비 개선도</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {metrics.recommendations.length}
              </div>
              <div className="text-sm text-gray-600">개선 권장사항</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
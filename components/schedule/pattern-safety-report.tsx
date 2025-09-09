'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Moon,
  Sun,
  Calendar,
  TrendingDown,
  TrendingUp,
  Activity,
  Heart,
  Brain,
  Zap,
  Target,
  Users,
  Timer,
  AlertCircle
} from 'lucide-react'

interface DangerousPattern {
  id: string
  employeeId: string
  employeeName: string
  team: string
  patternType: 'day_night_off' | 'consecutive_nights' | 'excessive_changes' | 'insufficient_rest' | 'weekend_overload' | 'overtime_fatigue'
  patternName: string
  description: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  healthImpact: string
  dates: string[]
  shiftSequence: string[]
  recommendedAction: string
  safetyScore: number
}

interface EmployeeSafetyProfile {
  employeeId: string
  employeeName: string
  team: string
  overallSafetyScore: number
  totalPatterns: number
  criticalPatterns: number
  highRiskPatterns: number
  riskFactors: string[]
  recommendations: string[]
  fatigueIndex: number
  recoveryTime: number
}

interface TeamSafetyMetrics {
  teamName: string
  memberCount: number
  averageSafetyScore: number
  totalDangerousPatterns: number
  criticalPatterns: number
  highRiskPatterns: number
  complianceRate: number
  riskLevel: 'safe' | 'caution' | 'dangerous' | 'critical'
}

interface PatternSafetyMetrics {
  overallSafetyScore: number
  complianceRate: number
  totalDangerousPatterns: number
  patternsByType: Record<string, number>
  employeeSafety: EmployeeSafetyProfile[]
  teamSafety: TeamSafetyMetrics[]
  dangerousPatterns: DangerousPattern[]
  safetyRecommendations: Array<{
    priority: 'immediate' | 'urgent' | 'moderate' | 'low'
    category: 'regulatory' | 'health' | 'operational' | 'preventive'
    title: string
    description: string
    affectedEmployees: string[]
    estimatedImpact: string
    actionRequired: string
  }>
}

interface PatternSafetyReportProps {
  metrics: PatternSafetyMetrics
  scheduleId?: string
  scheduleName?: string
  generatedAt?: string
}

export function PatternSafetyReport({
  metrics,
  scheduleId,
  scheduleName,
  generatedAt
}: PatternSafetyReportProps) {
  
  // 안전성 등급 계산
  const getSafetyGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 90) return { grade: 'A+', color: 'text-green-600', description: '매우 안전' }
    if (score >= 80) return { grade: 'A', color: 'text-blue-600', description: '안전' }
    if (score >= 70) return { grade: 'B', color: 'text-yellow-600', description: '주의' }
    if (score >= 60) return { grade: 'C', color: 'text-orange-600', description: '위험' }
    return { grade: 'D', color: 'text-red-600', description: '매우 위험' }
  }

  // 위험도별 아이콘
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />
      default: return <Shield className="h-4 w-4 text-gray-600" />
    }
  }

  // 패턴 유형별 한글명 및 아이콘
  const getPatternInfo = (type: string) => {
    const patterns = {
      day_night_off: { name: '데이나오 패턴', icon: <Moon className="h-4 w-4" />, color: 'text-red-600' },
      consecutive_nights: { name: '연속 야간근무', icon: <Moon className="h-4 w-4" />, color: 'text-purple-600' },
      excessive_changes: { name: '과도한 교대', icon: <Activity className="h-4 w-4" />, color: 'text-orange-600' },
      insufficient_rest: { name: '휴식 부족', icon: <Timer className="h-4 w-4" />, color: 'text-red-600' },
      weekend_overload: { name: '주말 과로', icon: <Calendar className="h-4 w-4" />, color: 'text-yellow-600' },
      overtime_fatigue: { name: '과로 위험', icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-600' }
    }
    return patterns[type as keyof typeof patterns] || { name: type, icon: <Shield className="h-4 w-4" />, color: 'text-gray-600' }
  }

  // 팀별 위험도 순위
  const rankedTeams = [...metrics.teamSafety].sort((a, b) => a.averageSafetyScore - b.averageSafetyScore)
  
  // 가장 위험한 직원들
  const highRiskEmployees = metrics.employeeSafety
    .filter(emp => emp.overallSafetyScore < 70)
    .sort((a, b) => a.overallSafetyScore - b.overallSafetyScore)
    .slice(0, 5)

  const safetyGrade = getSafetyGrade(metrics.overallSafetyScore)

  return (
    <div className="space-y-6">
      {/* 🛡️ 헤더 및 전체 안전성 점수 */}
      <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-6 w-6 text-red-600" />
                패턴 안전성 분석 리포트
              </CardTitle>
              <CardDescription className="mt-1">
                {scheduleName && `${scheduleName} • `}
                한국 간호사 근무 패턴 안전성 및 위험 요소 분석
                {generatedAt && ` • ${generatedAt}`}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">전체 안전성 등급</div>
              <div className={`text-3xl font-bold ${safetyGrade.color}`}>
                {safetyGrade.grade}
              </div>
              <div className="text-sm text-gray-600">{safetyGrade.description}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 🚨 핵심 안전 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">전체 안전성 점수</p>
                <p className="text-2xl font-bold text-red-800">{metrics.overallSafetyScore}점</p>
                <p className="text-xs text-red-600">100점 만점</p>
              </div>
              <div className="flex flex-col items-center">
                <Shield className="h-8 w-8 text-red-600" />
                <Progress value={metrics.overallSafetyScore} className="w-12 h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">위험 패턴 수</p>
                <p className="text-2xl font-bold text-orange-800">{metrics.totalDangerousPatterns}건</p>
                <p className="text-xs text-orange-600">즉시 조치 필요</p>
              </div>
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <Badge 
                  variant={metrics.totalDangerousPatterns === 0 ? "default" : "destructive"}
                  className="text-xs mt-1"
                >
                  {metrics.totalDangerousPatterns === 0 ? "양호" : "위험"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">규정 준수율</p>
                <p className="text-2xl font-bold text-blue-800">{Math.round(metrics.complianceRate)}%</p>
                <p className="text-xs text-blue-600">근로기준법 기준</p>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                <Progress value={metrics.complianceRate} className="w-12 h-2 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">치명적 패턴</p>
                <p className="text-2xl font-bold text-purple-800">
                  {metrics.dangerousPatterns.filter(p => p.riskLevel === 'critical').length}건
                </p>
                <p className="text-xs text-purple-600">즉시 수정 필요</p>
              </div>
              <div className="flex flex-col items-center">
                <XCircle className="h-8 w-8 text-purple-600" />
                <Badge variant="destructive" className="text-xs mt-1">
                  긴급
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📊 패턴 유형별 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            위험 패턴 유형별 분석
          </CardTitle>
          <CardDescription>
            발견된 위험 패턴을 유형별로 분류하여 분석
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.patternsByType).map(([type, count]) => {
              const patternInfo = getPatternInfo(type)
              const criticalCount = metrics.dangerousPatterns.filter(p => p.patternType === type && p.riskLevel === 'critical').length
              
              return (
                <div key={type} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={patternInfo.color}>
                        {patternInfo.icon}
                      </div>
                      <span className="font-medium">{patternInfo.name}</span>
                    </div>
                    <Badge 
                      variant={count === 0 ? "default" : criticalCount > 0 ? "destructive" : "secondary"}
                    >
                      {count}건
                    </Badge>
                  </div>
                  {count > 0 && (
                    <div className="space-y-1 text-sm">
                      {criticalCount > 0 && (
                        <div className="text-red-600">• 치명적: {criticalCount}건</div>
                      )}
                      <div className="text-gray-600">
                        • 총 발견: {count}건
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ⚠️ 위험 직원 및 팀 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 고위험 직원 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              고위험 직원 모니터링
            </CardTitle>
            <CardDescription>
              안전성 점수가 낮거나 위험 패턴이 많은 직원들
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highRiskEmployees.length > 0 ? (
              highRiskEmployees.map((employee, index) => (
                <div key={employee.employeeId} className="p-3 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="destructive" 
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-red-800">{employee.employeeName}</div>
                        <div className="text-xs text-red-600">{employee.team}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-700">{employee.overallSafetyScore}점</div>
                      <div className="text-xs text-red-600">
                        {employee.criticalPatterns}개 위험패턴
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-red-600">
                      <strong>위험 요소:</strong> {employee.riskFactors.slice(0, 2).join(', ')}
                    </div>
                    <div className="text-xs text-red-700">
                      <strong>피로도 지수:</strong> {employee.fatigueIndex}/10
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-green-600">
                <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                <p>현재 고위험 직원이 없습니다.</p>
                <p className="text-xs text-green-500">모든 직원이 안전 기준을 충족하고 있습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 팀별 안전성 순위 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              팀별 안전성 순위
            </CardTitle>
            <CardDescription>
              팀별 평균 안전성 점수 및 위험도 분석
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankedTeams.map((team, index) => {
              const isRisky = team.averageSafetyScore < 70
              const riskColor = team.riskLevel === 'critical' ? 'red' :
                               team.riskLevel === 'dangerous' ? 'orange' :
                               team.riskLevel === 'caution' ? 'yellow' : 'green'
              
              return (
                <div key={team.teamName} className={`p-3 border rounded-lg ${
                  isRisky ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={index === rankedTeams.length - 1 ? "default" : isRisky ? "destructive" : "secondary"}
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
                      <div className={`font-bold ${isRisky ? 'text-orange-700' : 'text-green-700'}`}>
                        {Math.round(team.averageSafetyScore)}점
                      </div>
                      <div className="text-xs text-gray-600">
                        위험패턴 {team.totalDangerousPatterns}건
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>준수율: {Math.round(team.complianceRate)}%</span>
                    <Badge 
                      variant={team.riskLevel === 'safe' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {team.riskLevel === 'safe' ? '안전' :
                       team.riskLevel === 'caution' ? '주의' :
                       team.riskLevel === 'dangerous' ? '위험' : '치명적'}
                    </Badge>
                  </div>
                  <Progress 
                    value={team.averageSafetyScore} 
                    className="mt-2 h-2" 
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* 🚨 상세 위험 패턴 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            발견된 위험 패턴 상세 분석
          </CardTitle>
          <CardDescription>
            각 위험 패턴에 대한 상세 정보 및 권장 조치사항
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.dangerousPatterns.map((pattern) => {
            const patternInfo = getPatternInfo(pattern.patternType)
            
            return (
              <div 
                key={pattern.id}
                className={`p-4 border rounded-lg ${
                  pattern.riskLevel === 'critical' ? 'bg-red-50 border-red-200' :
                  pattern.riskLevel === 'high' ? 'bg-orange-50 border-orange-200' :
                  pattern.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getRiskIcon(pattern.riskLevel)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${patternInfo.color}`}>
                        {pattern.employeeName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {pattern.team}
                      </Badge>
                      <Badge 
                        variant={pattern.riskLevel === 'critical' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {pattern.riskLevel === 'critical' ? '치명적' :
                         pattern.riskLevel === 'high' ? '높음' :
                         pattern.riskLevel === 'medium' ? '중간' : '낮음'}
                      </Badge>
                    </div>
                    <div className="font-medium text-gray-800 mb-1">
                      {patternInfo.name}: {pattern.patternName}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {pattern.description}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-gray-700">건강 영향:</strong>
                        <div className="text-red-600">{pattern.healthImpact}</div>
                      </div>
                      <div>
                        <strong className="text-gray-700">권장 조치:</strong>
                        <div className="text-blue-600">{pattern.recommendedAction}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <strong>해당 날짜:</strong> {pattern.dates.join(', ')}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <strong>시프트 순서:</strong> {pattern.shiftSequence.join(' → ')}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 💡 안전성 개선 권장사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            안전성 개선 권장사항
          </CardTitle>
          <CardDescription>
            근로자 건강과 안전을 위한 구체적인 개선 방안
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.safetyRecommendations.map((recommendation, index) => (
            <Alert 
              key={index}
              className={`${
                recommendation.priority === 'immediate' ? 'border-red-200 bg-red-50' :
                recommendation.priority === 'urgent' ? 'border-orange-200 bg-orange-50' :
                recommendation.priority === 'moderate' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  recommendation.priority === 'immediate' ? 'text-red-600' :
                  recommendation.priority === 'urgent' ? 'text-orange-600' :
                  recommendation.priority === 'moderate' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {recommendation.priority === 'immediate' ? <XCircle className="h-4 w-4" /> :
                   recommendation.priority === 'urgent' ? <AlertTriangle className="h-4 w-4" /> :
                   recommendation.priority === 'moderate' ? <AlertCircle className="h-4 w-4" /> :
                   <CheckCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`font-medium ${
                      recommendation.priority === 'immediate' ? 'text-red-800' :
                      recommendation.priority === 'urgent' ? 'text-orange-800' :
                      recommendation.priority === 'moderate' ? 'text-yellow-800' :
                      'text-blue-800'
                    }`}>
                      {recommendation.title}
                    </div>
                    <Badge 
                      variant={
                        recommendation.priority === 'immediate' ? 'destructive' :
                        recommendation.priority === 'urgent' ? 'destructive' :
                        recommendation.priority === 'moderate' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {recommendation.priority === 'immediate' ? '즉시' :
                       recommendation.priority === 'urgent' ? '긴급' :
                       recommendation.priority === 'moderate' ? '보통' : '낮음'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {recommendation.category === 'regulatory' ? '법적' :
                       recommendation.category === 'health' ? '건강' :
                       recommendation.category === 'operational' ? '운영' : '예방'}
                    </Badge>
                  </div>
                  <div className={`text-sm mb-2 ${
                    recommendation.priority === 'immediate' ? 'text-red-600' :
                    recommendation.priority === 'urgent' ? 'text-orange-600' :
                    recommendation.priority === 'moderate' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {recommendation.description}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>영향받는 직원:</strong>
                      <div>{recommendation.affectedEmployees.join(', ')}</div>
                    </div>
                    <div>
                      <strong>예상 효과:</strong>
                      <div>{recommendation.estimatedImpact}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <strong>필요 조치:</strong> {recommendation.actionRequired}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* 📊 안전성 요약 통계 */}
      <Card className="bg-gradient-to-r from-gray-50 to-red-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {metrics.employeeSafety.length}
              </div>
              <div className="text-sm text-gray-600">총 분석 직원</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {metrics.teamSafety.length}
              </div>
              <div className="text-sm text-gray-600">분석 팀 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.dangerousPatterns.filter(p => p.riskLevel === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">치명적 패턴</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {Math.round(metrics.complianceRate)}%
              </div>
              <div className="text-sm text-gray-600">규정 준수율</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
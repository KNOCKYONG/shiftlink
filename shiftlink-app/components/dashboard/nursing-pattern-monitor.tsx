'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Users, 
  Clock,
  RefreshCw,
  Download
} from 'lucide-react'
import { NursingPatternAnalysis, NursingPatternAnalyzer } from '@/lib/scheduler/nursing-pattern-analyzer'

interface NursingPatternMonitorProps {
  tenantId: string
  teamId?: string
  employeeAssignments?: Array<{
    employee_id: string
    employee_name: string
    assignments: Array<{
      date: string
      shift_type: string
      leave_type?: string
    }>
  }>
}

export function NursingPatternMonitor({ tenantId, teamId, employeeAssignments = [] }: NursingPatternMonitorProps) {
  const [analyses, setAnalyses] = useState<NursingPatternAnalysis[]>([])
  const [teamSummary, setTeamSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)

  const analyzer = new NursingPatternAnalyzer()

  useEffect(() => {
    if (employeeAssignments.length > 0) {
      analyzePatterns()
    }
  }, [employeeAssignments])

  const analyzePatterns = async () => {
    setLoading(true)
    
    try {
      const newAnalyses = employeeAssignments.map(emp => 
        analyzer.analyzeEmployeePattern(emp.employee_id, emp.employee_name, emp.assignments)
      )
      
      setAnalyses(newAnalyses)
      
      if (newAnalyses.length > 0) {
        const summary = analyzer.analyzeTeamPatterns(newAnalyses)
        setTeamSummary(summary)
      }
    } catch (error) {
      console.error('Pattern analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Clock className="h-4 w-4" />
      case 'low':
        return <Shield className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const selectedAnalysis = selectedEmployee 
    ? analyses.find(a => a.employee_id === selectedEmployee)
    : null

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            패턴 분석 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 팀 전체 요약 */}
      {teamSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 직원</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamSummary.total_employees}명</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">위험 상태</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {teamSummary.risk_distribution.critical + teamSummary.risk_distribution.high}명
              </div>
              <div className="text-xs text-muted-foreground">
                고위험 이상 직원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">팀 위험도</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamSummary.team_risk_score}점</div>
              <Progress value={teamSummary.team_risk_score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">안전 직원</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {teamSummary.risk_distribution.low}명
              </div>
              <div className="text-xs text-muted-foreground">
                저위험 직원
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 긴급 알림 */}
      {teamSummary?.urgent_recommendations.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">긴급 조치 필요</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {teamSummary.urgent_recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-red-700">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 상세 분석 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overview">전체 현황</TabsTrigger>
            <TabsTrigger value="individuals">개별 분석</TabsTrigger>
            <TabsTrigger value="patterns">패턴 분석</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={analyzePatterns}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 위험도별 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>위험도 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(teamSummary?.risk_distribution || {}).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getRiskLevelIcon(level)}
                        <span className="capitalize">{level}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{count}명</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getRiskLevelColor(level).split(' ')[0]}`}
                            style={{ width: `${(count / teamSummary.total_employees) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 공통 문제점 */}
            <Card>
              <CardHeader>
                <CardTitle>주요 문제점</CardTitle>
                <CardDescription>팀에서 자주 발견되는 위험 패턴</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamSummary?.common_issues.slice(0, 5).map((issue: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div>
                        <div className="font-medium">{getIssueTypeLabel(issue.issue_type)}</div>
                        <div className="text-sm text-gray-600">{issue.employees.length}명 영향</div>
                      </div>
                      <Badge variant="secondary">{issue.count}건</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individuals">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 직원 목록 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>직원별 위험도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyses
                    .sort((a, b) => b.risk_score - a.risk_score)
                    .map((analysis) => (
                      <div 
                        key={analysis.employee_id}
                        className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                          selectedEmployee === analysis.employee_id 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => setSelectedEmployee(analysis.employee_id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{analysis.employee_name}</span>
                          <Badge className={getRiskLevelColor(analysis.risk_level)}>
                            {analysis.risk_score}점
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {analysis.korean_pattern}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 선택된 직원 상세 분석 */}
            <div className="lg:col-span-2">
              {selectedAnalysis ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {selectedAnalysis.employee_name} 상세 분석
                      <Badge className={getRiskLevelColor(selectedAnalysis.risk_level)}>
                        {getRiskLevelIcon(selectedAnalysis.risk_level)}
                        {selectedAnalysis.risk_level.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      패턴: {selectedAnalysis.korean_pattern} | 점수: {selectedAnalysis.risk_score}/100
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 감지된 문제점 */}
                      {selectedAnalysis.detected_issues.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">감지된 문제점</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.detected_issues.map((issue, index) => (
                              <Alert key={index} className={
                                issue.severity === 'critical' ? 'border-red-200 bg-red-50' :
                                issue.severity === 'danger' ? 'border-orange-200 bg-orange-50' :
                                'border-yellow-200 bg-yellow-50'
                              }>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="font-medium">{issue.description}</div>
                                  <div className="text-sm mt-1">
                                    영향 날짜: {issue.affected_dates.slice(0, 3).join(', ')}
                                    {issue.affected_dates.length > 3 && ` 외 ${issue.affected_dates.length - 3}일`}
                                  </div>
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 개선 권장사항 */}
                      {selectedAnalysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">개선 권장사항</h4>
                          <ul className="space-y-1">
                            {selectedAnalysis.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500">
                      직원을 선택하면 상세 분석을 확인할 수 있습니다
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>패턴 분석</CardTitle>
              <CardDescription>한국 간호사 근무 패턴별 위험도 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 위험 패턴 TOP 5 */}
                <div>
                  <h4 className="font-medium mb-3">위험 패턴 TOP 5</h4>
                  <div className="space-y-2">
                    {analyses
                      .filter(a => a.korean_pattern.length > 0)
                      .reduce((acc: any[], curr) => {
                        const existingPattern = acc.find(p => p.pattern === curr.korean_pattern)
                        if (existingPattern) {
                          existingPattern.count++
                          existingPattern.total_risk += curr.risk_score
                        } else {
                          acc.push({
                            pattern: curr.korean_pattern,
                            count: 1,
                            total_risk: curr.risk_score
                          })
                        }
                        return acc
                      }, [])
                      .map(p => ({ ...p, avg_risk: Math.round(p.total_risk / p.count) }))
                      .sort((a, b) => b.avg_risk - a.avg_risk)
                      .slice(0, 5)
                      .map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50">
                          <div>
                            <span className="font-mono">{pattern.pattern}</span>
                            <span className="text-sm text-gray-600 ml-2">({pattern.count}명)</span>
                          </div>
                          <Badge variant={pattern.avg_risk >= 60 ? 'destructive' : 'secondary'}>
                            {pattern.avg_risk}점
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 안전 패턴 */}
                <div>
                  <h4 className="font-medium mb-3">안전 패턴</h4>
                  <div className="space-y-2">
                    {analyses
                      .filter(a => a.risk_level === 'low' && a.korean_pattern.length > 0)
                      .slice(0, 5)
                      .map((analysis, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-green-50">
                          <div>
                            <span className="font-mono">{analysis.korean_pattern}</span>
                            <span className="text-sm text-green-600 ml-2">
                              ({analysis.employee_name})
                            </span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {analysis.risk_score}점
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getIssueTypeLabel(issueType: string): string {
  const labels: { [key: string]: string } = {
    'consecutive_triple_shift': '연속 3교대',
    'alternating_chaos': '번갈아 패턴',
    'double_without_rest': '더블 후 불충분한 휴식',
    'excessive_nights': '과도한 나이트',
    'weekend_heavy': '주말 집중 패턴',
    'fatigue_accumulation': '피로 누적'
  }
  return labels[issueType] || issueType
}
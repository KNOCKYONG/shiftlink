'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  Award,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react'
import { FairnessAnalyzer, FairnessMetrics, TeamFairnessAnalysis } from '@/lib/scheduler/fairness-analyzer'

interface TeamFairnessReportProps {
  teamId: string
  tenantId: string
  period: string // "2024-03"
  employeeData: Array<{
    employee_id: string
    employee_name: string
    assignments: Array<{
      date: string
      shift_type: string
      leave_type?: string
      is_preferred?: boolean
    }>
  }>
}

export function TeamFairnessReport({ teamId, tenantId, period, employeeData }: TeamFairnessReportProps) {
  const [teamAnalysis, setTeamAnalysis] = useState<TeamFairnessAnalysis | null>(null)
  const [employeeMetrics, setEmployeeMetrics] = useState<FairnessMetrics[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null)

  const analyzer = new FairnessAnalyzer()

  useEffect(() => {
    if (employeeData.length > 0) {
      analyzeTeamFairness()
    }
  }, [employeeData, period])

  const analyzeTeamFairness = async () => {
    setLoading(true)
    
    try {
      // 팀 평균 계산
      const teamAverages = calculateTeamAverages(employeeData)
      
      // 각 직원별 공정성 메트릭 계산
      const metrics = employeeData.map(emp => 
        analyzer.analyzeEmployeeFairness(
          { id: emp.employee_id, name: emp.employee_name },
          emp.assignments,
          teamAverages
        )
      )
      
      setEmployeeMetrics(metrics)
      
      // 팀 전체 분석
      if (metrics.length > 0) {
        const teamAnalysisResult = analyzer.analyzeTeamFairness(metrics)
        setTeamAnalysis(teamAnalysisResult)
      }
    } catch (error) {
      console.error('Team fairness analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateTeamAverages = (data: any[]) => {
    const totalEmployees = data.length
    if (totalEmployees === 0) return { avg_night_shifts: 0, avg_weekend_shifts: 0, avg_work_hours: 0, avg_preferred_ratio: 0 }
    
    const totals = data.reduce((acc, emp) => {
      const workDays = emp.assignments.filter((a: any) => a.shift_type !== 'off' && !a.leave_type)
      const nightShifts = workDays.filter((a: any) => a.shift_type === 'night').length
      const weekendShifts = emp.assignments.filter((a: any) => {
        const date = new Date(a.date)
        const dayOfWeek = date.getDay()
        return (dayOfWeek === 0 || dayOfWeek === 6) && a.shift_type !== 'off'
      }).length
      const preferredShifts = workDays.filter((a: any) => a.is_preferred === true).length
      
      return {
        night_shifts: acc.night_shifts + nightShifts,
        weekend_shifts: acc.weekend_shifts + weekendShifts,
        work_hours: acc.work_hours + workDays.length * 8,
        preferred_shifts: acc.preferred_shifts + preferredShifts,
        total_work_days: acc.total_work_days + workDays.length
      }
    }, { night_shifts: 0, weekend_shifts: 0, work_hours: 0, preferred_shifts: 0, total_work_days: 0 })
    
    return {
      avg_night_shifts: totals.night_shifts / totalEmployees,
      avg_weekend_shifts: totals.weekend_shifts / totalEmployees,
      avg_work_hours: totals.work_hours / totalEmployees,
      avg_preferred_ratio: totals.total_work_days > 0 ? totals.preferred_shifts / totals.total_work_days : 0
    }
  }

  const getFairnessGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'poor':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'unacceptable':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFairnessGradeIcon = (grade: string) => {
    switch (grade) {
      case 'excellent':
        return <Award className="h-4 w-4" />
      case 'good':
        return <Shield className="h-4 w-4" />
      case 'fair':
        return <Target className="h-4 w-4" />
      case 'poor':
      case 'unacceptable':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 차트 데이터 준비
  const distributionChartData = employeeMetrics.map(metric => ({
    name: metric.employee_name,
    나이트근무: metric.burden_distribution.night_shifts_count,
    주말근무: metric.burden_distribution.weekend_shifts_count,
    선호근무: metric.opportunity_distribution.preferred_shifts_count,
    공정성점수: metric.fairness_scores.overall_fairness
  }))

  const fairnessDistributionData = [
    { name: '우수 (90+)', value: employeeMetrics.filter(m => m.fairness_scores.overall_fairness >= 90).length, color: '#10B981' },
    { name: '양호 (80-89)', value: employeeMetrics.filter(m => m.fairness_scores.overall_fairness >= 80 && m.fairness_scores.overall_fairness < 90).length, color: '#3B82F6' },
    { name: '보통 (60-79)', value: employeeMetrics.filter(m => m.fairness_scores.overall_fairness >= 60 && m.fairness_scores.overall_fairness < 80).length, color: '#F59E0B' },
    { name: '미흡 (60 미만)', value: employeeMetrics.filter(m => m.fairness_scores.overall_fairness < 60).length, color: '#EF4444' }
  ].filter(item => item.value > 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            팀 공정성 분석 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 전체 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">팀 공정성 등급</CardTitle>
            {teamAnalysis && getFairnessGradeIcon(teamAnalysis.fairness_grade)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {teamAnalysis?.fairness_score || 0}점
            </div>
            {teamAnalysis && (
              <Badge className={getFairnessGradeColor(teamAnalysis.fairness_grade)}>
                {teamAnalysis.fairness_grade.toUpperCase()}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 직원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeData.length}명</div>
            <div className="text-xs text-muted-foreground">
              {period} 기준
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">문제 영역</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {teamAnalysis?.problem_areas.length || 0}건
            </div>
            <div className="text-xs text-muted-foreground">
              개선 필요
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">불평등 지수</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamAnalysis ? Math.round(teamAnalysis.inequality_metrics.gini_coefficient.night_shifts * 100) : 0}
            </div>
            <div className="text-xs text-muted-foreground">
              지니계수 (0=완전평등)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 긴급 문제 알림 */}
      {teamAnalysis && teamAnalysis.problem_areas.some(p => p.severity === 'critical' || p.severity === 'high') && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">긴급 개선 필요</AlertTitle>
          <AlertDescription>
            <div className="text-red-700">
              {teamAnalysis.problem_areas.filter(p => p.severity === 'critical' || p.severity === 'high').length}개의 심각한 공정성 문제가 발견되었습니다.
              <div className="mt-2">
                <strong>우선 조치 사항:</strong>
                <ul className="list-disc list-inside mt-1">
                  {teamAnalysis.improvement_priorities.slice(0, 3).map((priority, index) => (
                    <li key={index}>{priority.action}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 상세 분석 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overview">전체 현황</TabsTrigger>
            <TabsTrigger value="distribution">분배 분석</TabsTrigger>
            <TabsTrigger value="individuals">개별 현황</TabsTrigger>
            <TabsTrigger value="problems">문제 분석</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={analyzeTeamFairness}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              리포트 내보내기
            </Button>
          </div>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 공정성 분포 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>팀 공정성 분포</CardTitle>
                <CardDescription>직원별 공정성 점수 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={fairnessDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}명`}
                    >
                      {fairnessDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 불평등 지표 */}
            <Card>
              <CardHeader>
                <CardTitle>불평등 지표</CardTitle>
                <CardDescription>각 영역별 불평등 정도</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>나이트 근무 불평등</span>
                      <span>{teamAnalysis ? Math.round(teamAnalysis.inequality_metrics.gini_coefficient.night_shifts * 100) : 0}</span>
                    </div>
                    <Progress 
                      value={teamAnalysis ? teamAnalysis.inequality_metrics.gini_coefficient.night_shifts * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>주말 근무 불평등</span>
                      <span>{teamAnalysis ? Math.round(teamAnalysis.inequality_metrics.gini_coefficient.weekend_shifts * 100) : 0}</span>
                    </div>
                    <Progress 
                      value={teamAnalysis ? teamAnalysis.inequality_metrics.gini_coefficient.weekend_shifts * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>근무시간 불평등</span>
                      <span>{teamAnalysis ? Math.round(teamAnalysis.inequality_metrics.gini_coefficient.work_hours * 100) : 0}</span>
                    </div>
                    <Progress 
                      value={teamAnalysis ? teamAnalysis.inequality_metrics.gini_coefficient.work_hours * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600">
                      💡 <strong>해석:</strong> 0에 가까울수록 평등, 100에 가까울수록 불평등합니다.
                      일반적으로 30 이하면 양호, 50 이상이면 개선이 필요합니다.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>근무 분배 현황</CardTitle>
              <CardDescription>직원별 나이트/주말/선호 근무 분배 비교</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={distributionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="나이트근무" fill="#8B5CF6" />
                  <Bar dataKey="주말근무" fill="#F59E0B" />
                  <Bar dataKey="선호근무" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
              
              {teamAnalysis && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-800">나이트 근무 범위</div>
                    <div className="text-purple-600">
                      {teamAnalysis.inequality_metrics.range_analysis.night_shifts.min}회 ~ {teamAnalysis.inequality_metrics.range_analysis.night_shifts.max}회
                      (차이: {teamAnalysis.inequality_metrics.range_analysis.night_shifts.range}회)
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-medium text-orange-800">주말 근무 범위</div>
                    <div className="text-orange-600">
                      {teamAnalysis.inequality_metrics.range_analysis.weekend_shifts.min}회 ~ {teamAnalysis.inequality_metrics.range_analysis.weekend_shifts.max}회
                      (차이: {teamAnalysis.inequality_metrics.range_analysis.weekend_shifts.range}회)
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800">근무시간 범위</div>
                    <div className="text-green-600">
                      {teamAnalysis.inequality_metrics.range_analysis.work_hours.min}시간 ~ {teamAnalysis.inequality_metrics.range_analysis.work_hours.max}시간
                      (차이: {teamAnalysis.inequality_metrics.range_analysis.work_hours.range}시간)
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individuals">
          <Card>
            <CardHeader>
              <CardTitle>개별 직원 공정성 현황</CardTitle>
              <CardDescription>각 직원의 공정성 지표와 개선 필요사항</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>직원명</TableHead>
                    <TableHead>전체 공정성</TableHead>
                    <TableHead>부담 공정성</TableHead>
                    <TableHead>기회 공정성</TableHead>
                    <TableHead>건강 공정성</TableHead>
                    <TableHead>나이트 근무</TableHead>
                    <TableHead>주말 근무</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeMetrics.map((metric) => (
                    <TableRow key={metric.employee_id}>
                      <TableCell className="font-medium">{metric.employee_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{metric.fairness_scores.overall_fairness}점</span>
                          <Progress value={metric.fairness_scores.overall_fairness} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={metric.fairness_scores.burden_fairness >= 80 ? 'default' : 'secondary'}>
                          {metric.fairness_scores.burden_fairness}점
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={metric.fairness_scores.opportunity_fairness >= 80 ? 'default' : 'secondary'}>
                          {metric.fairness_scores.opportunity_fairness}점
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={metric.fairness_scores.health_fairness >= 80 ? 'default' : 'secondary'}>
                          {metric.fairness_scores.health_fairness}점
                        </Badge>
                      </TableCell>
                      <TableCell>{metric.burden_distribution.night_shifts_count}회</TableCell>
                      <TableCell>{metric.burden_distribution.weekend_shifts_count}회</TableCell>
                      <TableCell>
                        {metric.fairness_scores.overall_fairness >= 80 ? (
                          <Badge className="bg-green-100 text-green-800">양호</Badge>
                        ) : metric.fairness_scores.overall_fairness >= 60 ? (
                          <Badge className="bg-yellow-100 text-yellow-800">주의</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">개선필요</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problems">
          <div className="space-y-6">
            {/* 문제 영역 */}
            {teamAnalysis && teamAnalysis.problem_areas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>식별된 문제 영역</CardTitle>
                  <CardDescription>팀 내 공정성 문제와 해결 방안</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamAnalysis.problem_areas.map((problem, index) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedProblem === index ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProblem(selectedProblem === index ? null : index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getSeverityColor(problem.severity)}>
                              {problem.severity.toUpperCase()}
                            </Badge>
                            <h4 className="font-medium">{getAreaLabel(problem.area)}</h4>
                          </div>
                          <div className="text-sm text-gray-600">
                            영향: {problem.affected_employees.length}명
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-700">
                          {problem.description}
                        </div>
                        
                        {selectedProblem === index && (
                          <div className="mt-4 p-3 bg-white rounded border">
                            <div className="font-medium text-sm mb-2">영향받는 직원:</div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {problem.affected_employees.map((emp: string, empIndex: number) => (
                                <Badge key={empIndex} variant="outline">{emp}</Badge>
                              ))}
                            </div>
                            
                            <div className="font-medium text-sm mb-2">권장 해결방안:</div>
                            <ul className="text-sm text-green-700 space-y-1">
                              {problem.recommendations.map((rec: string, recIndex: number) => (
                                <li key={recIndex} className="flex items-start">
                                  <span className="mr-2">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 개선 우선순위 */}
            {teamAnalysis && teamAnalysis.improvement_priorities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>개선 우선순위</CardTitle>
                  <CardDescription>다음 스케줄에서 우선적으로 개선해야 할 항목들</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {teamAnalysis.improvement_priorities.map((priority, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-blue-50">
                        <div className="flex-shrink-0">
                          <Badge className="bg-blue-100 text-blue-800">
                            우선순위 {priority.priority}
                          </Badge>
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium">{priority.action}</div>
                          <div className="text-sm text-gray-600">{priority.expected_impact}</div>
                          {priority.target_employees && (
                            <div className="text-xs text-gray-500 mt-1">
                              대상: {priority.target_employees.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 헬퍼 함수들
function getAreaLabel(area: string): string {
  const labels: { [key: string]: string } = {
    'night_shift_inequality': '나이트 근무 불평등',
    'weekend_shift_inequality': '주말 근무 불평등',
    'work_hours_inequality': '근무시간 불평등',
    'preferred_shift_inequality': '선호 근무 불평등',
    'health_inequality': '건강 형평성 문제',
    'consecutive_work_imbalance': '연속 근무 불균형'
  }
  return labels[area] || area
}
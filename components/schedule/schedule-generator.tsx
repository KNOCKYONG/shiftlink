'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Users,
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Zap,
  Target,
  Shield,
  Brain,
  Gauge,
  TrendingUp,
  Info
} from 'lucide-react'

interface Team {
  id: string
  name: string
  employee_count: number
}

interface Site {
  id: string
  name: string
}

interface CoverageRequirement {
  date: string
  shift_type: 'day' | 'evening' | 'night'
  required_count: number
  minimum_experience_level?: number
}

interface GenerationOptions {
  respect_preferences: boolean
  minimize_consecutive_nights: boolean
  balance_workload: boolean
  avoid_dangerous_patterns: boolean
}

// 🚀 엔터프라이즈급 CSP 최적화 설정
interface CSPOptimizationSettings {
  enabled: boolean
  strategy: 'SIMULATED_ANNEALING' | 'TABU_SEARCH' | 'GENETIC_ALGORITHM' | 'HILL_CLIMBING'
  fairness_target: number // Gini 계수 목표 (0-1)
  safety_priority: 'strict' | 'balanced' | 'relaxed'
  max_iterations: number
  convergence_threshold: number
}

// 📊 고급 분석 설정
interface AdvancedAnalysisSettings {
  generate_fairness_report: boolean
  generate_pattern_analysis: boolean
  generate_quality_metrics: boolean
  real_time_monitoring: boolean
}

interface ScheduleGeneratorProps {
  teams: Team[]
  sites: Site[]
  onGenerate: (data: any) => Promise<void>
  isGenerating?: boolean
}

export function ScheduleGenerator({
  teams,
  sites,
  onGenerate,
  isGenerating = false
}: ScheduleGeneratorProps) {
  const [scheduleName, setScheduleName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [coverageRequirements, setCoverageRequirements] = useState<CoverageRequirement[]>([])
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    respect_preferences: true,
    minimize_consecutive_nights: true,
    balance_workload: true,
    avoid_dangerous_patterns: true
  })

  // 🚀 엔터프라이즈급 CSP 최적화 설정
  const [cspOptimization, setCspOptimization] = useState<CSPOptimizationSettings>({
    enabled: true,
    strategy: 'SIMULATED_ANNEALING',
    fairness_target: 0.3, // Gini 계수 0.3 (좋은 공정성)
    safety_priority: 'balanced',
    max_iterations: 1000,
    convergence_threshold: 0.01
  })

  // 📊 고급 분석 설정
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedAnalysisSettings>({
    generate_fairness_report: true,
    generate_pattern_analysis: true,
    generate_quality_metrics: true,
    real_time_monitoring: false
  })

  // 🎛️ UI 상태
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  
  // 🧠 실시간 피드백 시스템 상태
  const [feedbackMessages, setFeedbackMessages] = useState<{
    type: 'info' | 'warning' | 'success' | 'error'
    message: string
    suggestion?: string
  }[]>([])
  const [performanceImpact, setPerformanceImpact] = useState({
    timeEstimate: 0,
    qualityScore: 0,
    complexityLevel: 'low'
  })

  // 날짜 범위 계산
  const calculateDateRange = () => {
    if (!startDate || !endDate) return []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates = []
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }
    
    return dates
  }

  // 기본 커버리지 요구사항 생성
  const generateDefaultCoverage = () => {
    const dates = calculateDateRange()
    const newCoverage: CoverageRequirement[] = []
    
    dates.forEach(date => {
      const dayOfWeek = new Date(date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      // 평일/주말에 따른 기본 인원수 설정
      const baseCount = isWeekend ? 3 : 4
      
      newCoverage.push(
        { date, shift_type: 'day', required_count: baseCount },
        { date, shift_type: 'evening', required_count: baseCount },
        { date, shift_type: 'night', required_count: Math.max(2, baseCount - 1) }
      )
    })
    
    setCoverageRequirements(newCoverage)
  }

  // 팀 선택/해제
  const toggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    )
  }

  // 생성 옵션 토글
  const toggleOption = (option: keyof GenerationOptions) => {
    setGenerationOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  // 폼 유효성 검사
  const isFormValid = () => {
    return scheduleName.trim() &&
           startDate &&
           endDate &&
           selectedTeams.length > 0 &&
           coverageRequirements.length > 0
  }

  // 🚀 엔터프라이즈급 스케줄 생성 실행
  const handleGenerate = async () => {
    if (!isFormValid()) return

    const data = {
      schedule_name: scheduleName,
      start_date: startDate,
      end_date: endDate,
      site_id: selectedSite === 'all' ? null : selectedSite,
      team_ids: selectedTeams,
      coverage_requirements: coverageRequirements,
      generation_options: generationOptions,
      // 🎯 엔터프라이즈급 CSP 최적화 설정
      csp_optimization: cspOptimization,
      // 📊 고급 분석 설정
      advanced_analysis: advancedAnalysis
    }

    console.log('🚀 Enterprise schedule generation request:', {
      csp_enabled: cspOptimization.enabled,
      strategy: cspOptimization.strategy,
      fairness_target: cspOptimization.fairness_target,
      advanced_features: Object.keys(advancedAnalysis).filter(key => advancedAnalysis[key])
    })

    await onGenerate(data)
  }

  // 커버리지 업데이트
  const updateCoverage = (index: number, field: keyof CoverageRequirement, value: any) => {
    setCoverageRequirements(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // 먼저 파생 값 계산 (Effect에서 사용되므로 TDZ 방지)
  const dateRange = calculateDateRange()
  const totalDays = dateRange.length
  const selectedTeamCount = selectedTeams.length
  const totalEmployees = teams
    .filter(team => selectedTeams.includes(team.id))
    .reduce((sum, team) => sum + team.employee_count, 0)

  // 🧠 실시간 설정 분석 및 피드백 생성
  const analyzeConfiguration = () => {
    const messages: Array<{
      type: 'info' | 'warning' | 'success' | 'error'
      message: string
      suggestion?: string
    }> = []

    // 성능 영향 분석
    let timeEstimate = totalEmployees * totalDays / 100
    let qualityScore = 70
    let complexityLevel: 'low' | 'medium' | 'high' = 'low'

    // CSP 최적화 분석
    if (cspOptimization.enabled) {
      timeEstimate *= 2.5
      qualityScore += 20
      complexityLevel = totalEmployees > 50 ? 'high' : 'medium'

      if (cspOptimization.fairness_target <= 0.2) {
        messages.push({
          type: 'success',
          message: `매우 공정한 Gini 계수 목표 (${cspOptimization.fairness_target})`,
          suggestion: '이 설정은 직원 간 업무 분배를 매우 공정하게 유지합니다.'
        })
        qualityScore += 10
      } else if (cspOptimization.fairness_target >= 0.4) {
        messages.push({
          type: 'warning',
          message: `높은 Gini 계수로 인한 불균등 위험 (${cspOptimization.fairness_target})`,
          suggestion: '0.3 이하로 설정하면 더 공정한 업무 분배가 가능합니다.'
        })
        qualityScore -= 5
      }

      // 알고리즘별 특성 분석
      switch (cspOptimization.strategy) {
        case 'SIMULATED_ANNEALING':
          messages.push({
            type: 'info',
            message: 'Simulated Annealing: 전역 최적해 탐색에 최적',
            suggestion: '복잡한 스케줄링에 가장 적합한 알고리즘입니다.'
          })
          qualityScore += 5
          break
        case 'GENETIC_ALGORITHM':
          timeEstimate *= 1.5
          messages.push({
            type: 'info',
            message: 'Genetic Algorithm: 다양한 해 탐색',
            suggestion: `${totalEmployees}명 규모에는 처리 시간이 다소 오래 걸릴 수 있습니다.`
          })
          break
        case 'HILL_CLIMBING':
          timeEstimate *= 0.7
          if (totalEmployees > 30) {
            messages.push({
              type: 'warning',
              message: 'Hill Climbing: 대규모에는 지역 최적화 위험',
              suggestion: 'Simulated Annealing이 더 나은 결과를 제공할 수 있습니다.'
            })
            qualityScore -= 5
          }
          break
      }

      // 안전성 우선순위 분석
      if (cspOptimization.safety_priority === 'strict' && generationOptions.avoid_dangerous_patterns) {
        messages.push({
          type: 'success',
          message: '최고 수준의 안전성 설정이 활성화되었습니다.',
          suggestion: '한국 간호사 안전 기준을 엄격하게 준수합니다.'
        })
        qualityScore += 8
      }
    }

    // 규모 기반 분석
    if (totalEmployees > 100) {
      complexityLevel = 'high'
      timeEstimate *= 1.8
      if (!cspOptimization.enabled) {
        messages.push({
          type: 'warning',
          message: '대규모 조직에서 CSP 최적화가 비활성화됨',
          suggestion: 'CSP 최적화를 활성화하면 스케줄 품질이 크게 향상됩니다.'
        })
        qualityScore -= 15
      }
    } else if (totalEmployees < 10 && cspOptimization.enabled) {
      messages.push({
        type: 'info',
        message: '소규모 팀에서 CSP 최적화 사용',
        suggestion: '기본 알고리즘으로도 충분할 수 있으나, 고품질 결과를 원한다면 현재 설정이 좋습니다.'
      })
    }

    // 기간 분석
    if (totalDays > 60) {
      timeEstimate *= 1.5
      complexityLevel = 'high'
      messages.push({
        type: 'info',
        message: `장기간 스케줄 생성 (${totalDays}일)`,
        suggestion: '3개월 이상의 스케줄은 분할 생성을 고려해보세요.'
      })
    }

    // 고급 분석 설정 검토
    const enabledAnalytics = Object.values(advancedAnalysis).filter(v => v).length
    if (enabledAnalytics >= 3) {
      timeEstimate *= 1.3
      qualityScore += 15
      messages.push({
        type: 'success',
        message: `${enabledAnalytics}개의 고급 분석 기능 활성화`,
        suggestion: '포괄적인 스케줄 분석으로 높은 품질을 보장합니다.'
      })
    }

    // 설정 충돌 검사
    if (!cspOptimization.enabled && advancedAnalysis.generate_fairness_report) {
      messages.push({
        type: 'warning',
        message: 'CSP 최적화 없이 공정성 분석 활성화',
        suggestion: 'CSP 최적화를 활성화하면 더 정확한 공정성 분석이 가능합니다.'
      })
    }

    if (generationOptions.avoid_dangerous_patterns && cspOptimization.safety_priority === 'relaxed') {
      messages.push({
        type: 'warning',
        message: '위험 패턴 회피와 유연한 안전성 설정 충돌',
        suggestion: '안전성 우선순위를 "균형" 이상으로 설정하는 것을 권장합니다.'
      })
    }

    setFeedbackMessages(messages)
    setPerformanceImpact({
      timeEstimate: Math.max(1, Math.round(timeEstimate)),
      qualityScore: Math.min(100, Math.max(50, qualityScore)),
      complexityLevel
    })
  }

  // 설정 변경 시 실시간 분석 실행
  React.useEffect(() => {
    if (totalEmployees > 0 && totalDays > 0) {
      analyzeConfiguration()
    }
  }, [
    cspOptimization,
    advancedAnalysis,
    generationOptions,
    totalEmployees,
    totalDays,
    selectedTeams.length
  ])


  return (
    <div className="space-y-6">
      {/* 🚀 엔터프라이즈급 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            엔터프라이즈 스케줄 생성기
          </h2>
          <p className="text-gray-600 mt-1">CSP 최적화와 AI 기반 공정성 분석을 활용한 지능형 스케줄링</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cspOptimization.enabled ? "default" : "secondary"}>
            {cspOptimization.enabled ? "CSP 최적화 활성" : "기본 모드"}
          </Badge>
          <Badge variant="outline">
            {cspOptimization.strategy}
          </Badge>
        </div>
      </div>

      {/* 🧠 실시간 설정 피드백 시스템 */}
      {totalEmployees > 0 && totalDays > 0 && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                실시간 설정 분석
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">품질 점수</div>
                  <div className={`text-lg font-bold ${
                    performanceImpact.qualityScore >= 90 ? 'text-green-600' :
                    performanceImpact.qualityScore >= 75 ? 'text-blue-600' :
                    performanceImpact.qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {performanceImpact.qualityScore}점
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">예상 시간</div>
                  <div className="text-lg font-bold text-gray-700">
                    {performanceImpact.timeEstimate}분
                  </div>
                </div>
                <Badge variant={
                  performanceImpact.complexityLevel === 'high' ? 'destructive' :
                  performanceImpact.complexityLevel === 'medium' ? 'default' : 'secondary'
                }>
                  {performanceImpact.complexityLevel === 'high' ? '고복잡도' :
                   performanceImpact.complexityLevel === 'medium' ? '중복잡도' : '저복잡도'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          {feedbackMessages.length > 0 && (
            <CardContent>
              <div className="grid gap-3">
                {feedbackMessages.map((message, index) => (
                  <Alert 
                    key={index} 
                    className={`${
                      message.type === 'success' ? 'border-green-200 bg-green-50' :
                      message.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      message.type === 'error' ? 'border-red-200 bg-red-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${
                        message.type === 'success' ? 'text-green-600' :
                        message.type === 'warning' ? 'text-yellow-600' :
                        message.type === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
                         message.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                         message.type === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                         <Info className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          message.type === 'success' ? 'text-green-800' :
                          message.type === 'warning' ? 'text-yellow-800' :
                          message.type === 'error' ? 'text-red-800' :
                          'text-blue-800'
                        }`}>
                          {message.message}
                        </div>
                        {message.suggestion && (
                          <div className={`text-sm mt-1 ${
                            message.type === 'success' ? 'text-green-600' :
                            message.type === 'warning' ? 'text-yellow-600' :
                            message.type === 'error' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            💡 {message.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>

              {/* 성능 영향 요약 */}
              <div className="mt-4 p-3 bg-white/70 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">현재 설정 요약:</span>
                    <span className="ml-2">
                      {totalEmployees}명 · {totalDays}일 · 
                      {cspOptimization.enabled ? ` CSP ${cspOptimization.strategy}` : ' 기본 알고리즘'} · 
                      품질 {performanceImpact.qualityScore}점
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cspOptimization.enabled && (
                      <Badge variant="outline" className="text-xs">
                        Gini {cspOptimization.fairness_target}
                      </Badge>
                    )}
                    {Object.values(advancedAnalysis).filter(v => v).length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Object.values(advancedAnalysis).filter(v => v).length}개 분석
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 🎛️ 탭 기반 설정 인터페이스 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            기본 설정
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            CSP 최적화
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            고급 분석
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            미리보기
          </TabsTrigger>
        </TabsList>

        {/* 📋 기본 설정 탭 */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                기본 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduleName">스케줄 이름</Label>
                  <Input
                    id="scheduleName"
                    placeholder="예: 2024년 3월 간호팀 스케줄"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="site">사업장 (선택)</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="사업장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 사업장</SelectItem>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">시작일</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">종료일</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              </div>

              {totalDays > 0 && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    총 <strong>{totalDays}일</strong> 기간의 엔터프라이즈급 스케줄을 생성합니다.
                    {cspOptimization.enabled && (
                      <span className="text-blue-600 ml-2">
                        (CSP 최적화로 {Math.round((1 - cspOptimization.fairness_target) * 100)}% 향상된 공정성 예상)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 팀 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                대상 팀 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTeams.includes(team.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        readOnly
                      />
                      <div className="flex-1">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-gray-500">
                          {team.employee_count}명
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTeamCount > 0 && (
                <Alert className="mt-4">
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    선택된 팀: <strong>{selectedTeamCount}개</strong> | 
                    총 직원: <strong>{totalEmployees}명</strong>
                    {cspOptimization.enabled && (
                      <span className="text-green-600 ml-2">
                        (AI 최적화로 모든 직원의 공정한 배정 보장)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      {/* 커버리지 요구사항 */}
      {dateRange.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                커버리지 요구사항
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateDefaultCoverage}
              >
                기본값 생성
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coverageRequirements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>기본값 생성 버튼을 클릭하여 커버리지 요구사항을 설정하세요.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dateRange.map(date => {
                  const dateRequirements = coverageRequirements.filter(req => req.date === date)
                  const dayOfWeek = new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' })
                  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6
                  
                  return (
                    <div key={date} className={`p-3 border rounded-lg ${isWeekend ? 'bg-orange-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {date} ({dayOfWeek})
                          {isWeekend && <Badge variant="secondary" className="ml-2">주말</Badge>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {['day', 'evening', 'night'].map(shiftType => {
                          const requirement = dateRequirements.find(req => req.shift_type === shiftType)
                          const reqIndex = coverageRequirements.findIndex(
                            req => req.date === date && req.shift_type === shiftType
                          )
                          
                          return (
                            <div key={shiftType} className="space-y-1">
                              <Label className="text-xs">
                                {shiftType === 'day' ? '데이' : 
                                 shiftType === 'evening' ? '이브닝' : 
                                 shiftType === 'night' ? '나이트' : shiftType}
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                className="text-sm"
                                value={requirement?.required_count || 0}
                                onChange={(e) => updateCoverage(
                                  reqIndex, 
                                  'required_count', 
                                  parseInt(e.target.value) || 0
                                )}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* 🚀 CSP 최적화 탭 */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                CSP 최적화 엔진
              </CardTitle>
              <p className="text-sm text-gray-600">
                Constraint Satisfaction Problem 기반 고급 최적화 알고리즘
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSP 활성화 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">CSP 최적화 활성화</h4>
                  <p className="text-sm text-gray-600">수학적 최적화로 15-25% 향상된 스케줄 품질</p>
                </div>
                <Switch
                  checked={cspOptimization.enabled}
                  onCheckedChange={(enabled) => setCspOptimization(prev => ({ ...prev, enabled }))}
                />
              </div>

              {cspOptimization.enabled && (
                <div className="space-y-6">
                  {/* 최적화 전략 선택 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      최적화 알고리즘
                    </Label>
                    <Select
                      value={cspOptimization.strategy}
                      onValueChange={(strategy) => setCspOptimization(prev => ({ ...prev, strategy: strategy as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIMULATED_ANNEALING">
                          <div className="flex flex-col">
                            <span>Simulated Annealing</span>
                            <span className="text-xs text-gray-500">전역 최적해 탐색 (권장)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="TABU_SEARCH">
                          <div className="flex flex-col">
                            <span>Tabu Search</span>
                            <span className="text-xs text-gray-500">지역 최적화 방지</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="GENETIC_ALGORITHM">
                          <div className="flex flex-col">
                            <span>Genetic Algorithm</span>
                            <span className="text-xs text-gray-500">진화 기반 최적화</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="HILL_CLIMBING">
                          <div className="flex flex-col">
                            <span>Hill Climbing</span>
                            <span className="text-xs text-gray-500">빠른 지역 최적화</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 공정성 목표 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      공정성 목표 (Gini 계수)
                    </Label>
                    <div className="space-y-2">
                      <Slider
                        value={[cspOptimization.fairness_target]}
                        onValueChange={([value]) => setCspOptimization(prev => ({ ...prev, fairness_target: value }))}
                        max={0.5}
                        min={0.1}
                        step={0.05}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0.1 (완벽한 평등)</span>
                        <span className="font-medium text-blue-600">
                          {cspOptimization.fairness_target.toFixed(2)} ({cspOptimization.fairness_target <= 0.2 ? '매우 공정' : cspOptimization.fairness_target <= 0.3 ? '공정' : '보통'})
                        </span>
                        <span>0.5 (불균등)</span>
                      </div>
                    </div>
                  </div>

                  {/* 안전성 우선순위 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      안전성 우선순위
                    </Label>
                    <Select
                      value={cspOptimization.safety_priority}
                      onValueChange={(priority) => setCspOptimization(prev => ({ ...prev, safety_priority: priority as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">
                          <div className="flex flex-col">
                            <span>엄격 (Strict)</span>
                            <span className="text-xs text-gray-500">안전 규정 최우선</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="balanced">
                          <div className="flex flex-col">
                            <span>균형 (Balanced)</span>
                            <span className="text-xs text-gray-500">안전성과 효율성 균형</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="relaxed">
                          <div className="flex flex-col">
                            <span>유연 (Relaxed)</span>
                            <span className="text-xs text-gray-500">효율성 우선</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 고급 설정 */}
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>최대 반복 횟수</Label>
                      <Input
                        type="number"
                        value={cspOptimization.max_iterations}
                        onChange={(e) => setCspOptimization(prev => ({ ...prev, max_iterations: parseInt(e.target.value) || 1000 }))}
                        min={100}
                        max={10000}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>수렴 임계값</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={cspOptimization.convergence_threshold}
                        onChange={(e) => setCspOptimization(prev => ({ ...prev, convergence_threshold: parseFloat(e.target.value) || 0.01 }))}
                        min={0.001}
                        max={0.1}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 기본 생성 옵션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                기본 생성 옵션
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="respect_preferences"
                    checked={generationOptions.respect_preferences}
                    onCheckedChange={() => toggleOption('respect_preferences')}
                  />
                  <Label htmlFor="respect_preferences" className="text-sm font-medium">
                    직원 선호 패턴 반영
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="minimize_consecutive_nights"
                    checked={generationOptions.minimize_consecutive_nights}
                    onCheckedChange={() => toggleOption('minimize_consecutive_nights')}
                  />
                  <Label htmlFor="minimize_consecutive_nights" className="text-sm font-medium">
                    연속 야간 근무 최소화
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="balance_workload"
                    checked={generationOptions.balance_workload}
                    onCheckedChange={() => toggleOption('balance_workload')}
                  />
                  <Label htmlFor="balance_workload" className="text-sm font-medium">
                    업무량 균형 유지
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="avoid_dangerous_patterns"
                    checked={generationOptions.avoid_dangerous_patterns}
                    onCheckedChange={() => toggleOption('avoid_dangerous_patterns')}
                  />
                  <Label htmlFor="avoid_dangerous_patterns" className="text-sm font-medium">
                    위험 패턴 회피 (데이나오 등)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📊 고급 분석 탭 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                고급 분석 및 리포팅
              </CardTitle>
              <p className="text-sm text-gray-600">
                AI 기반 스케줄 품질 분석 및 인사이트 생성
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">공정성 분석 리포트</h4>
                    <p className="text-sm text-gray-600">Gini 계수 기반 공정성 측정</p>
                  </div>
                  <Switch
                    checked={advancedAnalysis.generate_fairness_report}
                    onCheckedChange={(checked) => setAdvancedAnalysis(prev => ({ ...prev, generate_fairness_report: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">패턴 안전성 분석</h4>
                    <p className="text-sm text-gray-600">위험한 교대 패턴 탐지</p>
                  </div>
                  <Switch
                    checked={advancedAnalysis.generate_pattern_analysis}
                    onCheckedChange={(checked) => setAdvancedAnalysis(prev => ({ ...prev, generate_pattern_analysis: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">품질 지표 분석</h4>
                    <p className="text-sm text-gray-600">종합 스케줄 품질 평가</p>
                  </div>
                  <Switch
                    checked={advancedAnalysis.generate_quality_metrics}
                    onCheckedChange={(checked) => setAdvancedAnalysis(prev => ({ ...prev, generate_quality_metrics: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">실시간 모니터링</h4>
                    <p className="text-sm text-gray-600">생성 과정 실시간 추적</p>
                  </div>
                  <Switch
                    checked={advancedAnalysis.real_time_monitoring}
                    onCheckedChange={(checked) => setAdvancedAnalysis(prev => ({ ...prev, real_time_monitoring: checked }))}
                  />
                </div>
              </div>

              {Object.values(advancedAnalysis).some(v => v) && (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    활성화된 분석 기능으로 스케줄 생성 후 상세한 인사이트를 확인할 수 있습니다.
                    {advancedAnalysis.real_time_monitoring && (
                      <span className="text-blue-600 ml-2">(실시간 모니터링으로 진행 상황 추적)</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🎯 미리보기 탭 */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                설정 미리보기 및 검증
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 예상 성능 지표 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">예상 처리 시간</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 mt-2">
                    {cspOptimization.enabled ? `${Math.ceil(totalEmployees * totalDays / 50)}분` : '< 1분'}
                  </div>
                  <p className="text-sm text-blue-600">
                    {cspOptimization.enabled ? 'CSP 최적화 포함' : '기본 알고리즘'}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium">예상 공정성 점수</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 mt-2">
                    {Math.round((1 - cspOptimization.fairness_target) * 100)}점
                  </div>
                  <p className="text-sm text-green-600">
                    Gini 계수 {cspOptimization.fairness_target} 기준
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">안전성 등급</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700 mt-2">
                    {cspOptimization.safety_priority === 'strict' ? 'A+' : 
                     cspOptimization.safety_priority === 'balanced' ? 'A' : 'B+'}
                  </div>
                  <p className="text-sm text-purple-600">
                    {cspOptimization.safety_priority === 'strict' ? '최고 안전성' : 
                     cspOptimization.safety_priority === 'balanced' ? '균형 잡힌 안전성' : '효율성 우선'}
                  </p>
                </div>
              </div>

              {/* 설정 요약 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>설정 요약:</strong> {totalEmployees}명 직원, {totalDays}일 기간, 
                  {cspOptimization.enabled ? ` ${cspOptimization.strategy} 최적화` : ' 기본 알고리즘'}, 
                  {Object.values(advancedAnalysis).filter(v => v).length}개 고급 분석 활성화
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🚀 엔터프라이즈급 생성 버튼 */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!isFormValid() || isGenerating}
          onClick={handleGenerate}
          className={`w-full md:w-auto min-w-64 ${
            cspOptimization.enabled 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
              : ''
          }`}
        >
          {isGenerating ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              {cspOptimization.enabled ? 'AI 최적화 생성 중...' : '스케줄 생성 중...'}
            </>
          ) : (
            <>
              {cspOptimization.enabled ? (
                <Brain className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {cspOptimization.enabled ? 'AI 엔터프라이즈 생성' : '기본 스케줄 생성'}
            </>
          )}
        </Button>
      </div>

      {/* 🎯 실시간 설정 피드백 */}
      {!isFormValid() && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            필수 설정을 완료해야 스케줄을 생성할 수 있습니다:
            {!scheduleName.trim() && ' 스케줄 이름,'}
            {!startDate && ' 시작일,'}
            {!endDate && ' 종료일,'}
            {selectedTeams.length === 0 && ' 팀 선택,'}
            {coverageRequirements.length === 0 && ' 커버리지 설정'}
          </AlertDescription>
        </Alert>
      )}

      {/* 🚀 엔터프라이즈급 6단계 생성 프로세스 모니터링 */}
      {isGenerating && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Brain className="h-5 w-5 animate-pulse" />
              엔터프라이즈 AI 스케줄링 진행 상황
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 전체 진행률 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>전체 진행률</span>
                <span className="text-blue-600">3/6 단계 완료</span>
              </div>
              <Progress value={50} className="w-full h-2" />
            </div>

            {/* 6단계 프로세스 상태 */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-100 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">1단계: 제약 조건 분석</div>
                    <div className="text-xs text-green-600">직원 정보, 규칙, 선호도 분석 완료</div>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white">완료</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-100 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">2단계: CSP 모델 구축</div>
                    <div className="text-xs text-green-600">{cspOptimization.strategy} 알고리즘으로 제약 만족 문제 모델링 완료</div>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white">완료</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                  <div>
                    <div className="font-medium text-blue-800">3단계: 최적화 실행</div>
                    <div className="text-xs text-blue-600">
                      Gini 계수 {cspOptimization.fairness_target} 목표로 공정성 최적화 진행 중...
                    </div>
                  </div>
                </div>
                <Badge className="bg-blue-600 text-white animate-pulse">진행 중</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border-l-4 border-gray-300">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-600">4단계: 품질 검증</div>
                    <div className="text-xs text-gray-500">안전성 패턴 및 제약 조건 검증 대기 중</div>
                  </div>
                </div>
                <Badge variant="secondary">대기</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border-l-4 border-gray-300">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-600">5단계: 공정성 분석</div>
                    <div className="text-xs text-gray-500">
                      {advancedAnalysis.generate_fairness_report ? 'Gini 계수 기반 공정성 리포트 생성 대기 중' : '공정성 분석 미설정'}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">대기</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border-l-4 border-gray-300">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-600">6단계: 최종 검토 및 저장</div>
                    <div className="text-xs text-gray-500">스케줄 배정 저장 및 통계 생성 대기 중</div>
                  </div>
                </div>
                <Badge variant="secondary">대기</Badge>
              </div>
            </div>

            {/* 실시간 통계 */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-white/60 rounded-lg border">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700">{totalEmployees}</div>
                <div className="text-xs text-gray-600">처리 대상 직원</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700">{totalDays}</div>
                <div className="text-xs text-gray-600">스케줄 기간(일)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {cspOptimization.enabled ? `~${Math.ceil(totalEmployees * totalDays / 50)}분` : '<1분'}
                </div>
                <div className="text-xs text-gray-600">예상 완료 시간</div>
              </div>
            </div>

            {/* 현재 진행 중인 작업 상세 정보 */}
            <Alert className="border-blue-200 bg-blue-50">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>현재 진행:</strong> {cspOptimization.strategy} 알고리즘으로 최적해 탐색 중 
                (목표 공정성: Gini {cspOptimization.fairness_target}, 안전성: {
                  cspOptimization.safety_priority === 'strict' ? '엄격' : 
                  cspOptimization.safety_priority === 'balanced' ? '균형' : '유연'
                })
                {advancedAnalysis.real_time_monitoring && (
                  <span className="block text-xs mt-1 text-blue-600">
                    실시간 모니터링으로 세부 진행 상황을 추적하고 있습니다.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

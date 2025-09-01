'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar,
  Users,
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3
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
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [coverageRequirements, setCoverageRequirements] = useState<CoverageRequirement[]>([])
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    respect_preferences: true,
    minimize_consecutive_nights: true,
    balance_workload: true,
    avoid_dangerous_patterns: true
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

  // 스케줄 생성 실행
  const handleGenerate = async () => {
    if (!isFormValid()) return

    const data = {
      schedule_name: scheduleName,
      start_date: startDate,
      end_date: endDate,
      site_id: selectedSite || null,
      team_ids: selectedTeams,
      coverage_requirements: coverageRequirements,
      generation_options: generationOptions
    }

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

  const dateRange = calculateDateRange()
  const totalDays = dateRange.length
  const selectedTeamCount = selectedTeams.length
  const totalEmployees = teams
    .filter(team => selectedTeams.includes(team.id))
    .reduce((sum, team) => sum + team.employee_count, 0)

  return (
    <div className="space-y-6">
      {/* 기본 설정 */}
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
                  <SelectItem value="">전체 사업장</SelectItem>
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
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📅 총 <strong>{totalDays}일</strong> 기간의 스케줄을 생성합니다.
              </p>
            </div>
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
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                👥 선택된 팀: <strong>{selectedTeamCount}개</strong> | 
                총 직원: <strong>{totalEmployees}명</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* 생성 옵션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            스케줄 생성 옵션
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

      {/* 생성 버튼 */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!isFormValid() || isGenerating}
          onClick={handleGenerate}
          className="w-full md:w-auto min-w-48"
        >
          {isGenerating ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              스케줄 생성 중...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              스케줄 생성하기
            </>
          )}
        </Button>
      </div>

      {/* 생성 진행률 (생성 중일 때) */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>스케줄 생성 진행률</span>
                <span>처리 중...</span>
              </div>
              <Progress value={45} className="w-full" />
              <p className="text-xs text-gray-600 text-center">
                {totalEmployees}명의 직원에 대해 {totalDays}일 스케줄을 생성하고 있습니다...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
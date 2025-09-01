'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  Clock,
  Moon, 
  Sun, 
  Sunset,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Coffee,
  Bed,
  AlertCircle,
  CheckCircle,
  Lightbulb
} from 'lucide-react'
import { WORK_PATTERN_TEMPLATES } from '@/lib/scheduler/work-pattern-types'

interface WorkPatternPreferencesProps {
  employeeId: string
  currentPattern?: any
  onSave?: (pattern: any) => void
}

interface PatternRecommendation {
  pattern_type: string
  confidence: number
  reasons: string[]
  template: any
}

export default function WorkPatternPreferences({ 
  employeeId, 
  currentPattern, 
  onSave 
}: WorkPatternPreferencesProps) {
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<PatternRecommendation | null>(null)
  const [pattern, setPattern] = useState({
    pattern_type: currentPattern?.pattern_type || 'balanced',
    work_intensity: currentPattern?.work_intensity || 'medium',
    rest_preference: currentPattern?.rest_preference || 'flexible',
    preferred_consecutive_work_days: currentPattern?.preferred_consecutive_work_days || 3,
    preferred_consecutive_rest_days: currentPattern?.preferred_consecutive_rest_days || 2,
    max_consecutive_work_days: currentPattern?.max_consecutive_work_days || 4,
    min_rest_between_cycles: currentPattern?.min_rest_between_cycles || 1,
    shift_type_preferences: currentPattern?.shift_type_preferences || {
      day: 7,
      evening: 6,
      night: 5
    },
    weekday_preferences: currentPattern?.weekday_preferences || {
      monday: 7,
      tuesday: 7,
      wednesday: 7,
      thursday: 7,
      friday: 7,
      saturday: 6,
      sunday: 6
    },
    avoid_friday_night: currentPattern?.avoid_friday_night || false,
    prefer_weekend_off: currentPattern?.prefer_weekend_off || true,
    flexible_schedule: currentPattern?.flexible_schedule || false
  })

  const patternTemplates = Object.entries(WORK_PATTERN_TEMPLATES).map(([key, template]) => ({
    value: key,
    label: template.name,
    description: template.description,
    icon: key === 'short_frequent' ? TrendingUp : 
          key === 'long_break' ? TrendingDown : BarChart3
  }))

  const shiftTypeIcons = {
    day: Sun,
    evening: Sunset,
    night: Moon
  }

  const weekdays = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' }
  ]

  useEffect(() => {
    if (currentPattern?.pattern_type) {
      loadRecommendation()
    }
  }, [employeeId])

  const loadRecommendation = async () => {
    try {
      const response = await fetch('/api/patterns/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, lookback_days: 90 })
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendation(data.recommendation)
      }
    } catch (error) {
      console.error('Failed to load recommendation:', error)
    }
  }

  const handlePatternTypeChange = (newType: string) => {
    const template = WORK_PATTERN_TEMPLATES[newType as keyof typeof WORK_PATTERN_TEMPLATES]
    if (template) {
      setPattern(prev => ({
        ...prev,
        pattern_type: newType,
        work_intensity: template.work_intensity,
        rest_preference: template.rest_preference,
        preferred_consecutive_work_days: template.preferred_consecutive_work_days,
        preferred_consecutive_rest_days: template.preferred_consecutive_rest_days,
        max_consecutive_work_days: template.max_consecutive_work_days,
        min_rest_between_cycles: template.min_rest_between_cycles,
        weekday_preferences: template.weekday_preferences
      }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const url = currentPattern ? '/api/patterns' : '/api/patterns'
      const method = currentPattern ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          ...pattern
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(currentPattern ? '근무 패턴이 업데이트되었습니다' : '근무 패턴이 저장되었습니다')
        onSave?.(data.pattern)
      } else {
        const error = await response.json()
        toast.error(error.error || '저장 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getPatternBadgeColor = (type: string) => {
    switch (type) {
      case 'short_frequent': return 'bg-green-100 text-green-800 border-green-300'
      case 'long_break': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'balanced': return 'bg-purple-100 text-purple-800 border-purple-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendation Card */}
      {recommendation && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">AI 추천 근무 패턴</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className={`${getPatternBadgeColor(recommendation.pattern_type)} border`}>
                  {WORK_PATTERN_TEMPLATES[recommendation.pattern_type as keyof typeof WORK_PATTERN_TEMPLATES]?.name}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  신뢰도: {recommendation.confidence}%
                </p>
              </div>
              {recommendation.confidence >= 70 && (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">추천 이유:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {recommendation.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            {recommendation.pattern_type !== pattern.pattern_type && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePatternTypeChange(recommendation.pattern_type)}
                className="w-full"
              >
                추천 패턴 적용하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pattern Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            근무 패턴 유형
          </CardTitle>
          <CardDescription>
            선호하는 근무 스타일을 선택해주세요. 짧게 자주 일하기 vs 길게 한번에 일하기
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={pattern.pattern_type}
            onValueChange={handlePatternTypeChange}
            className="space-y-4"
          >
            {patternTemplates.map((template) => {
              const IconComponent = template.icon
              const isSelected = pattern.pattern_type === template.value
              return (
                <div key={template.value} className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}>
                  <RadioGroupItem value={template.value} id={template.value} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label htmlFor={template.value} className="font-medium cursor-pointer">
                        {template.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Work Intensity & Rest Preference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5" />
              근무 강도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={pattern.work_intensity}
              onValueChange={(value) => setPattern(prev => ({ ...prev, work_intensity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">높음 - 집중적인 근무 선호</SelectItem>
                <SelectItem value="medium">중간 - 균형잡힌 근무</SelectItem>
                <SelectItem value="low">낮음 - 여유로운 근무 선호</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5" />
              휴식 스타일
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={pattern.rest_preference}
              onValueChange={(value) => setPattern(prev => ({ ...prev, rest_preference: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_frequent">짧고 자주 - 자주 짧은 휴식</SelectItem>
                <SelectItem value="long_concentrated">길고 집중 - 긴 휴식 선호</SelectItem>
                <SelectItem value="flexible">유연함 - 상황에 따라</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Work/Rest Cycle Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>근무 주기 설정</CardTitle>
          <CardDescription>
            연속 근무일수와 휴무일수를 조정해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">선호 연속 근무 일수: {pattern.preferred_consecutive_work_days}일</Label>
                <Slider
                  value={[pattern.preferred_consecutive_work_days]}
                  onValueChange={([value]) => 
                    setPattern(prev => ({ ...prev, preferred_consecutive_work_days: value }))
                  }
                  max={7}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">최대 연속 근무 일수: {pattern.max_consecutive_work_days}일</Label>
                <Slider
                  value={[pattern.max_consecutive_work_days]}
                  onValueChange={([value]) => 
                    setPattern(prev => ({ ...prev, max_consecutive_work_days: value }))
                  }
                  max={10}
                  min={pattern.preferred_consecutive_work_days}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">선호 연속 휴무 일수: {pattern.preferred_consecutive_rest_days}일</Label>
                <Slider
                  value={[pattern.preferred_consecutive_rest_days]}
                  onValueChange={([value]) => 
                    setPattern(prev => ({ ...prev, preferred_consecutive_rest_days: value }))
                  }
                  max={5}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">사이클 간 최소 휴식: {pattern.min_rest_between_cycles}일</Label>
                <Slider
                  value={[pattern.min_rest_between_cycles]}
                  onValueChange={([value]) => 
                    setPattern(prev => ({ ...prev, min_rest_between_cycles: value }))
                  }
                  max={3}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Type Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>시간대별 선호도</CardTitle>
          <CardDescription>
            각 시간대에 대한 선호도를 1-10점으로 설정해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(pattern.shift_type_preferences).map(([shiftType, preference]) => {
              const IconComponent = shiftTypeIcons[shiftType as keyof typeof shiftTypeIcons]
              return (
                <div key={shiftType} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4" />
                    <Label className="text-sm font-medium capitalize">
                      {shiftType === 'day' ? '주간' : shiftType === 'evening' ? '오후' : '야간'}
                    </Label>
                    <span className="text-sm text-muted-foreground">({preference}점)</span>
                  </div>
                  <Slider
                    value={[preference]}
                    onValueChange={([value]) => 
                      setPattern(prev => ({
                        ...prev,
                        shift_type_preferences: {
                          ...prev.shift_type_preferences,
                          [shiftType]: value
                        }
                      }))
                    }
                    max={10}
                    min={1}
                    step={1}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekday Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>요일별 선호도</CardTitle>
          <CardDescription>
            각 요일에 대한 근무 선호도를 설정해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {weekdays.map((day) => (
              <div key={day.key} className="space-y-3">
                <div className="text-center">
                  <Label className="text-sm font-medium">{day.label}</Label>
                  <div className="text-xs text-muted-foreground">
                    {pattern.weekday_preferences[day.key as keyof typeof pattern.weekday_preferences]}점
                  </div>
                </div>
                <Slider
                  value={[pattern.weekday_preferences[day.key as keyof typeof pattern.weekday_preferences]]}
                  onValueChange={([value]) => 
                    setPattern(prev => ({
                      ...prev,
                      weekday_preferences: {
                        ...prev.weekday_preferences,
                        [day.key]: value
                      }
                    }))
                  }
                  max={10}
                  min={1}
                  step={1}
                  orientation="vertical"
                  className="h-20"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>추가 선호사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="avoid-friday-night" className="text-sm font-medium">
                금요일 야간 기피
              </Label>
              <p className="text-xs text-muted-foreground">
                금요일 밤 근무를 피하고 싶습니다
              </p>
            </div>
            <Switch
              id="avoid-friday-night"
              checked={pattern.avoid_friday_night}
              onCheckedChange={(checked) => 
                setPattern(prev => ({ ...prev, avoid_friday_night: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="prefer-weekend-off" className="text-sm font-medium">
                주말 휴무 선호
              </Label>
              <p className="text-xs text-muted-foreground">
                가능하면 주말에 쉬고 싶습니다
              </p>
            </div>
            <Switch
              id="prefer-weekend-off"
              checked={pattern.prefer_weekend_off}
              onCheckedChange={(checked) => 
                setPattern(prev => ({ ...prev, prefer_weekend_off: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="flexible-schedule" className="text-sm font-medium">
                스케줄 유연성
              </Label>
              <p className="text-xs text-muted-foreground">
                필요시 스케줄 변경에 유연하게 대응합니다
              </p>
            </div>
            <Switch
              id="flexible-schedule"
              checked={pattern.flexible_schedule}
              onCheckedChange={(checked) => 
                setPattern(prev => ({ ...prev, flexible_schedule: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={loadRecommendation}
          disabled={loading}
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          AI 추천 다시 받기
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '저장 중...' : currentPattern ? '변경사항 저장' : '패턴 저장'}
        </Button>
      </div>
    </div>
  )
}
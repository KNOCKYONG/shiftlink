'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield,
  Clock,
  AlertTriangle,
  Moon,
  Calendar,
  Save,
  RotateCcw,
  Info
} from 'lucide-react'

interface SchedulingRules {
  // 기본 제약사항
  min_rest_between_shifts: number
  max_consecutive_nights: number
  max_weekly_hours: number
  min_staff_per_shift: number
  
  // 한국 간호사 특수 규칙
  avoid_dangerous_patterns: boolean
  day_night_gap_required: boolean
  weekend_fairness: boolean
  holiday_premium_staffing: boolean
  
  // 공정성 설정
  balance_workload: boolean
  prefer_fixed_patterns: boolean
  experience_level_mixing: boolean
  team_stability_weight: number
  
  // 교환 관련
  auto_approve_safe_swaps: boolean
  require_manager_approval: boolean
  emergency_swap_allowed: boolean
  
  // 고급 설정
  fatigue_monitoring: boolean
  pattern_risk_scoring: boolean
  predictive_alerts: boolean
}

interface SchedulingRulesProps {
  tenantId: string
  currentRules: Partial<SchedulingRules>
  onSave: (rules: SchedulingRules) => Promise<void>
  isSaving?: boolean
}

const DEFAULT_KOREAN_RULES: SchedulingRules = {
  min_rest_between_shifts: 11, // 한국 근로기준법
  max_consecutive_nights: 2,   // 한국 간호사 권장사항
  max_weekly_hours: 40,        // 한국 법정 근로시간
  min_staff_per_shift: 3,      // 최소 안전 인원
  
  avoid_dangerous_patterns: true,  // 데이나오 패턴 회피
  day_night_gap_required: true,    // 데이-나이트 간 휴식 필수
  weekend_fairness: true,          // 주말 근무 공평 분배
  holiday_premium_staffing: true,  // 공휴일 추가 인력
  
  balance_workload: true,
  prefer_fixed_patterns: false,    // 고정 패턴보다 유연성
  experience_level_mixing: true,   // 신규-경력 믹스
  team_stability_weight: 70,       // 팀 안정성 가중치 (0-100)
  
  auto_approve_safe_swaps: false,  // 안전 교환 자동승인 비활성화
  require_manager_approval: true,  // 관리자 승인 필수
  emergency_swap_allowed: true,    // 응급 교환 허용
  
  fatigue_monitoring: true,        // 피로도 모니터링
  pattern_risk_scoring: true,      // 패턴 위험도 점수
  predictive_alerts: true          // 예측 알림
}

export function SchedulingRules({
  tenantId,
  currentRules,
  onSave,
  isSaving = false
}: SchedulingRulesProps) {
  const [rules, setRules] = useState<SchedulingRules>({
    ...DEFAULT_KOREAN_RULES,
    ...currentRules
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    const isDifferent = JSON.stringify(rules) !== JSON.stringify({
      ...DEFAULT_KOREAN_RULES,
      ...currentRules
    })
    setHasChanges(isDifferent)
  }, [rules, currentRules])

  const updateRule = <K extends keyof SchedulingRules>(
    key: K,
    value: SchedulingRules[K]
  ) => {
    setRules(prev => ({ ...prev, [key]: value }))
  }

  const resetToDefaults = () => {
    setRules({ ...DEFAULT_KOREAN_RULES })
  }

  const validateRules = (): string[] => {
    const errors: string[] = []

    // 기본 유효성 검사
    if (rules.min_rest_between_shifts < 8) {
      errors.push('최소 휴식시간은 8시간 이상이어야 합니다.')
    }
    if (rules.max_consecutive_nights > 5) {
      errors.push('연속 야간근무는 5일을 초과할 수 없습니다.')
    }
    if (rules.max_weekly_hours > 68) {
      errors.push('주간 최대 근로시간은 68시간을 초과할 수 없습니다 (한국 근로기준법).')
    }
    if (rules.min_staff_per_shift < 1) {
      errors.push('교대당 최소 인원은 1명 이상이어야 합니다.')
    }
    if (rules.team_stability_weight < 0 || rules.team_stability_weight > 100) {
      errors.push('팀 안정성 가중치는 0-100 사이여야 합니다.')
    }

    // 한국 특수 규칙 검증
    if (rules.avoid_dangerous_patterns && !rules.pattern_risk_scoring) {
      errors.push('위험 패턴 회피가 활성화된 경우 패턴 위험도 점수가 필요합니다.')
    }

    return errors
  }

  const handleSave = async () => {
    const errors = validateRules()
    setValidationErrors(errors)
    
    if (errors.length === 0) {
      await onSave(rules)
    }
  }

  return (
    <div className="space-y-6">
      {/* 유효성 검사 오류 */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 기본 제약사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            기본 제약사항 (법규 준수)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>최소 휴식시간 (시간)</Label>
              <Input
                type="number"
                min="8"
                max="24"
                value={rules.min_rest_between_shifts}
                onChange={(e) => updateRule('min_rest_between_shifts', Number(e.target.value))}
              />
              <p className="text-sm text-gray-600">한국 근로기준법: 최소 11시간 권장</p>
            </div>

            <div className="space-y-2">
              <Label>최대 연속 야간근무 (일)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={rules.max_consecutive_nights}
                onChange={(e) => updateRule('max_consecutive_nights', Number(e.target.value))}
              />
              <p className="text-sm text-gray-600">간호사 건강 보호를 위한 제한</p>
            </div>

            <div className="space-y-2">
              <Label>주간 최대 근로시간 (시간)</Label>
              <Input
                type="number"
                min="32"
                max="68"
                value={rules.max_weekly_hours}
                onChange={(e) => updateRule('max_weekly_hours', Number(e.target.value))}
              />
              <p className="text-sm text-gray-600">법정: 40시간, 연장: 최대 68시간</p>
            </div>

            <div className="space-y-2">
              <Label>교대당 최소 인원 (명)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={rules.min_staff_per_shift}
                onChange={(e) => updateRule('min_staff_per_shift', Number(e.target.value))}
              />
              <p className="text-sm text-gray-600">환자 안전을 위한 최소 간호사 수</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 한국 간호사 특수 규칙 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            한국 간호사 특수 규칙
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">위험 패턴 회피</Label>
                <p className="text-sm text-gray-600">
                  데이나오(D-N-O) 등 건강에 해로운 근무 패턴을 자동으로 회피합니다.
                </p>
              </div>
              <Switch
                checked={rules.avoid_dangerous_patterns}
                onCheckedChange={(value) => updateRule('avoid_dangerous_patterns', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">데이-나이트 간 휴식 필수</Label>
                <p className="text-sm text-gray-600">
                  데이 근무 후 나이트 근무 전에 최소 1일 휴식을 보장합니다.
                </p>
              </div>
              <Switch
                checked={rules.day_night_gap_required}
                onCheckedChange={(value) => updateRule('day_night_gap_required', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">주말 근무 공평 분배</Label>
                <p className="text-sm text-gray-600">
                  모든 간호사가 공평하게 주말 근무를 할 수 있도록 자동 분배합니다.
                </p>
              </div>
              <Switch
                checked={rules.weekend_fairness}
                onCheckedChange={(value) => updateRule('weekend_fairness', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">공휴일 추가 인력 배치</Label>
                <p className="text-sm text-gray-600">
                  공휴일에는 평소보다 많은 인력을 배치하여 안전성을 높입니다.
                </p>
              </div>
              <Switch
                checked={rules.holiday_premium_staffing}
                onCheckedChange={(value) => updateRule('holiday_premium_staffing', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 공정성 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            공정성 및 팀 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">업무량 균형 유지</Label>
                <p className="text-sm text-gray-600">
                  모든 간호사가 동등한 업무량을 갖도록 스케줄을 조정합니다.
                </p>
              </div>
              <Switch
                checked={rules.balance_workload}
                onCheckedChange={(value) => updateRule('balance_workload', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">경력별 혼합 배치</Label>
                <p className="text-sm text-gray-600">
                  신규 간호사와 경력 간호사를 적절히 혼합하여 배치합니다.
                </p>
              </div>
              <Switch
                checked={rules.experience_level_mixing}
                onCheckedChange={(value) => updateRule('experience_level_mixing', value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">팀 안정성 가중치</Label>
              <div className="px-4">
                <Slider
                  value={[rules.team_stability_weight]}
                  onValueChange={([value]) => updateRule('team_stability_weight', value)}
                  max={100}
                  min={0}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>유연성 중시</span>
                  <span className="font-medium">{rules.team_stability_weight}%</span>
                  <span>안정성 중시</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                높을수록 기존 팀 구성을 유지하려고 하고, 낮을수록 유연하게 배치합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 교환 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            근무 교환 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">관리자 승인 필수</Label>
                <p className="text-sm text-gray-600">
                  모든 근무 교환은 관리자의 최종 승인을 받아야 합니다.
                </p>
              </div>
              <Switch
                checked={rules.require_manager_approval}
                onCheckedChange={(value) => updateRule('require_manager_approval', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">응급 교환 허용</Label>
                <p className="text-sm text-gray-600">
                  응급 상황 시 즉시 처리가 가능한 교환 시스템을 활성화합니다.
                </p>
              </div>
              <Switch
                checked={rules.emergency_swap_allowed}
                onCheckedChange={(value) => updateRule('emergency_swap_allowed', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div className="space-y-1">
                <Label className="text-base font-medium">안전 교환 자동승인</Label>
                <p className="text-sm text-gray-600">
                  위험도가 낮은 교환은 자동으로 승인합니다. (현재 비활성화 권장)
                </p>
              </div>
              <Switch
                checked={rules.auto_approve_safe_swaps}
                onCheckedChange={(value) => updateRule('auto_approve_safe_swaps', value)}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고급 기능 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            고급 모니터링
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">피로도 모니터링</Label>
                <p className="text-sm text-gray-600">
                  간호사별 누적 피로도를 추적하고 위험 수준에서 알림을 발송합니다.
                </p>
              </div>
              <Switch
                checked={rules.fatigue_monitoring}
                onCheckedChange={(value) => updateRule('fatigue_monitoring', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">패턴 위험도 점수</Label>
                <p className="text-sm text-gray-600">
                  근무 패턴의 위험도를 점수화하여 관리자에게 정보를 제공합니다.
                </p>
              </div>
              <Switch
                checked={rules.pattern_risk_scoring}
                onCheckedChange={(value) => updateRule('pattern_risk_scoring', value)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">예측 알림</Label>
                <p className="text-sm text-gray-600">
                  향후 발생할 수 있는 문제를 미리 예측하여 알림을 제공합니다.
                </p>
              </div>
              <Switch
                checked={rules.predictive_alerts}
                onCheckedChange={(value) => updateRule('predictive_alerts', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={resetToDefaults}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          기본값으로 리셋
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || validationErrors.length > 0}
          className="min-w-32"
        >
          {isSaving ? (
            <Clock className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      {/* 도움말 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          이 설정들은 자동 스케줄 생성과 교환 승인 시스템에 적용됩니다. 
          한국 간호사 근무 환경에 최적화된 기본값을 권장합니다.
        </AlertDescription>
      </Alert>
    </div>
  )
}
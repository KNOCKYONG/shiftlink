'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Sun, 
  Moon, 
  Shuffle, 
  User,
  Users,
  Zap,
  Save,
  Info
} from 'lucide-react'

interface EmployeePreference {
  lifestyle_preference: 'night_owl' | 'morning_person' | 'flexible'
  fairness_option: 'prefer_my_preference' | 'prefer_team_balance' | 'auto'
  accept_day: boolean
  accept_evening: boolean
  accept_night: boolean
  weekend_night_ok: boolean
  prefer_consecutive_nights: boolean
  prefer_consecutive_days_off: boolean
  special_needs?: string
}

export function EmployeePreferenceSettings() {
  const [preferences, setPreferences] = useState<EmployeePreference>({
    lifestyle_preference: 'flexible',
    fairness_option: 'auto',
    accept_day: true,
    accept_evening: true,
    accept_night: true,
    weekend_night_ok: false,
    prefer_consecutive_nights: false,
    prefer_consecutive_days_off: true,
    special_needs: ''
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/preferences/my-preference')
      if (response.ok) {
        const data = await response.json()
        if (data.preference) {
          setPreferences(data.preference)
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    
    try {
      const response = await fetch('/api/preferences/my-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLifestyleIcon = (type: string) => {
    switch (type) {
      case 'night_owl': return <Moon className="h-5 w-5" />
      case 'morning_person': return <Sun className="h-5 w-5" />
      default: return <Shuffle className="h-5 w-5" />
    }
  }

  const getFairnessIcon = (type: string) => {
    switch (type) {
      case 'prefer_my_preference': return <User className="h-5 w-5" />
      case 'prefer_team_balance': return <Users className="h-5 w-5" />
      default: return <Zap className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">내 근무 선호도 설정</h2>
        <p className="text-gray-600 mt-1">
          스케줄 생성 시 귀하의 선호도를 최대한 반영하도록 설정할 수 있습니다
        </p>
      </div>

      {/* 근무 스타일 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>근무 스타일</CardTitle>
          <CardDescription>
            당신의 생체 리듬에 가장 적합한 근무 시간대를 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={preferences.lifestyle_preference}
            onValueChange={(value) => setPreferences({
              ...preferences,
              lifestyle_preference: value as any
            })}
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="night_owl" id="night_owl" />
              <Label htmlFor="night_owl" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">야간형 (Night Owl)</span>
                </div>
                <p className="text-sm text-gray-600">
                  밤에 집중력이 높고 야간 근무를 선호합니다
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="morning_person" id="morning_person" />
              <Label htmlFor="morning_person" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">주간형 (Morning Person)</span>
                </div>
                <p className="text-sm text-gray-600">
                  아침에 활력이 넘치고 주간 근무를 선호합니다
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="flexible" id="flexible" />
              <Label htmlFor="flexible" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Shuffle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">유연함 (Flexible)</span>
                </div>
                <p className="text-sm text-gray-600">
                  모든 시간대에 적응 가능하며 특별한 선호가 없습니다
                </p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 스케줄 배정 방식 */}
      <Card>
        <CardHeader>
          <CardTitle>스케줄 배정 방식</CardTitle>
          <CardDescription>
            스케줄 생성 시 우선순위를 어떻게 설정할지 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={preferences.fairness_option}
            onValueChange={(value) => setPreferences({
              ...preferences,
              fairness_option: value as any
            })}
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="prefer_my_preference" id="my_pref" />
              <Label htmlFor="my_pref" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="font-medium">내 선호도 최우선</span>
                </div>
                <p className="text-sm text-gray-600">
                  가능한 한 내가 선호하는 시간대에 배정됩니다
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="prefer_team_balance" id="team_balance" />
              <Label htmlFor="team_balance" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">팀 전체 균형 우선</span>
                </div>
                <p className="text-sm text-gray-600">
                  모든 팀원이 공평하게 근무하도록 배정됩니다
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">자동 (시스템 판단)</span>
                </div>
                <p className="text-sm text-gray-600">
                  상황에 따라 시스템이 최적의 방식을 선택합니다
                </p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 세부 옵션 */}
      <Card>
        <CardHeader>
          <CardTitle>세부 옵션</CardTitle>
          <CardDescription>
            추가적인 선호사항을 설정할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekend_night" className="flex items-center gap-2">
                <span>주말 야간 근무 가능</span>
                <Badge variant="secondary">추가 수당</Badge>
              </Label>
              <Switch
                id="weekend_night"
                checked={preferences.weekend_night_ok}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  weekend_night_ok: checked
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="consecutive_nights" className="flex items-center gap-2">
                <span>연속 야간 근무 선호</span>
                <Info className="h-4 w-4 text-gray-400" />
              </Label>
              <Switch
                id="consecutive_nights"
                checked={preferences.prefer_consecutive_nights}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  prefer_consecutive_nights: checked
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="consecutive_off" className="flex items-center gap-2">
                <span>연속 휴무 선호</span>
              </Label>
              <Switch
                id="consecutive_off"
                checked={preferences.prefer_consecutive_days_off}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  prefer_consecutive_days_off: checked
                })}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Label htmlFor="accept_shifts">수용 가능한 근무 시간대</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accept_day}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    accept_day: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Day</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accept_evening}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    accept_evening: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Evening</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accept_night}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    accept_night: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Night</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 특별 요청사항 */}
      <Card>
        <CardHeader>
          <CardTitle>특별 요청사항</CardTitle>
          <CardDescription>
            건강상 이유나 개인 사정 등 관리자가 알아야 할 사항을 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="예: 수면 장애로 인해 야간 근무 선호 / 육아로 인해 오전 근무 어려움 등"
            value={preferences.special_needs}
            onChange={(e) => setPreferences({
              ...preferences,
              special_needs: e.target.value
            })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="min-w-32"
        >
          {loading ? (
            '저장 중...'
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              설정 저장
            </>
          )}
        </Button>
      </div>

      {saved && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            ✓ 선호도 설정이 저장되었습니다. 다음 스케줄 생성부터 반영됩니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
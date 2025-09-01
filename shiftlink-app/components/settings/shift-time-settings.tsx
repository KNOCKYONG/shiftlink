'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface ShiftTimeSetting {
  id?: string
  shift_type: 'day' | 'evening' | 'night' | 'off'
  start_time: string
  end_time: string
  display_name: string
  korean_name: string
  color: string
  is_active: boolean
}

interface ShiftTimeSettingsProps {
  tenantId: string
  currentSettings: ShiftTimeSetting[]
  onSave: (settings: ShiftTimeSetting[]) => Promise<void>
  isSaving?: boolean
}

const DEFAULT_KOREAN_SHIFTS: ShiftTimeSetting[] = [
  {
    shift_type: 'day',
    start_time: '07:00',
    end_time: '15:00',
    display_name: 'Day Shift',
    korean_name: '데이',
    color: '#FCD34D', // yellow-300
    is_active: true
  },
  {
    shift_type: 'evening',
    start_time: '15:00',
    end_time: '23:00', 
    display_name: 'Evening Shift',
    korean_name: '이브닝',
    color: '#FB923C', // orange-400
    is_active: true
  },
  {
    shift_type: 'night',
    start_time: '23:00',
    end_time: '07:00',
    display_name: 'Night Shift',
    korean_name: '나이트',
    color: '#60A5FA', // blue-400
    is_active: true
  },
  {
    shift_type: 'off',
    start_time: '00:00',
    end_time: '23:59',
    display_name: 'Day Off',
    korean_name: '오프',
    color: '#9CA3AF', // gray-400
    is_active: true
  }
]

const SHIFT_COLORS = [
  '#FCD34D', // yellow-300 (데이)
  '#FB923C', // orange-400 (이브닝)
  '#60A5FA', // blue-400 (나이트)
  '#34D399', // green-400 (휴무)
  '#F87171', // red-400 (응급)
  '#A78BFA', // purple-400 (기타)
  '#9CA3AF'  // gray-400 (기본)
]

export function ShiftTimeSettings({
  tenantId,
  currentSettings,
  onSave,
  isSaving = false
}: ShiftTimeSettingsProps) {
  const [settings, setSettings] = useState<ShiftTimeSetting[]>(currentSettings)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    setSettings(currentSettings.length > 0 ? currentSettings : DEFAULT_KOREAN_SHIFTS)
  }, [currentSettings])

  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(currentSettings)
    setHasChanges(isDifferent)
  }, [settings, currentSettings])

  const getShiftIcon = (shiftType: string) => {
    switch (shiftType) {
      case 'day':
        return <Sun className="h-4 w-4" />
      case 'evening':
        return <Sunset className="h-4 w-4" />
      case 'night':
        return <Moon className="h-4 w-4" />
      case 'off':
        return <Coffee className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const updateSetting = (index: number, field: keyof ShiftTimeSetting, value: any) => {
    setSettings(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addCustomShift = () => {
    const newShift: ShiftTimeSetting = {
      shift_type: 'day',
      start_time: '09:00',
      end_time: '17:00',
      display_name: 'Custom Shift',
      korean_name: '커스텀',
      color: SHIFT_COLORS[0],
      is_active: true
    }
    setSettings(prev => [...prev, newShift])
  }

  const removeSetting = (index: number) => {
    setSettings(prev => prev.filter((_, i) => i !== index))
  }

  const resetToDefaults = () => {
    setSettings([...DEFAULT_KOREAN_SHIFTS])
  }

  const validateSettings = (): string[] => {
    const errors: string[] = []
    const activeShifts = settings.filter(s => s.is_active)

    // 기본 교대는 최소 3개 (데이, 이브닝, 나이트) 있어야 함
    const requiredTypes = ['day', 'evening', 'night']
    const availableTypes = activeShifts.map(s => s.shift_type)
    
    requiredTypes.forEach(type => {
      if (!availableTypes.includes(type as any)) {
        const typeName = type === 'day' ? '데이' : 
                         type === 'evening' ? '이브닝' : '나이트'
        errors.push(`${typeName} 근무 시간대가 필요합니다.`)
      }
    })

    // 시간 중복 체크
    activeShifts.forEach((shift, index) => {
      const startTime = new Date(`2000-01-01T${shift.start_time}:00`)
      const endTime = new Date(`2000-01-01T${shift.end_time}:00`)
      
      if (shift.shift_type === 'night' && endTime < startTime) {
        // 야간 근무는 다음 날 새벽에 끝남
        endTime.setDate(endTime.getDate() + 1)
      }

      if (startTime >= endTime && shift.shift_type !== 'off') {
        errors.push(`${shift.korean_name} 근무의 시작 시간이 종료 시간보다 늦거나 같습니다.`)
      }

      // 다른 교대와의 시간 충돌 검사 (오프 제외)
      if (shift.shift_type !== 'off') {
        activeShifts.forEach((otherShift, otherIndex) => {
          if (index !== otherIndex && otherShift.shift_type !== 'off') {
            const otherStart = new Date(`2000-01-01T${otherShift.start_time}:00`)
            const otherEnd = new Date(`2000-01-01T${otherShift.end_time}:00`)
            
            if (otherShift.shift_type === 'night' && otherEnd < otherStart) {
              otherEnd.setDate(otherEnd.getDate() + 1)
            }

            // 시간 중복 검사
            if ((startTime < otherEnd && endTime > otherStart) ||
                (otherStart < endTime && otherEnd > startTime)) {
              errors.push(`${shift.korean_name}와 ${otherShift.korean_name} 근무 시간이 중복됩니다.`)
            }
          }
        })
      }
    })

    // 한국어 이름 중복 체크
    const koreanNames = activeShifts.map(s => s.korean_name.toLowerCase())
    const duplicates = koreanNames.filter((name, index) => koreanNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      errors.push('중복된 한국어 이름이 있습니다.')
    }

    return [...new Set(errors)] // 중복 제거
  }

  const handleSave = async () => {
    const errors = validateSettings()
    setValidationErrors(errors)
    
    if (errors.length === 0) {
      await onSave(settings)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            근무 시간 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* 교대 설정 목록 */}
          <div className="space-y-4">
            {settings.map((setting, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${
                  setting.is_active ? 'bg-white' : 'bg-gray-50 opacity-70'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  {/* 교대 유형 및 아이콘 */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-2 rounded-full text-white"
                      style={{ backgroundColor: setting.color }}
                    >
                      {getShiftIcon(setting.shift_type)}
                    </div>
                    <Select 
                      value={setting.shift_type}
                      onValueChange={(value: any) => updateSetting(index, 'shift_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">데이</SelectItem>
                        <SelectItem value="evening">이브닝</SelectItem>
                        <SelectItem value="night">나이트</SelectItem>
                        <SelectItem value="off">오프</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 한국어 이름 */}
                  <div>
                    <Label className="text-xs text-gray-600">한국어 이름</Label>
                    <Input
                      value={setting.korean_name}
                      onChange={(e) => updateSetting(index, 'korean_name', e.target.value)}
                      placeholder="예: 데이"
                    />
                  </div>

                  {/* 시작 시간 */}
                  <div>
                    <Label className="text-xs text-gray-600">시작 시간</Label>
                    <Input
                      type="time"
                      value={setting.start_time}
                      onChange={(e) => updateSetting(index, 'start_time', e.target.value)}
                    />
                  </div>

                  {/* 종료 시간 */}
                  <div>
                    <Label className="text-xs text-gray-600">종료 시간</Label>
                    <Input
                      type="time"
                      value={setting.end_time}
                      onChange={(e) => updateSetting(index, 'end_time', e.target.value)}
                    />
                  </div>

                  {/* 색상 */}
                  <div>
                    <Label className="text-xs text-gray-600">색상</Label>
                    <div className="flex gap-1">
                      {SHIFT_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 ${
                            setting.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateSetting(index, 'color', color)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 활성/삭제 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={setting.is_active}
                      onChange={(e) => updateSetting(index, 'is_active', e.target.checked)}
                      className="rounded"
                    />
                    <Label className="text-xs">활성</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSetting(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={addCustomShift}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              커스텀 교대 추가
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              기본값으로 리셋
            </Button>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end pt-4 border-t">
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
        </CardContent>
      </Card>

      {/* 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle>미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {settings.filter(s => s.is_active).map((setting, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border text-center"
                style={{ backgroundColor: setting.color + '20', borderColor: setting.color }}
              >
                <div className="flex items-center justify-center mb-2">
                  <div 
                    className="p-2 rounded-full text-white"
                    style={{ backgroundColor: setting.color }}
                  >
                    {getShiftIcon(setting.shift_type)}
                  </div>
                </div>
                <div className="font-medium">{setting.korean_name}</div>
                <div className="text-sm text-gray-600">
                  {setting.start_time} - {setting.end_time}
                </div>
                {setting.shift_type === 'night' && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    익일 새벽
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
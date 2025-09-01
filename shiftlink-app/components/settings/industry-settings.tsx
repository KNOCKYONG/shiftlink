'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Heart, 
  Factory, 
  ShoppingCart, 
  Coffee,
  Briefcase,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface IndustrySettings {
  industryType: string
  config: {
    enableNursingMode?: boolean
    dangerousPatternDetection?: boolean
    fatigueMonitoring?: boolean
    koreanLaborLawCompliance?: boolean
    customShiftNames?: {
      day: string
      evening: string 
      night: string
      off: string
    }
  }
}

interface IndustrySettingsProps {
  tenantId: string
  onSave: (settings: IndustrySettings) => Promise<void>
  isSaving: boolean
}

const INDUSTRY_OPTIONS = [
  {
    value: 'general',
    label: '일반/기타',
    icon: Briefcase,
    description: '표준 교대 근무 스케줄링'
  },
  {
    value: 'healthcare_nursing',
    label: '의료/간호',
    icon: Heart,
    description: '간호사 3교대 특화 기능 (데이나오 패턴 회피, 피로도 관리)',
    specialFeatures: ['데이나오 패턴 회피', '연속 야간 제한', '피로도 모니터링', '한국 근로기준법 준수']
  },
  {
    value: 'manufacturing',
    label: '제조업',
    icon: Factory,
    description: '제조업 교대 근무 최적화'
  },
  {
    value: 'retail',
    label: '소매/서비스업',
    icon: ShoppingCart,
    description: '매장 운영 시간에 맞춘 스케줄링'
  },
  {
    value: 'hospitality',
    label: '호텔/요식업',
    icon: Coffee,
    description: '24시간 서비스업 스케줄 관리'
  }
]

export function IndustrySettings({ tenantId, onSave, isSaving }: IndustrySettingsProps) {
  const [settings, setSettings] = useState<IndustrySettings>({
    industryType: 'general',
    config: {}
  })
  const [loading, setLoading] = useState(true)
  const [hasChanged, setHasChanged] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [tenantId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // 테넌트 정보와 업종 설정 로드
      const [tenantResponse, configResponse] = await Promise.all([
        fetch(`/api/tenant/${tenantId}`),
        fetch(`/api/settings/industry`)
      ])
      
      const tenantData = await tenantResponse.json()
      const configData = await configResponse.json()
      
      if (tenantResponse.ok) {
        setSettings({
          industryType: tenantData.industry_type || 'general',
          config: configData.config || {}
        })
      }
    } catch (error) {
      console.error('Failed to load industry settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIndustryChange = (industryType: string) => {
    const industry = INDUSTRY_OPTIONS.find(opt => opt.value === industryType)
    const newConfig = { ...settings.config }
    
    // 간호사 업종 선택 시 특화 기능 활성화
    if (industryType === 'healthcare_nursing') {
      newConfig.enableNursingMode = true
      newConfig.dangerousPatternDetection = true
      newConfig.fatigueMonitoring = true
      newConfig.koreanLaborLawCompliance = true
      newConfig.customShiftNames = {
        day: '데이',
        evening: '이브닝',
        night: '나이트',
        off: '오프'
      }
    } else {
      // 다른 업종 선택 시 일반 모드
      newConfig.enableNursingMode = false
      newConfig.dangerousPatternDetection = false
      newConfig.fatigueMonitoring = false
      newConfig.koreanLaborLawCompliance = false
      newConfig.customShiftNames = {
        day: 'Day',
        evening: 'Evening',
        night: 'Night',
        off: 'Off'
      }
    }

    setSettings({
      industryType,
      config: newConfig
    })
    setHasChanged(true)
  }

  const handleSave = async () => {
    try {
      await onSave(settings)
      setHasChanged(false)
    } catch (error) {
      console.error('Failed to save industry settings:', error)
    }
  }

  const selectedIndustry = INDUSTRY_OPTIONS.find(opt => opt.value === settings.industryType)
  const isNursingMode = settings.industryType === 'healthcare_nursing'

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            업종 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p>설정을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          업종 설정
        </CardTitle>
        <p className="text-sm text-gray-600">
          업종에 맞는 스케줄링 기능을 활성화합니다.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 업종 선택 */}
        <div className="space-y-3">
          <label className="text-sm font-medium">업종 선택</label>
          <Select
            value={settings.industryType}
            onValueChange={handleIndustryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="업종을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((industry) => {
                const Icon = industry.icon
                return (
                  <SelectItem key={industry.value} value={industry.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{industry.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 선택된 업종 정보 */}
        {selectedIndustry && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              {React.createElement(selectedIndustry.icon, { className: "h-5 w-5" })}
              <h3 className="font-medium">{selectedIndustry.label}</h3>
              {isNursingMode && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  특화 기능 활성화
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{selectedIndustry.description}</p>
            
            {selectedIndustry.specialFeatures && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">활성화되는 특화 기능:</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedIndustry.specialFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 간호사 모드 활성화 시 추가 설명 */}
        {isNursingMode && (
          <>
            <Separator />
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                <strong>간호사 특화 모드가 활성화되었습니다.</strong>
                <br />
                • 교대명이 한국어로 표시됩니다 (데이/이브닝/나이트/오프)
                <br />
                • 데이나오 패턴(연속 3교대) 자동 회피 기능이 활성화됩니다
                <br />
                • 피로도 모니터링 및 연속 야간 근무 제한이 적용됩니다
                <br />
                • 한국 근로기준법에 맞는 11시간 휴식시간이 보장됩니다
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* 교대명 미리보기 */}
        {settings.config.customShiftNames && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">교대명 미리보기</h4>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-yellow-100 rounded">
                  <p className="text-sm font-medium">{settings.config.customShiftNames.day}</p>
                  <p className="text-xs text-gray-600">주간</p>
                </div>
                <div className="text-center p-2 bg-orange-100 rounded">
                  <p className="text-sm font-medium">{settings.config.customShiftNames.evening}</p>
                  <p className="text-xs text-gray-600">저녁</p>
                </div>
                <div className="text-center p-2 bg-blue-100 rounded">
                  <p className="text-sm font-medium">{settings.config.customShiftNames.night}</p>
                  <p className="text-xs text-gray-600">야간</p>
                </div>
                <div className="text-center p-2 bg-gray-100 rounded">
                  <p className="text-sm font-medium">{settings.config.customShiftNames.off}</p>
                  <p className="text-xs text-gray-600">휴무</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanged || isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? '저장 중...' : '설정 저장'}
          </Button>
        </div>

        {/* 경고 메시지 */}
        {hasChanged && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              변경사항이 저장되지 않았습니다. 설정을 저장하지 않고 페이지를 떠나면 변경사항이 손실됩니다.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
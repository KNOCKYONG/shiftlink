'use client'

import { useState, useEffect } from 'react'
import { ShiftTimeSettings } from '@/components/settings/shift-time-settings'
import { SchedulingRules } from '@/components/settings/scheduling-rules'
import { IndustrySettings } from '@/components/settings/industry-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings,
  Clock,
  Shield,
  Users,
  Bell,
  Building2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
  tenantId: string
  employeeId: string
}

interface SettingsPageProps {
  user: User
}

export function SettingsPage({ user }: SettingsPageProps) {
  const [shiftSettings, setShiftSettings] = useState([])
  const [schedulingRules, setSchedulingRules] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // 교대 시간 설정 로드
      const shiftResponse = await fetch('/api/settings/shift-times')
      const shiftData = await shiftResponse.json()
      if (shiftResponse.ok) {
        setShiftSettings(shiftData.settings || [])
      }

      // 스케줄링 규칙 로드
      const rulesResponse = await fetch('/api/settings/scheduling-rules')
      const rulesData = await rulesResponse.json()
      if (rulesResponse.ok) {
        setSchedulingRules(rulesData.rules || {})
      }

    } catch (error) {
      console.error('Settings load error:', error)
      setError('설정을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleShiftSettingsSave = async (settings: any[]) => {
    try {
      setSaving('shift-times')
      setError('')
      
      const response = await fetch('/api/settings/shift-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      const data = await response.json()
      
      if (response.ok) {
        setShiftSettings(settings)
        setSavedMessage('근무 시간 설정이 저장되었습니다.')
        setTimeout(() => setSavedMessage(''), 3000)
      } else {
        throw new Error(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Shift settings save error:', error)
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving('')
    }
  }

  const handleSchedulingRulesSave = async (rules: any) => {
    try {
      setSaving('scheduling-rules')
      setError('')
      
      const response = await fetch('/api/settings/scheduling-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })

      const data = await response.json()
      
      if (response.ok) {
        setSchedulingRules(rules)
        setSavedMessage('스케줄링 규칙이 저장되었습니다.')
        setTimeout(() => setSavedMessage(''), 3000)
      } else {
        throw new Error(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Scheduling rules save error:', error)
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving('')
    }
  }

  const handleIndustrySettingsSave = async (settings: any) => {
    try {
      setSaving('industry-settings')
      setError('')
      
      const response = await fetch('/api/settings/industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      
      if (response.ok) {
        setSavedMessage('업종 설정이 저장되었습니다.')
        setTimeout(() => setSavedMessage(''), 3000)
        
        // 간호사 모드 활성화 시 페이지 새로고침 권장
        if (settings.industryType === 'healthcare_nursing' && settings.config?.enableNursingMode) {
          setSavedMessage('간호사 특화 모드가 활성화되었습니다. 모든 기능을 적용하려면 페이지를 새로고침해주세요.')
        }
      } else {
        throw new Error(data.error || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Industry settings save error:', error)
      setError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-gray-400 animate-spin" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">설정</h1>
            <p className="text-gray-600">설정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">설정</h1>
              <p className="text-gray-600 mt-1">
                스케줄링 시스템 설정을 관리합니다.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {user.role === 'admin' ? '관리자' : '매니저'}
        </Badge>
      </div>

      {/* 성공/오류 메시지 */}
      {savedMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{savedMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 설정 탭 */}
      <Tabs defaultValue="industry-settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="industry-settings" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            업종
          </TabsTrigger>
          <TabsTrigger value="shift-times" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            근무시간
          </TabsTrigger>
          <TabsTrigger value="scheduling-rules" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            스케줄링 규칙
          </TabsTrigger>
          <TabsTrigger value="team-settings" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            팀 설정
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            알림
          </TabsTrigger>
        </TabsList>

        {/* 업종 설정 */}
        <TabsContent value="industry-settings">
          <IndustrySettings
            tenantId={user.tenantId}
            onSave={handleIndustrySettingsSave}
            isSaving={saving === 'industry-settings'}
          />
        </TabsContent>

        {/* 근무 시간 설정 */}
        <TabsContent value="shift-times">
          <ShiftTimeSettings
            tenantId={user.tenantId}
            currentSettings={shiftSettings}
            onSave={handleShiftSettingsSave}
            isSaving={saving === 'shift-times'}
          />
        </TabsContent>

        {/* 스케줄링 규칙 */}
        <TabsContent value="scheduling-rules">
          <SchedulingRules
            tenantId={user.tenantId}
            currentRules={schedulingRules}
            onSave={handleSchedulingRulesSave}
            isSaving={saving === 'scheduling-rules'}
          />
        </TabsContent>

        {/* 팀 설정 */}
        <TabsContent value="team-settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                팀 및 조직 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">팀 설정 기능</p>
                <p className="text-sm mt-2">팀 구조, 권한, 조직도 설정 기능이 곧 추가됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 알림 설정 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                알림 및 메시지 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium">알림 설정 기능</p>
                <p className="text-sm mt-2">이메일, 카카오톡, 앱 알림 설정 기능이 곧 추가됩니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 도움말 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            💡 설정 사용 가이드
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>근무시간 설정</strong>: 각 교대의 시작/종료 시간과 표시 색상을 설정합니다.</p>
            <p>• <strong>스케줄링 규칙</strong>: 자동 스케줄 생성 시 적용되는 제약사항과 정책을 설정합니다.</p>
            <p>• <strong>한국 간호사 특화</strong>: 데이나오 패턴 회피, 연속 야간 제한 등이 적용됩니다.</p>
            <p>• <strong>법규 준수</strong>: 근로기준법에 따른 최소 휴식시간과 주간 근로시간이 자동 적용됩니다.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
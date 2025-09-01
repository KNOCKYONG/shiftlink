'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Clock, 
  Users, 
  Shield, 
  Bell, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwapSettings {
  id?: string
  tenant_id: string
  admin_approval_required: boolean
  allow_cross_shift_type: boolean
  allow_cross_team: boolean
  max_advance_days: number
  auto_approve_same_level: boolean
  auto_approve_same_team: boolean
  auto_approve_within_hours: number
  max_pending_requests_per_employee: number
  cooldown_hours: number
  notify_managers: boolean
  notify_team_members: boolean
  send_email_notifications: boolean
  send_kakao_notifications: boolean
}

interface SwapSettingsProps {
  onSave?: (settings: SwapSettings) => void
  className?: string
}

export function SwapSettings({ onSave, className }: SwapSettingsProps) {
  const [settings, setSettings] = useState<SwapSettings>({
    tenant_id: '',
    admin_approval_required: false,
    allow_cross_shift_type: true,
    allow_cross_team: false,
    max_advance_days: 30,
    auto_approve_same_level: true,
    auto_approve_same_team: true,
    auto_approve_within_hours: 24,
    max_pending_requests_per_employee: 5,
    cooldown_hours: 24,
    notify_managers: true,
    notify_team_members: false,
    send_email_notifications: true,
    send_kakao_notifications: false
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 설정 불러오기
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/swap-settings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/swap-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      if (onSave) {
        onSave(data.settings)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SwapSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            교환 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          교환 설정
        </CardTitle>
        <CardDescription>
          직원들 간의 근무 교환 요청 처리 방식을 설정합니다.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>설정이 저장되었습니다.</AlertDescription>
          </Alert>
        )}

        {/* 승인 방식 설정 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <h3 className="font-medium">승인 방식</h3>
          </div>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="admin-approval">관리자 승인 필수</Label>
                <p className="text-sm text-muted-foreground">
                  모든 교환 요청에 관리자 승인이 필요합니다
                </p>
              </div>
              <Switch
                id="admin-approval"
                checked={settings.admin_approval_required}
                onCheckedChange={(checked) => updateSetting('admin_approval_required', checked)}
              />
            </div>

            {!settings.admin_approval_required && (
              <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                <div className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">자동 승인 조건</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-same-level">같은 레벨끼리 자동 승인</Label>
                    <p className="text-sm text-muted-foreground">
                      동일한 직급의 직원끼리는 자동으로 승인됩니다
                    </p>
                  </div>
                  <Switch
                    id="auto-same-level"
                    checked={settings.auto_approve_same_level}
                    onCheckedChange={(checked) => updateSetting('auto_approve_same_level', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-same-team">같은 팀끼리 자동 승인</Label>
                    <p className="text-sm text-muted-foreground">
                      동일한 팀의 직원끼리는 자동으로 승인됩니다
                    </p>
                  </div>
                  <Switch
                    id="auto-same-team"
                    checked={settings.auto_approve_same_team}
                    onCheckedChange={(checked) => updateSetting('auto_approve_same_team', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-hours">자동 승인 기간 제한 (시간)</Label>
                  <Input
                    id="auto-hours"
                    type="number"
                    value={settings.auto_approve_within_hours}
                    onChange={(e) => updateSetting('auto_approve_within_hours', parseInt(e.target.value))}
                    min={1}
                    max={720}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    이 시간 내의 교환만 자동 승인됩니다 (최대 720시간 = 30일)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* 교환 허용 범위 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h3 className="font-medium">교환 허용 범위</h3>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="cross-shift">다른 시프트 유형과 교환</Label>
                <p className="text-sm text-muted-foreground">
                  야간과 주간 등 다른 시프트끼리 교환을 허용합니다
                </p>
              </div>
              <Switch
                id="cross-shift"
                checked={settings.allow_cross_shift_type}
                onCheckedChange={(checked) => updateSetting('allow_cross_shift_type', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="cross-team">다른 팀과 교환</Label>
                <p className="text-sm text-muted-foreground">
                  서로 다른 팀의 직원끼리 교환을 허용합니다
                </p>
              </div>
              <Switch
                id="cross-team"
                checked={settings.allow_cross_team}
                onCheckedChange={(checked) => updateSetting('allow_cross_team', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 시간 및 수량 제한 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h3 className="font-medium">시간 및 수량 제한</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="max-days">최대 사전 신청 일수</Label>
              <Input
                id="max-days"
                type="number"
                value={settings.max_advance_days}
                onChange={(e) => updateSetting('max_advance_days', parseInt(e.target.value))}
                min={1}
                max={90}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                몇 일 전까지 교환 신청이 가능한지 설정합니다
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-requests">직원당 최대 대기 요청</Label>
              <Input
                id="max-requests"
                type="number"
                value={settings.max_pending_requests_per_employee}
                onChange={(e) => updateSetting('max_pending_requests_per_employee', parseInt(e.target.value))}
                min={1}
                max={20}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                한 직원이 동시에 대기할 수 있는 교환 요청 수
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">거부 후 재신청 대기시간</Label>
              <Input
                id="cooldown"
                type="number"
                value={settings.cooldown_hours}
                onChange={(e) => updateSetting('cooldown_hours', parseInt(e.target.value))}
                min={0}
                max={168}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                거부된 후 같은 상대에게 다시 신청까지 대기시간 (시간)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* 알림 설정 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="font-medium">알림 설정</h3>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-managers">매니저에게 알림</Label>
                <p className="text-sm text-muted-foreground">
                  새로운 교환 요청이 있을 때 매니저에게 알림을 보냅니다
                </p>
              </div>
              <Switch
                id="notify-managers"
                checked={settings.notify_managers}
                onCheckedChange={(checked) => updateSetting('notify_managers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notify-team">팀원들에게 알림</Label>
                <p className="text-sm text-muted-foreground">
                  교환이 승인되면 해당 팀원들에게 알림을 보냅니다
                </p>
              </div>
              <Switch
                id="notify-team"
                checked={settings.notify_team_members}
                onCheckedChange={(checked) => updateSetting('notify_team_members', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notify">이메일 알림</Label>
                <p className="text-sm text-muted-foreground">
                  교환 관련 알림을 이메일로도 발송합니다
                </p>
              </div>
              <Switch
                id="email-notify"
                checked={settings.send_email_notifications}
                onCheckedChange={(checked) => updateSetting('send_email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="kakao-notify">카카오톡 알림</Label>
                <p className="text-sm text-muted-foreground">
                  교환 관련 알림을 카카오톡으로도 발송합니다
                </p>
              </div>
              <Switch
                id="kakao-notify"
                checked={settings.send_kakao_notifications}
                onCheckedChange={(checked) => updateSetting('send_kakao_notifications', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 설정 요약 */}
        <div className="space-y-4">
          <h3 className="font-medium">현재 설정 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Badge variant={settings.admin_approval_required ? "destructive" : "default"}>
              {settings.admin_approval_required ? "관리자 승인 필수" : "자동 승인 활성"}
            </Badge>
            <Badge variant={settings.allow_cross_team ? "default" : "secondary"}>
              {settings.allow_cross_team ? "팀 간 교환 허용" : "팀 내 교환만"}
            </Badge>
            <Badge variant="outline">
              최대 {settings.max_advance_days}일 전 신청
            </Badge>
            <Badge variant="outline">
              직원당 최대 {settings.max_pending_requests_per_employee}개 요청
            </Badge>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
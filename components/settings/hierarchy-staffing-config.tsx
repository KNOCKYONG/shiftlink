'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Users, Settings, ArrowUpDown } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface StaffingRequirement {
  min_required: number
  max_allowed: number
  preferred: number
  priority_weight: number
}

interface HierarchyStaffingConfig {
  id: string
  hierarchy_level: number
  role_name: string
  day_shift: StaffingRequirement
  evening_shift: StaffingRequirement
  night_shift: StaffingRequirement
  priority_order: number
  can_work_alone: boolean
  requires_supervision: boolean
  can_supervise_levels: number[]
  is_active: boolean
}

interface ExchangeGroup {
  id: string
  group_name: string
  hierarchy_level: number
  role_name: string
  member_count: number
  exchange_rules: {
    allow_cross_team: boolean
    require_same_experience_range: boolean
    max_experience_gap_years: number
    require_same_certifications: boolean
  }
  is_active: boolean
}

export default function HierarchyStaffingConfig() {
  const [configs, setConfigs] = useState<HierarchyStaffingConfig[]>([])
  const [exchangeGroups, setExchangeGroups] = useState<ExchangeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('staffing')

  useEffect(() => {
    loadConfigurations()
    loadExchangeGroups()
  }, [])

  const loadConfigurations = async () => {
    try {
      const response = await fetch('/api/settings/hierarchy-staffing')
      if (!response.ok) throw new Error('Failed to load configurations')
      const data = await response.json()
      setConfigs(data)
    } catch (error) {
      console.error('Error loading configurations:', error)
      toast.error('설정을 불러오는데 실패했습니다')
    }
  }

  const loadExchangeGroups = async () => {
    try {
      const response = await fetch('/api/settings/exchange-groups')
      if (!response.ok) throw new Error('Failed to load exchange groups')
      const data = await response.json()
      setExchangeGroups(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading exchange groups:', error)
      toast.error('교환 그룹을 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  const updateStaffingRequirement = (
    configId: string,
    shift: 'day_shift' | 'evening_shift' | 'night_shift',
    field: keyof StaffingRequirement,
    value: number
  ) => {
    setConfigs(prev =>
      prev.map(config =>
        config.id === configId
          ? {
              ...config,
              [shift]: {
                ...config[shift],
                [field]: value
              }
            }
          : config
      )
    )
  }

  const saveConfigurations = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/hierarchy-staffing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurations: configs })
      })
      
      if (!response.ok) throw new Error('Failed to save configurations')
      
      toast.success('설정이 저장되었습니다')
    } catch (error) {
      console.error('Error saving configurations:', error)
      toast.error('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const createExchangeGroup = async (groupName: string, hierarchyLevel: number, roleName: string) => {
    try {
      const response = await fetch('/api/settings/exchange-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: groupName,
          hierarchy_level: hierarchyLevel,
          role_name: roleName
        })
      })
      
      if (!response.ok) throw new Error('Failed to create exchange group')
      
      await loadExchangeGroups()
      toast.success('교환 그룹이 생성되었습니다')
    } catch (error) {
      console.error('Error creating exchange group:', error)
      toast.error('교환 그룹 생성에 실패했습니다')
    }
  }

  const renderShiftConfig = (
    config: HierarchyStaffingConfig,
    shift: 'day_shift' | 'evening_shift' | 'night_shift',
    shiftName: string
  ) => {
    const shiftConfig = config[shift]
    
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{shiftName}</h4>
          <Badge variant={shift === 'night_shift' ? 'destructive' : 'default'}>
            가중치: {shiftConfig.priority_weight}×
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-600">최소 인원</Label>
            <Input
              type="number"
              min="0"
              value={shiftConfig.min_required}
              onChange={(e) =>
                updateStaffingRequirement(
                  config.id,
                  shift,
                  'min_required',
                  parseInt(e.target.value) || 0
                )
              }
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs text-gray-600">적정 인원</Label>
            <Input
              type="number"
              min="0"
              value={shiftConfig.preferred}
              onChange={(e) =>
                updateStaffingRequirement(
                  config.id,
                  shift,
                  'preferred',
                  parseInt(e.target.value) || 0
                )
              }
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs text-gray-600">최대 인원</Label>
            <Input
              type="number"
              min="0"
              value={shiftConfig.max_allowed}
              onChange={(e) =>
                updateStaffingRequirement(
                  config.id,
                  shift,
                  'max_allowed',
                  parseInt(e.target.value) || 0
                )
              }
              className="mt-1"
            />
          </div>
        </div>
        
        {shiftConfig.min_required > shiftConfig.preferred && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              최소 인원이 적정 인원보다 많습니다
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">계층별 인력 배치 설정</h2>
        <p className="text-gray-600 mt-1">
          간호사 계층별 교대 근무 인원 요구사항을 설정하고 교환 그룹을 관리합니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staffing" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            인력 배치 요구사항
          </TabsTrigger>
          <TabsTrigger value="exchange" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            교환 그룹 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staffing" className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline">Level {config.hierarchy_level}</Badge>
                      {config.role_name}
                    </CardTitle>
                    <CardDescription>
                      {config.requires_supervision ? '감독 필요' : '독립 근무 가능'} • 
                      {config.can_work_alone ? ' 단독 근무 가능' : ' 단독 근무 불가'}
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${config.id}`} className="text-sm">
                      활성화
                    </Label>
                    <Switch
                      id={`active-${config.id}`}
                      checked={config.is_active}
                      onCheckedChange={(checked) =>
                        setConfigs(prev =>
                          prev.map(c =>
                            c.id === config.id ? { ...c, is_active: checked } : c
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderShiftConfig(config, 'day_shift', '데이 (06:00-14:00)')}
                  {renderShiftConfig(config, 'evening_shift', '이브닝 (14:00-22:00)')}
                  {renderShiftConfig(config, 'night_shift', '나이트 (22:00-06:00)')}
                </div>
                
                {config.can_supervise_levels.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">감독 가능 레벨</span>
                    </div>
                    <div className="flex gap-1">
                      {config.can_supervise_levels.map(level => (
                        <Badge key={level} variant="secondary">
                          Level {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-end">
            <Button onClick={saveConfigurations} disabled={saving}>
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>교환 그룹 관리</CardTitle>
              <CardDescription>
                동일 계층 간 근무 교환이 가능한 그룹을 관리합니다
              </CardDescription>
            </CardHeader>
          </Card>
          
          {exchangeGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="outline">Level {group.hierarchy_level}</Badge>
                      {group.group_name}
                    </CardTitle>
                    <CardDescription>
                      {group.role_name} • 구성원 {group.member_count}명
                    </CardDescription>
                  </div>
                  
                  <Badge variant={group.is_active ? 'default' : 'secondary'}>
                    {group.is_active ? '활성' : '비활성'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">팀 간 교환:</span>
                    <p className={group.exchange_rules.allow_cross_team ? 'text-green-600' : 'text-red-600'}>
                      {group.exchange_rules.allow_cross_team ? '허용' : '불허'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium">경력 일치:</span>
                    <p className={group.exchange_rules.require_same_experience_range ? 'text-green-600' : 'text-red-600'}>
                      {group.exchange_rules.require_same_experience_range ? '필요' : '불필요'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium">경력 차이:</span>
                    <p>최대 {group.exchange_rules.max_experience_gap_years}년</p>
                  </div>
                  
                  <div>
                    <span className="font-medium">자격증 일치:</span>
                    <p className={group.exchange_rules.require_same_certifications ? 'text-green-600' : 'text-red-600'}>
                      {group.exchange_rules.require_same_certifications ? '필요' : '불필요'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-dashed border-2">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">새로운 교환 그룹을 추가하세요</p>
                <Button variant="outline">
                  교환 그룹 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  UserPlus,
  Shield,
  Star,
  GraduationCap,
  Award,
  Crown,
  Zap,
  Target,
  Briefcase,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Settings2,
  Info
} from 'lucide-react'

interface HierarchyLevel {
  id?: string
  level: number
  role_name: string
  min_required: number
  distribution_ratio: number
  priority_on_conflict: 'higher' | 'lower' | 'balanced'
  color: string
  icon: string
}

interface OrganizationHierarchyProps {
  teamId: string
  tenantId: string
}

const DEFAULT_LEVELS: HierarchyLevel[] = [
  { level: 1, role_name: '팀장', min_required: 1, distribution_ratio: 1, priority_on_conflict: 'balanced', color: 'bg-purple-600', icon: 'Crown' },
  { level: 2, role_name: '시니어', min_required: 2, distribution_ratio: 2, priority_on_conflict: 'balanced', color: 'bg-purple-500', icon: 'Shield' },
  { level: 3, role_name: '주니어', min_required: 3, distribution_ratio: 2, priority_on_conflict: 'balanced', color: 'bg-indigo-500', icon: 'Star' }
]

const LEVEL_ICONS = {
  Crown: Crown,        // Level 1
  Shield: Shield,      // Level 2
  Star: Star,          // Level 3
  Award: Award,        // Level 4
  Briefcase: Briefcase,// Level 5
  Target: Target,      // Level 6
  Zap: Zap,           // Level 7
  GraduationCap: GraduationCap, // Level 8
  UserPlus: UserPlus,  // Level 9
  Users: Users        // Level 10
}

export default function OrganizationHierarchy({ teamId, tenantId }: OrganizationHierarchyProps) {
  const [levels, setLevels] = useState<HierarchyLevel[]>(DEFAULT_LEVELS)
  const [employeeDistribution, setEmployeeDistribution] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadHierarchy()
    loadEmployeeDistribution()
  }, [teamId])

  const loadHierarchy = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organization_hierarchy')
        .select('*')
        .eq('team_id', teamId)
        .order('level', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setLevels(data.map(item => ({
          ...item,
          distribution_ratio: item.distribution_ratio || (item.level === 1 ? 1 : 2),
          color: getLevelColor(item.level),
          icon: getLevelIcon(item.level)
        })))
      }
    } catch (error) {
      console.error('Failed to load hierarchy:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('level')
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (error) throw error

      const distribution: Record<number, number> = {}
      data?.forEach(emp => {
        const level = emp.level || 3
        distribution[level] = (distribution[level] || 0) + 1
      })
      setEmployeeDistribution(distribution)
    } catch (error) {
      console.error('Failed to load distribution:', error)
    }
  }

  const getLevelColor = (level: number): string => {
    const colors = [
      'bg-purple-600',  // Level 1 - 최고 관리자
      'bg-purple-500',  // Level 2
      'bg-indigo-500',  // Level 3
      'bg-blue-500',    // Level 4
      'bg-cyan-500',    // Level 5
      'bg-teal-500',    // Level 6
      'bg-green-500',   // Level 7
      'bg-lime-500',    // Level 8
      'bg-yellow-500',  // Level 9
      'bg-orange-500'   // Level 10 - 신입
    ]
    return colors[level - 1] || 'bg-gray-500'
  }

  const getLevelIcon = (level: number): string => {
    const icons = [
      'Crown',          // Level 1 - 최고 관리자
      'Shield',         // Level 2
      'Star',           // Level 3
      'Award',          // Level 4
      'Briefcase',      // Level 5
      'Target',         // Level 6
      'Zap',            // Level 7
      'GraduationCap',  // Level 8
      'UserPlus',       // Level 9
      'Users'           // Level 10 - 신입
    ]
    return icons[level - 1] || 'Users'
  }

  const handleAddLevel = () => {
    const newLevel = levels.length + 1
    setLevels([...levels, {
      level: newLevel,
      role_name: `레벨 ${newLevel}`,
      min_required: 1,
      distribution_ratio: 1,
      priority_on_conflict: 'balanced',
      color: getLevelColor(newLevel),
      icon: getLevelIcon(newLevel)
    }])
  }

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      toast.error('최소 1개의 레벨은 필요합니다')
      return
    }
    const newLevels = levels.filter((_, i) => i !== index)
    // Reorder levels
    newLevels.forEach((level, i) => {
      level.level = i + 1
      level.color = getLevelColor(i + 1)
      level.icon = getLevelIcon(i + 1)
    })
    setLevels(newLevels)
  }

  const handleLevelChange = (index: number, field: keyof HierarchyLevel, value: any) => {
    const newLevels = [...levels]
    newLevels[index] = { ...newLevels[index], [field]: value }
    setLevels(newLevels)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Delete existing hierarchy for this team
      await supabase
        .from('organization_hierarchy')
        .delete()
        .eq('team_id', teamId)

      // Insert new hierarchy
      const { error } = await supabase
        .from('organization_hierarchy')
        .insert(
          levels.map(level => ({
            tenant_id: tenantId,
            team_id: teamId,
            level: level.level,
            role_name: level.role_name,
            min_required: level.min_required,
            distribution_ratio: level.distribution_ratio,
            priority_on_conflict: level.priority_on_conflict
          }))
        )

      if (error) throw error

      toast.success('조직 구조가 저장되었습니다')
    } catch (error) {
      console.error('Failed to save hierarchy:', error)
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const calculateBalance = (): number => {
    const totalEmployees = Object.values(employeeDistribution).reduce((sum, count) => sum + count, 0)
    if (totalEmployees === 0) return 0

    const idealDistribution = 100 / levels.length
    let deviationSum = 0

    levels.forEach(level => {
      const actual = ((employeeDistribution[level.level] || 0) / totalEmployees) * 100
      deviationSum += Math.abs(actual - idealDistribution)
    })

    return Math.max(0, 100 - deviationSum)
  }

  const checkMinRequirements = (): { met: boolean; warnings: string[] } => {
    const warnings: string[] = []
    let allMet = true

    levels.forEach(level => {
      const current = employeeDistribution[level.level] || 0
      if (current < level.min_required) {
        warnings.push(`${level.role_name}: 최소 ${level.min_required}명 필요 (현재 ${current}명)`)
        allMet = false
      }
    })

    return { met: allMet, warnings }
  }

  const balanceScore = calculateBalance()
  const requirementCheck = checkMinRequirements()

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            조직 구조 현황
          </CardTitle>
          <CardDescription>
            팀의 계층 구조와 레벨별 인원 분포를 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">균형도</span>
              <span className="text-sm text-muted-foreground">{balanceScore.toFixed(0)}%</span>
            </div>
            <Progress value={balanceScore} className="h-2" />
            {balanceScore < 50 && (
              <p className="text-xs text-orange-600">
                레벨 간 인원 분포가 불균형합니다. 조정이 필요할 수 있습니다.
              </p>
            )}
          </div>

          {/* Requirement Warnings */}
          {!requirementCheck.met && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">최소 인원 미충족</p>
                  {requirementCheck.warnings.map((warning, i) => (
                    <p key={i} className="text-sm">{warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Current Distribution */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {levels.map(level => {
              const IconComponent = LEVEL_ICONS[level.icon as keyof typeof LEVEL_ICONS] || Users
              const count = employeeDistribution[level.level] || 0
              const percentage = Object.values(employeeDistribution).reduce((sum, c) => sum + c, 0) > 0
                ? (count / Object.values(employeeDistribution).reduce((sum, c) => sum + c, 0)) * 100
                : 0

              return (
                <div key={level.level} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${level.color} bg-opacity-20`}>
                      <IconComponent className={`w-4 h-4 ${level.color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="text-sm font-medium">{level.role_name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{count}명</div>
                    <div className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</div>
                    {count < level.min_required && (
                      <Badge variant="destructive" className="text-xs">
                        -{level.min_required - count}명 부족
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            레벨별 설정
          </CardTitle>
          <CardDescription>
            각 레벨의 명칭, 최소 필요 인원, 우선순위를 설정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {levels.map((level, index) => {
            const IconComponent = LEVEL_ICONS[level.icon as keyof typeof LEVEL_ICONS] || Users
            
            return (
              <Card key={index} className="border-l-4" style={{ borderLeftColor: level.color.replace('bg-', '#').replace('500', '') }}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Level Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${level.color} bg-opacity-20`}>
                          <IconComponent className={`w-5 h-5 ${level.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div>
                          <Input
                            value={level.role_name}
                            onChange={(e) => handleLevelChange(index, 'role_name', e.target.value)}
                            className="font-medium text-lg border-0 p-0 h-auto focus-visible:ring-0"
                            placeholder="역할 이름"
                          />
                          <p className="text-sm text-muted-foreground">레벨 {level.level}</p>
                        </div>
                      </div>
                      {levels.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLevel(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Configuration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Minimum Required */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          최소 필요 인원: {level.min_required}명
                        </Label>
                        <Slider
                          value={[level.min_required]}
                          onValueChange={([value]) => handleLevelChange(index, 'min_required', value)}
                          min={0}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          각 시간대별 최소 인원
                        </p>
                      </div>

                      {/* Distribution Ratio */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          배치 비율: {level.distribution_ratio}
                        </Label>
                        <Slider
                          value={[level.distribution_ratio]}
                          onValueChange={([value]) => handleLevelChange(index, 'distribution_ratio', value)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          상대적 배치 비율
                        </p>
                      </div>

                      {/* Priority on Conflict */}
                      <div className="space-y-2">
                        <Label className="text-sm">충돌 시 우선순위</Label>
                        <Select
                          value={level.priority_on_conflict}
                          onValueChange={(value) => handleLevelChange(index, 'priority_on_conflict', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="higher">
                              <div className="flex items-center gap-2">
                                <ArrowUp className="w-3 h-3" />
                                상위 레벨 우선
                              </div>
                            </SelectItem>
                            <SelectItem value="lower">
                              <div className="flex items-center gap-2">
                                <ArrowDown className="w-3 h-3" />
                                하위 레벨 우선
                              </div>
                            </SelectItem>
                            <SelectItem value="balanced">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-3 h-3" />
                                균형 배분
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Level Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>현재: {employeeDistribution[level.level] || 0}명</span>
                      </div>
                      {level.min_required > 0 && (
                        <div className="flex items-center gap-1">
                          {(employeeDistribution[level.level] || 0) >= level.min_required ? (
                            <Badge variant="secondary" className="text-xs">충족</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">미충족</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Add Level Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddLevel}
            disabled={levels.length >= 10}
          >
            <Plus className="w-4 h-4 mr-2" />
            레벨 추가 ({levels.length}/10)
          </Button>

          {/* Info Box */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>
                <strong>스케줄 생성 3단계 프로세스:</strong>
              </p>
              <ol className="text-sm space-y-1 ml-4">
                <li>1. <strong>선 요구사항 우선 배치</strong> - 고정 근무, 휴가, 제약사항</li>
                <li>2. <strong>레벨별 밸런스 배치</strong> - 설정한 비율대로 분배 (선호도 반영)</li>
                <li>3. <strong>나머지 선호 패턴 참고 배치</strong> - 개인 선호 패턴 적용</li>
              </ol>
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <strong>배치 비율 예시:</strong> 비율 {levels.map(l => l.distribution_ratio).join(':')} 
                {levels.length === 3 && ` → 10명 배치 시: ${levels.map((l, i) => `${l.role_name} ${Math.floor(10 * l.distribution_ratio / levels.reduce((sum, lv) => sum + lv.distribution_ratio, 0))}명`).join(', ')}`}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={loadHierarchy}
          disabled={loading}
        >
          초기화
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>저장 중...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { 
  Settings, 
  AlertCircle, 
  Save, 
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Clock,
  Users,
  Moon
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Constraint {
  id: string
  constraint_type: string
  constraint_name: string
  is_enabled: boolean
  is_hard_constraint: boolean
  priority: number
  min_value: number
  max_value: number
  default_value: number
  current_value: number
  description?: string
  warning_message?: string
}

export function ConstraintSettings() {
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null)
  const [newConstraint, setNewConstraint] = useState<Partial<Constraint>>({
    constraint_type: 'custom',
    constraint_name: '',
    is_enabled: true,
    is_hard_constraint: true,
    priority: 50,
    min_value: 0,
    max_value: 100,
    default_value: 50,
    current_value: 50
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchConstraints()
  }, [])

  const fetchConstraints = async () => {
    try {
      const response = await fetch('/api/settings/constraints')
      const data = await response.json()
      
      if (data.success) {
        setConstraints(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '제약 설정을 불러오는데 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleConstraint = async (constraintId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/settings/constraints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: constraintId,
          is_enabled: enabled
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConstraints(prev => 
          prev.map(c => c.id === constraintId ? { ...c, is_enabled: enabled } : c)
        )
        toast({
          title: '성공',
          description: '제약 설정이 업데이트되었습니다.'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '제약 설정 업데이트에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleValueChange = async (constraintId: string, value: number) => {
    try {
      const response = await fetch('/api/settings/constraints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: constraintId,
          current_value: value
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConstraints(prev => 
          prev.map(c => c.id === constraintId ? { ...c, current_value: value } : c)
        )
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '값 업데이트에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleCreateConstraint = async () => {
    try {
      const response = await fetch('/api/settings/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConstraint)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConstraints(prev => [...prev, data.data])
        setNewConstraint({
          constraint_type: 'custom',
          constraint_name: '',
          is_enabled: true,
          is_hard_constraint: true,
          priority: 50,
          min_value: 0,
          max_value: 100,
          default_value: 50,
          current_value: 50
        })
        toast({
          title: '성공',
          description: '새 제약이 추가되었습니다.'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '제약 추가에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteConstraint = async (constraintId: string) => {
    if (!confirm('이 제약을 삭제하시겠습니까?')) return
    
    try {
      const response = await fetch(`/api/settings/constraints?id=${constraintId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConstraints(prev => prev.filter(c => c.id !== constraintId))
        toast({
          title: '성공',
          description: '제약이 삭제되었습니다.'
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '제약 삭제에 실패했습니다.',
        variant: 'destructive'
      })
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) return
    
    setSaving(true)
    try {
      // Reset all constraints to default values
      const updates = constraints.map(c => ({
        id: c.id,
        current_value: c.default_value
      }))
      
      for (const update of updates) {
        await handleValueChange(update.id, update.current_value)
      }
      
      toast({
        title: '성공',
        description: '모든 설정이 기본값으로 초기화되었습니다.'
      })
    } catch (error) {
      toast({
        title: '오류',
        description: '설정 초기화에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const getConstraintIcon = (type: string) => {
    switch (type) {
      case 'working_hours':
        return <Clock className="h-4 w-4" />
      case 'consecutive_nights':
        return <Moon className="h-4 w-4" />
      case 'rest_time':
        return <Users className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">제약 설정을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>제약 설정</CardTitle>
              <CardDescription>
                스케줄 생성 시 적용되는 제약 조건을 관리합니다
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    새 제약
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 제약 추가</DialogTitle>
                    <DialogDescription>
                      커스텀 제약 조건을 추가합니다
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>제약 이름</Label>
                      <Input
                        value={newConstraint.constraint_name}
                        onChange={(e) => setNewConstraint(prev => ({
                          ...prev,
                          constraint_name: e.target.value
                        }))}
                        placeholder="예: 최대 연속 주간 근무"
                      />
                    </div>
                    <div>
                      <Label>설명</Label>
                      <Textarea
                        value={newConstraint.description}
                        onChange={(e) => setNewConstraint(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                        placeholder="제약에 대한 설명"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>최소값</Label>
                        <Input
                          type="number"
                          value={newConstraint.min_value}
                          onChange={(e) => setNewConstraint(prev => ({
                            ...prev,
                            min_value: Number(e.target.value)
                          }))}
                        />
                      </div>
                      <div>
                        <Label>최대값</Label>
                        <Input
                          type="number"
                          value={newConstraint.max_value}
                          onChange={(e) => setNewConstraint(prev => ({
                            ...prev,
                            max_value: Number(e.target.value)
                          }))}
                        />
                      </div>
                      <div>
                        <Label>기본값</Label>
                        <Input
                          type="number"
                          value={newConstraint.default_value}
                          onChange={(e) => setNewConstraint(prev => ({
                            ...prev,
                            default_value: Number(e.target.value),
                            current_value: Number(e.target.value)
                          }))}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateConstraint}
                      className="w-full"
                      disabled={!newConstraint.constraint_name}
                    >
                      제약 추가
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetToDefaults}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                기본값 복원
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {constraints.map((constraint) => (
            <Card key={constraint.id}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getConstraintIcon(constraint.constraint_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{constraint.constraint_name}</span>
                          {constraint.is_hard_constraint ? (
                            <Badge variant="destructive" className="text-xs">필수</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">권장</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            우선순위: {constraint.priority}
                          </Badge>
                        </div>
                        {constraint.description && (
                          <p className="text-sm text-muted-foreground">
                            {constraint.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={constraint.is_enabled}
                        onCheckedChange={(checked) => 
                          handleToggleConstraint(constraint.id, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteConstraint(constraint.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {constraint.is_enabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>현재 값: {constraint.current_value}</span>
                        <span className="text-muted-foreground">
                          범위: {constraint.min_value} - {constraint.max_value}
                        </span>
                      </div>
                      <Slider
                        value={[constraint.current_value]}
                        onValueChange={([value]) => 
                          handleValueChange(constraint.id, value)
                        }
                        min={constraint.min_value}
                        max={constraint.max_value}
                        step={1}
                        className="w-full"
                      />
                      {constraint.warning_message && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>{constraint.warning_message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
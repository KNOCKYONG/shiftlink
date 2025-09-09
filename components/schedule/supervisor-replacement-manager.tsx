'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UserX, Users, Clock, AlertTriangle, CheckCircle, Calendar, 
  TrendingUp, Shield, ArrowRight, RefreshCw, Bell 
} from 'lucide-react'
import { toast } from 'sonner'

interface SupervisorAbsence {
  id: string
  supervisor_name: string
  supervisor_position: string
  team_name: string
  absence_start: string
  absence_end: string
  absence_reason: string
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'planned' | 'active' | 'completed'
  affected_shifts_count: number
  replacement_coverage: number
}

interface ReplacementPlan {
  id: string
  absence_id: string
  replacement_assignments: Array<{
    shift_date: string
    shift_type: string
    replacement_employee_name: string
    replacement_type: string
    confidence_score: number
    backup_available: boolean
  }>
  coverage_analysis: {
    full_coverage_percentage: number
    partial_coverage_shifts: number
    uncovered_shifts: number
    skill_coverage_gaps: string[]
  }
  estimated_cost: number
  approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function SupervisorReplacementManager() {
  const [absences, setAbsences] = useState<SupervisorAbsence[]>([])
  const [replacementPlans, setReplacementPlans] = useState<ReplacementPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAbsence, setSelectedAbsence] = useState<SupervisorAbsence | null>(null)
  const [activeTab, setActiveTab] = useState('current')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // 새 부재 요청 폼 상태
  const [newAbsence, setNewAbsence] = useState({
    supervisor_id: '',
    start_date: '',
    end_date: '',
    reason: 'planned_leave' as const,
    urgency: 'medium' as const,
    special_requirements: ''
  })

  useEffect(() => {
    loadAbsences()
    loadReplacementPlans()
  }, [])

  const loadAbsences = async () => {
    try {
      const response = await fetch('/api/supervisor-replacement/absences')
      if (!response.ok) throw new Error('Failed to load absences')
      const data = await response.json()
      setAbsences(data)
    } catch (error) {
      console.error('Error loading absences:', error)
      toast.error('상급자 부재 정보를 불러오는데 실패했습니다')
    }
  }

  const loadReplacementPlans = async () => {
    try {
      const response = await fetch('/api/supervisor-replacement/plans')
      if (!response.ok) throw new Error('Failed to load plans')
      const data = await response.json()
      setReplacementPlans(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading replacement plans:', error)
      toast.error('대체 계획을 불러오는데 실패했습니다')
      setLoading(false)
    }
  }

  const createReplacementPlan = async (absenceId: string) => {
    try {
      const response = await fetch('/api/supervisor-replacement/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ absence_id: absenceId })
      })
      
      if (!response.ok) throw new Error('Failed to create replacement plan')
      
      const plan = await response.json()
      toast.success('대체 계획이 생성되었습니다')
      await loadReplacementPlans()
      
    } catch (error) {
      console.error('Error creating replacement plan:', error)
      toast.error('대체 계획 생성에 실패했습니다')
    }
  }

  const approveReplacementPlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/supervisor-replacement/plans/${planId}/approve`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to approve plan')
      
      toast.success('대체 계획이 승인되었습니다')
      await loadReplacementPlans()
      
    } catch (error) {
      console.error('Error approving plan:', error)
      toast.error('대체 계획 승인에 실패했습니다')
    }
  }

  const submitNewAbsence = async () => {
    if (!newAbsence.supervisor_id || !newAbsence.start_date || !newAbsence.end_date) {
      toast.error('필수 정보를 모두 입력해주세요')
      return
    }

    try {
      const response = await fetch('/api/supervisor-replacement/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAbsence)
      })
      
      if (!response.ok) throw new Error('Failed to create absence')
      
      toast.success('상급자 부재 요청이 등록되었습니다')
      setShowCreateDialog(false)
      setNewAbsence({
        supervisor_id: '',
        start_date: '',
        end_date: '',
        reason: 'planned_leave',
        urgency: 'medium',
        special_requirements: ''
      })
      await loadAbsences()
      
    } catch (error) {
      console.error('Error creating absence:', error)
      toast.error('부재 요청 등록에 실패했습니다')
    }
  }

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">상급자 대체 관리 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">상급자 대체 관리</h2>
          <p className="text-gray-600 mt-1">
            감독자 부재 시 대체 인력 배치를 관리합니다
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              새 부재 등록
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>상급자 부재 등록</DialogTitle>
              <DialogDescription>
                감독자의 계획된 부재 또는 응급 상황을 등록합니다
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>감독자 선택</Label>
                <Select 
                  value={newAbsence.supervisor_id} 
                  onValueChange={(value) => setNewAbsence(prev => ({...prev, supervisor_id: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="감독자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor1">김수간호사 (수간호사)</SelectItem>
                    <SelectItem value="supervisor2">이책임간호사 (책임간호사)</SelectItem>
                    <SelectItem value="supervisor3">박수간호사 (수간호사)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={newAbsence.start_date}
                    onChange={(e) => setNewAbsence(prev => ({...prev, start_date: e.target.value}))}
                  />
                </div>
                <div>
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={newAbsence.end_date}
                    onChange={(e) => setNewAbsence(prev => ({...prev, end_date: e.target.value}))}
                  />
                </div>
              </div>

              <div>
                <Label>부재 사유</Label>
                <Select 
                  value={newAbsence.reason} 
                  onValueChange={(value: any) => setNewAbsence(prev => ({...prev, reason: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned_leave">계획 휴가</SelectItem>
                    <SelectItem value="sick_leave">병가</SelectItem>
                    <SelectItem value="emergency">응급상황</SelectItem>
                    <SelectItem value="training">교육/연수</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>긴급도</Label>
                <Select 
                  value={newAbsence.urgency} 
                  onValueChange={(value: any) => setNewAbsence(prev => ({...prev, urgency: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="critical">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>특별 요구사항</Label>
                <Textarea
                  placeholder="대체 인력이 알아야 할 특별한 사항이 있다면 입력해주세요..."
                  value={newAbsence.special_requirements}
                  onChange={(e) => setNewAbsence(prev => ({...prev, special_requirements: e.target.value}))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  취소
                </Button>
                <Button onClick={submitNewAbsence}>
                  등록
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">현재 부재</TabsTrigger>
          <TabsTrigger value="planned">계획된 부재</TabsTrigger>
          <TabsTrigger value="history">이력</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {absences.filter(a => a.status === 'active').length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>현재 상급자 부재 상황이 없습니다</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            absences
              .filter(absence => absence.status === 'active')
              .map((absence) => {
                const plan = replacementPlans.find(p => p.absence_id === absence.id)
                
                return (
                  <Card key={absence.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserX className="h-5 w-5 text-orange-600" />
                          <div>
                            <CardTitle>{absence.supervisor_name}</CardTitle>
                            <CardDescription>
                              {absence.supervisor_position} • {absence.team_name}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getUrgencyColor(absence.urgency_level)} text-white border-0`}
                          >
                            {absence.urgency_level === 'critical' ? '긴급' : 
                             absence.urgency_level === 'high' ? '높음' :
                             absence.urgency_level === 'medium' ? '보통' : '낮음'}
                          </Badge>
                          <Badge variant="destructive">진행중</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="font-medium">부재 기간</Label>
                          <p>{absence.absence_start} ~ {absence.absence_end}</p>
                        </div>
                        <div>
                          <Label className="font-medium">부재 사유</Label>
                          <p>{absence.absence_reason}</p>
                        </div>
                        <div>
                          <Label className="font-medium">영향 교대</Label>
                          <p>{absence.affected_shifts_count}개 교대</p>
                        </div>
                        <div>
                          <Label className="font-medium">대체 커버리지</Label>
                          <p className={getCoverageColor(absence.replacement_coverage)}>
                            {absence.replacement_coverage}%
                          </p>
                        </div>
                      </div>

                      {plan && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">대체 계획 상세</h4>
                            <Badge 
                              variant={plan.approval_status === 'approved' ? 'default' : 'secondary'}
                            >
                              {plan.approval_status === 'approved' ? '승인됨' : 
                               plan.approval_status === 'pending' ? '승인 대기' : '거부됨'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-medium text-green-800">완전 커버</div>
                                <div className="text-lg font-bold text-green-600">
                                  {plan.coverage_analysis.full_coverage_percentage}%
                                </div>
                              </div>
                              <div className="text-center p-2 bg-yellow-50 rounded">
                                <div className="font-medium text-yellow-800">부분 커버</div>
                                <div className="text-lg font-bold text-yellow-600">
                                  {plan.coverage_analysis.partial_coverage_shifts}개
                                </div>
                              </div>
                              <div className="text-center p-2 bg-red-50 rounded">
                                <div className="font-medium text-red-800">미커버</div>
                                <div className="text-lg font-bold text-red-600">
                                  {plan.coverage_analysis.uncovered_shifts}개
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-lg p-3">
                              <Label className="font-medium mb-2 block">대체 배정 현황</Label>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {plan.replacement_assignments.slice(0, 3).map((assignment, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="font-medium">{assignment.shift_date}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {assignment.shift_type}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span>{assignment.replacement_employee_name}</span>
                                      <Progress 
                                        value={assignment.confidence_score * 100} 
                                        className="w-12 h-2" 
                                      />
                                    </div>
                                  </div>
                                ))}
                                {plan.replacement_assignments.length > 3 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    외 {plan.replacement_assignments.length - 3}개 더보기...
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div className="text-sm">
                                <span className="font-medium">예상 비용: </span>
                                <span className="text-red-600">{formatCurrency(plan.estimated_cost)}</span>
                              </div>
                              
                              {plan.approval_status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => approveReplacementPlan(plan.id)}
                                  className="flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  승인
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {!plan && (
                        <div className="border-t pt-4">
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                              <span>대체 계획이 아직 생성되지 않았습니다</span>
                              <Button 
                                size="sm" 
                                onClick={() => createReplacementPlan(absence.id)}
                                className="ml-4"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                계획 생성
                              </Button>
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
          )}
        </TabsContent>

        <TabsContent value="planned" className="space-y-4">
          {absences.filter(a => a.status === 'planned').map((absence) => (
            <Card key={absence.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle>{absence.supervisor_name}</CardTitle>
                      <CardDescription>
                        {absence.supervisor_position} • {absence.team_name}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <Badge variant="outline">계획됨</Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">부재 예정 기간</Label>
                    <p>{absence.absence_start} ~ {absence.absence_end}</p>
                  </div>
                  <div>
                    <Label className="font-medium">부재 사유</Label>
                    <p>{absence.absence_reason}</p>
                  </div>
                  <div>
                    <Label className="font-medium">영향 교대</Label>
                    <p>{absence.affected_shifts_count}개 교대</p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => createReplacementPlan(absence.id)}
                  >
                    사전 계획 수립
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>이력 기능은 추후 구현될 예정입니다</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
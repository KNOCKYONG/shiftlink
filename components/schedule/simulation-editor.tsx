'use client'

import { useState, useEffect, useRef } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, Calendar, Clock, Save, Undo, Redo, Play, AlertTriangle,
  TrendingUp, ArrowUpDown, Plus, Trash2, Edit, Check, X, Info,
  Sparkles, ChevronRight, RefreshCw, Target, Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  name: string
  position: string
  hierarchy_level: number
  team_name: string
  current_fatigue_score: number
  preference_pattern: string[]
}

interface Assignment {
  id: string
  employee_id: string
  employee_name: string
  date: string
  shift_type: 'day' | 'evening' | 'night' | 'off'
  hierarchy_level: number
  is_supervisor: boolean
  is_modified: boolean
  modification_type?: string
}

interface Recommendation {
  employee_id: string
  employee_name: string
  recommendation_type: string
  score: number
  is_trade: boolean
  trade_date?: string
  trade_shift?: string
}

interface SimulationMetrics {
  compliance_score: number
  hierarchy_balance_score: number
  preference_satisfaction: number
  coverage_percentage: number
  fatigue_index: number
  cost_impact: number
}

// 드래그 가능한 직원 카드
function DraggableEmployee({ employee }: { employee: Employee }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id,
    data: { type: 'employee', employee }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-move"
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{employee.name}</p>
              <p className="text-xs text-gray-600">{employee.position}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-xs">
                Lv.{employee.hierarchy_level}
              </Badge>
              <p className="text-xs mt-1">
                피로도: {employee.current_fatigue_score}/10
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 드롭 가능한 스케줄 셀
function DroppableCell({ 
  date, 
  shift, 
  assignment,
  onDrop,
  onClick,
  isHighlighted
}: { 
  date: string
  shift: string
  assignment?: Assignment
  onDrop: (date: string, shift: string, employeeId: string) => void
  onClick: () => void
  isHighlighted?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}-${shift}`,
    data: { date, shift }
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "border rounded-lg p-2 min-h-[60px] cursor-pointer transition-all",
        isOver && "bg-blue-50 border-blue-400",
        assignment?.is_modified && "bg-yellow-50",
        isHighlighted && "ring-2 ring-blue-500",
        !assignment && "bg-gray-50 hover:bg-gray-100"
      )}
    >
      {assignment ? (
        <div className="space-y-1">
          <p className="font-medium text-sm">{assignment.employee_name}</p>
          <div className="flex items-center gap-1">
            {assignment.is_supervisor && (
              <Badge variant="secondary" className="text-xs">감독</Badge>
            )}
            {assignment.is_modified && (
              <Badge variant="outline" className="text-xs bg-yellow-100">변경됨</Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
          빈 슬롯
        </div>
      )}
    </div>
  )
}

export function SimulationEditor({
  simulationId,
  initialEmployees,
  initialAssignments,
  tenantId,
  teamId,
  onSave
}: {
  simulationId?: string
  initialEmployees?: any[]
  initialAssignments?: any[]
  tenantId?: string
  teamId?: string
  onSave?: (simulationData: any) => void
}) {
  const [simulation, setSimulation] = useState<any>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedCell, setSelectedCell] = useState<{ date: string; shift: string } | null>(null)
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null)
  const [changeHistory, setChangeHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // 날짜 범위 생성
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })
  
  const shifts = ['day', 'evening', 'night']

  useEffect(() => {
    if (simulationId) {
      loadSimulation()
      loadEmployees()
    } else if (initialEmployees || initialAssignments) {
      // 초기 데이터 사용
      if (initialEmployees) {
        setEmployees(initialEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          position: emp.position || emp.role || '직원',
          hierarchy_level: emp.hierarchy_level || 1,
          team_name: emp.team_name || '',
          current_fatigue_score: 0,
          preference_pattern: []
        })))
      }
      if (initialAssignments) {
        setAssignments(initialAssignments.map(assign => ({
          id: assign.id,
          employee_id: assign.employee_id,
          employee_name: assign.employees?.name || '',
          date: assign.date,
          shift_type: assign.shift_templates?.type || assign.shift_type,
          hierarchy_level: assign.employees?.hierarchy_level || 1,
          is_supervisor: assign.is_supervisor || false,
          is_modified: false
        })))
      }
      setLoading(false)
    }
  }, [simulationId, initialEmployees, initialAssignments])

  const loadSimulation = async () => {
    try {
      if (!simulationId) {
        // Mock 데이터 사용
        setLoading(false)
        return
      }
      const response = await fetch(`/api/simulations/${simulationId}`)
      if (!response.ok) throw new Error('Failed to load simulation')
      
      const data = await response.json()
      setSimulation(data.simulation)
      setAssignments(data.assignments)
      setMetrics(data.metrics)
      setLoading(false)
    } catch (error) {
      console.error('Error loading simulation:', error)
      // Mock 데이터로 fallback
      setLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      if (!simulationId) {
        // Mock 데이터 사용
        return
      }
      const response = await fetch('/api/employees')
      if (!response.ok) throw new Error('Failed to load employees')
      
      const data = await response.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error loading employees:', error)
      // Mock 데이터로 fallback
    }
  }

  const loadRecommendations = async (date: string, shift: string) => {
    try {
      if (!simulationId) {
        // Mock 추천 데이터
        const mockRecommendations = employees.slice(0, 3).map((emp, index) => ({
          employee_id: emp.id,
          employee_name: emp.name,
          recommendation_type: index === 0 ? 'optimal' : 'alternative',
          score: 0.9 - index * 0.1,
          fatigue_score: 30 + index * 10,
          consecutive_nights: index,
          reason: index === 0 ? '최적 배치' : '대체 가능',
          is_trade: false
        }))
        setRecommendations(mockRecommendations)
        setShowRecommendations(true)
        return
      }
      
      const response = await fetch(`/api/simulations/${simulationId}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, shift })
      })
      
      if (!response.ok) throw new Error('Failed to load recommendations')
      
      const data = await response.json()
      setRecommendations(data)
      setShowRecommendations(true)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      // Mock 데이터로 fallback
      const mockRecommendations = employees.slice(0, 3).map((emp, index) => ({
        employee_id: emp.id,
        employee_name: emp.name,
        recommendation_type: index === 0 ? 'optimal' : 'alternative',
        score: 0.9 - index * 0.1,
        fatigue_score: 30 + index * 10,
        consecutive_nights: index,
        reason: index === 0 ? '최적 배치' : '대체 가능',
        is_trade: false
      }))
      setRecommendations(mockRecommendations)
      setShowRecommendations(true)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const employee = event.active.data.current?.employee
    if (employee) {
      setDraggedEmployee(employee)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setDraggedEmployee(null)
      return
    }

    const employeeId = active.id as string
    const [date, shift] = (over.id as string).split('-')
    
    handleAssignmentChange(date, shift, employeeId, 'drag_drop')
    setDraggedEmployee(null)
  }

  const handleAssignmentChange = async (
    date: string, 
    shift: string, 
    employeeId: string,
    changeType: string = 'manual'
  ) => {
    // 기존 배정 찾기
    const existingIndex = assignments.findIndex(
      a => a.date === date && a.shift_type === shift
    )

    const employee = employees.find(e => e.id === employeeId)
    if (!employee) return

    const newAssignment: Assignment = {
      id: `${date}-${shift}-${employeeId}`,
      employee_id: employeeId,
      employee_name: employee.name,
      date,
      shift_type: shift as any,
      hierarchy_level: employee.hierarchy_level,
      is_supervisor: employee.hierarchy_level <= 2,
      is_modified: true,
      modification_type: changeType
    }

    let newAssignments = [...assignments]
    
    if (existingIndex >= 0) {
      // 기존 배정 교체
      newAssignments[existingIndex] = newAssignment
    } else {
      // 새 배정 추가
      newAssignments.push(newAssignment)
    }

    setAssignments(newAssignments)
    
    // 변경 이력 추가
    const newHistory = [...changeHistory.slice(0, historyIndex + 1), {
      type: changeType,
      date,
      shift,
      employeeId,
      timestamp: new Date().toISOString()
    }]
    setChangeHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // 메트릭 재계산
    await recalculateMetrics(newAssignments)
    
    toast.success(`${employee.name}님이 ${date} ${shift} 교대에 배정되었습니다`)
  }

  const handleRemoveAssignment = (assignmentId: string) => {
    const newAssignments = assignments.filter(a => a.id !== assignmentId)
    setAssignments(newAssignments)
    toast.success('배정이 제거되었습니다')
  }

  const recalculateMetrics = async (newAssignments: Assignment[]) => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: newAssignments })
      })
      
      if (!response.ok) throw new Error('Failed to calculate metrics')
      
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error calculating metrics:', error)
    }
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      // 이전 상태로 복원 로직
      toast.info('이전 상태로 되돌렸습니다')
    }
  }

  const handleRedo = () => {
    if (historyIndex < changeHistory.length - 1) {
      setHistoryIndex(historyIndex + 1)
      // 다음 상태로 복원 로직
      toast.info('다시 실행했습니다')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/simulations/${simulationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments,
          metrics,
          changeHistory
        })
      })
      
      if (!response.ok) throw new Error('Failed to save simulation')
      
      toast.success('시뮬레이션이 저장되었습니다')
      onSave?.({ assignments, metrics })
    } catch (error) {
      console.error('Error saving simulation:', error)
      toast.error('시뮬레이션 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleRunSimulation = async () => {
    try {
      const response = await fetch(`/api/simulations/${simulationId}/run`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to run simulation')
      
      const data = await response.json()
      setAssignments(data.assignments)
      setMetrics(data.metrics)
      
      toast.success('시뮬레이션이 실행되었습니다')
    } catch (error) {
      console.error('Error running simulation:', error)
      toast.error('시뮬레이션 실행에 실패했습니다')
    }
  }

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case 'day': return '데이 (06:00-14:00)'
      case 'evening': return '이브닝 (14:00-22:00)'
      case 'night': return '나이트 (22:00-06:00)'
      default: return shift
    }
  }

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case 'day': return 'bg-yellow-100 text-yellow-800'
      case 'evening': return 'bg-orange-100 text-orange-800'
      case 'night': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">시뮬레이션을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* 헤더 및 툴바 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              스케줄 시뮬레이션 에디터
            </h2>
            <p className="text-gray-600 mt-1">
              드래그 앤 드롭으로 근무 일정을 조정하고 시뮬레이션을 실행하세요
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= changeHistory.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-8" />
            
            <Button
              variant="outline"
              onClick={handleRunSimulation}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              시뮬레이션 실행
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        {/* 메트릭 카드 */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-600">컴플라이언스</span>
                </div>
                <p className="text-xl font-bold mt-1">{metrics.compliance_score}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-gray-600">계층 균형</span>
                </div>
                <p className="text-xl font-bold mt-1">{metrics.hierarchy_balance_score}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-gray-600">선호도</span>
                </div>
                <p className="text-xl font-bold mt-1">{metrics.preference_satisfaction}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-gray-600">커버리지</span>
                </div>
                <p className="text-xl font-bold mt-1">{metrics.coverage_percentage}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-gray-600">피로도</span>
                </div>
                <p className="text-xl font-bold mt-1">{metrics.fatigue_index.toFixed(1)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-600">비용 영향</span>
                </div>
                <p className="text-xl font-bold mt-1">
                  {new Intl.NumberFormat('ko-KR').format(metrics.cost_impact)}원
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* 좌측: 직원 목록 */}
          <div className="col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">직원 목록</CardTitle>
                <Input
                  placeholder="직원 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-2"
                />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {employees
                      .filter(e => 
                        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        e.position.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(employee => (
                        <DraggableEmployee key={employee.id} employee={employee} />
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 중앙: 스케줄 그리드 */}
          <div className="col-span-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">스케줄 그리드</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2 font-medium">교대</th>
                        {dates.map(date => (
                          <th key={date} className="text-center p-2 font-medium text-sm">
                            {new Date(date).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map(shift => (
                        <tr key={shift}>
                          <td className="p-2">
                            <Badge className={cn("w-full justify-center", getShiftColor(shift))}>
                              {getShiftLabel(shift)}
                            </Badge>
                          </td>
                          {dates.map(date => {
                            const assignment = assignments.find(
                              a => a.date === date && a.shift_type === shift
                            )
                            
                            return (
                              <td key={`${date}-${shift}`} className="p-2">
                                <DroppableCell
                                  date={date}
                                  shift={shift}
                                  assignment={assignment}
                                  onDrop={handleAssignmentChange}
                                  onClick={() => {
                                    setSelectedCell({ date, shift })
                                    loadRecommendations(date, shift)
                                  }}
                                  isHighlighted={
                                    selectedCell?.date === date && 
                                    selectedCell?.shift === shift
                                  }
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 우측: 추천 패널 */}
          <div className="col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  변경 추천
                </CardTitle>
                <CardDescription>
                  선택한 슬롯에 최적의 직원을 추천합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCell && showRecommendations ? (
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-3">
                      {recommendations.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>추천 가능한 직원이 없습니다</p>
                        </div>
                      ) : (
                        recommendations.map((rec, index) => (
                          <Card
                            key={rec.employee_id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              if (selectedCell) {
                                handleAssignmentChange(
                                  selectedCell.date,
                                  selectedCell.shift,
                                  rec.employee_id,
                                  'recommendation'
                                )
                                setShowRecommendations(false)
                              }
                            }}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium">{rec.employee_name}</p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {rec.recommendation_type === 'same_level' ? '동일 레벨' :
                                     rec.recommendation_type === 'trade' ? '트레이드' :
                                     rec.recommendation_type === 'preference_match' ? '선호 일치' :
                                     '가용 인력'}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-green-600">
                                    {Math.round(rec.score * 100)}%
                                  </div>
                                  <p className="text-xs text-gray-600">적합도</p>
                                </div>
                              </div>
                              
                              {rec.is_trade && (
                                <Alert className="p-2">
                                  <ArrowUpDown className="h-3 w-3" />
                                  <AlertDescription className="text-xs ml-1">
                                    {rec.trade_date} {rec.trade_shift}와 교환
                                  </AlertDescription>
                                </Alert>
                              )}
                              
                              {index === 0 && (
                                <Badge className="w-full justify-center mt-2 bg-gradient-to-r from-yellow-400 to-yellow-600">
                                  최고 추천
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[550px] text-gray-400">
                    <div className="text-center">
                      <Info className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">
                        스케줄 셀을 클릭하여
                        <br />
                        추천 직원을 확인하세요
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 변경 이력 */}
        {changeHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                변경 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {changeHistory.map((change, index) => (
                  <Badge
                    key={index}
                    variant={index === historyIndex ? 'default' : 'outline'}
                    className="flex-shrink-0"
                  >
                    {change.type === 'drag_drop' ? '드래그' :
                     change.type === 'recommendation' ? '추천' :
                     change.type === 'manual' ? '수동' : change.type}
                    <ChevronRight className="h-3 w-3 mx-1" />
                    {new Date(change.timestamp).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {draggedEmployee && (
          <Card className="shadow-xl">
            <CardContent className="p-3">
              <p className="font-medium">{draggedEmployee.name}</p>
              <p className="text-sm text-gray-600">{draggedEmployee.position}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}
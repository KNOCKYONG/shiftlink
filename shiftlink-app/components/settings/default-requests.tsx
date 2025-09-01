'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Calendar,
  Clock,
  Sun, 
  Sunset,
  Moon,
  Coffee,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock3,
  Plus,
  Trash2,
  Edit,
  MoreHorizontal
} from 'lucide-react'

interface DefaultRequest {
  id: string
  request_type: string
  title: string
  description?: string
  day_of_week?: number
  specific_date?: string
  start_date?: string
  end_date?: string
  shift_type?: string
  is_recurring: boolean
  recurrence_pattern?: string
  priority: number
  status: string
  auto_apply: boolean
  created_at: string
  approved_at?: string
  approved_by?: { name: string }
  rejection_reason?: string
}

interface DefaultRequestsProps {
  employeeId: string
  isManager?: boolean
  tenantId?: string
}

const REQUEST_TYPES = [
  { value: 'fixed_shift', label: '고정 근무', description: '매주 특정 요일에 고정된 시간대 근무', icon: Clock },
  { value: 'leave', label: '휴가', description: '특정 날짜 또는 정기적인 휴가', icon: Coffee },
  { value: 'preferred_off', label: '선호 휴무', description: '선호하는 휴무 요일', icon: Calendar },
  { value: 'constraint', label: '제약사항', description: '근무 불가능한 조건', icon: AlertCircle },
  { value: 'training', label: '교육/회의', description: '정기적인 교육이나 회의 일정', icon: Users },
  { value: 'medical', label: '의료 관련', description: '정기 검진 등 의료 관련 일정', icon: MapPin }
]

const SHIFT_TYPES = [
  { value: 'day', label: '주간', icon: Sun },
  { value: 'evening', label: '오후', icon: Sunset },
  { value: 'night', label: '야간', icon: Moon },
  { value: 'off', label: '휴무', icon: Coffee }
]

const WEEKDAYS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' }
]

const RECURRENCE_PATTERNS = [
  { value: 'weekly', label: '매주' },
  { value: 'biweekly', label: '격주' },
  { value: 'monthly', label: '매월' },
  { value: 'quarterly', label: '분기별' },
  { value: 'yearly', label: '연간' }
]

export default function DefaultRequests({ employeeId, isManager = false, tenantId }: DefaultRequestsProps) {
  const [requests, setRequests] = useState<DefaultRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingRequest, setEditingRequest] = useState<DefaultRequest | null>(null)
  const [formData, setFormData] = useState({
    request_type: '',
    title: '',
    description: '',
    day_of_week: '',
    specific_date: '',
    start_date: '',
    end_date: '',
    shift_type: '',
    is_recurring: false,
    recurrence_pattern: '',
    priority: 5,
    auto_apply: true
  })

  useEffect(() => {
    loadRequests()
  }, [employeeId])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!isManager) {
        params.append('employeeId', employeeId)
      } else if (tenantId) {
        params.append('tenantId', tenantId)
      }

      const response = await fetch(`/api/requests?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setRequests(data.requests)
      } else {
        toast.error('요청사항을 불러오는데 실패했습니다')
      }
    } catch (error) {
      console.error('Failed to load requests:', error)
      toast.error('요청사항을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        employee_id: employeeId,
        ...formData,
        day_of_week: formData.day_of_week ? parseInt(formData.day_of_week) : null,
        specific_date: formData.specific_date || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        shift_type: formData.shift_type || null,
        recurrence_pattern: formData.recurrence_pattern || null
      }

      const url = editingRequest ? '/api/requests' : '/api/requests'
      const method = editingRequest ? 'PUT' : 'POST'
      
      if (editingRequest) {
        payload.id = editingRequest.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editingRequest ? '요청이 수정되었습니다' : '요청이 생성되었습니다')
        setShowCreateDialog(false)
        setEditingRequest(null)
        resetForm()
        loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || '요청 처리에 실패했습니다')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('요청 처리에 실패했습니다')
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/requests?requestId=${requestId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('요청이 삭제되었습니다')
        loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제에 실패했습니다')
    }
  }

  const handleApproval = async (requestId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action,
          ...(reason && { rejection_reason: reason })
        })
      })

      if (response.ok) {
        toast.success(action === 'approve' ? '요청이 승인되었습니다' : '요청이 거부되었습니다')
        loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || '처리에 실패했습니다')
      }
    } catch (error) {
      console.error('Approval error:', error)
      toast.error('처리에 실패했습니다')
    }
  }

  const resetForm = () => {
    setFormData({
      request_type: '',
      title: '',
      description: '',
      day_of_week: '',
      specific_date: '',
      start_date: '',
      end_date: '',
      shift_type: '',
      is_recurring: false,
      recurrence_pattern: '',
      priority: 5,
      auto_apply: true
    })
  }

  const openEditDialog = (request: DefaultRequest) => {
    setEditingRequest(request)
    setFormData({
      request_type: request.request_type,
      title: request.title,
      description: request.description || '',
      day_of_week: request.day_of_week?.toString() || '',
      specific_date: request.specific_date || '',
      start_date: request.start_date || '',
      end_date: request.end_date || '',
      shift_type: request.shift_type || '',
      is_recurring: request.is_recurring,
      recurrence_pattern: request.recurrence_pattern || '',
      priority: request.priority,
      auto_apply: request.auto_apply
    })
    setShowCreateDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { label: '거부됨', color: 'bg-red-100 text-red-800 border-red-300' },
      expired: { label: '만료됨', color: 'bg-gray-100 text-gray-800 border-gray-300' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border`}>{config.label}</Badge>
  }

  const getPriorityBadge = (priority: number) => {
    if (priority <= 3) return <Badge variant="destructive">높음</Badge>
    if (priority <= 7) return <Badge variant="secondary">중간</Badge>
    return <Badge variant="outline">낮음</Badge>
  }

  const getRequestTypeInfo = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type) || REQUEST_TYPES[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">사전 요청사항</h3>
          <p className="text-sm text-muted-foreground">
            고정 근무, 휴가, 제약사항 등을 미리 등록하여 스케줄 생성 시 자동 반영되도록 설정하세요.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            setEditingRequest(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              새 요청 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRequest ? '요청사항 수정' : '새 요청사항 등록'}
              </DialogTitle>
              <DialogDescription>
                스케줄 생성 시 자동으로 반영될 요청사항을 등록하세요.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>요청 유형</Label>
                  <Select
                    value={formData.request_type}
                    onValueChange={(value) => setFormData({...formData, request_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="요청 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => {
                        const IconComponent = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>우선순위</Label>
                  <Select
                    value={formData.priority.toString()}
                    onValueChange={(value) => setFormData({...formData, priority: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - 최고</SelectItem>
                      <SelectItem value="3">3 - 높음</SelectItem>
                      <SelectItem value="5">5 - 중간</SelectItem>
                      <SelectItem value="7">7 - 낮음</SelectItem>
                      <SelectItem value="10">10 - 최저</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="예: 매주 화요일 주간 근무"
                />
              </div>

              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="상세 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked})}
                />
                <Label htmlFor="recurring">반복 요청</Label>
              </div>

              {formData.is_recurring ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>요일</Label>
                    <Select
                      value={formData.day_of_week}
                      onValueChange={(value) => setFormData({...formData, day_of_week: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="요일 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>반복 패턴</Label>
                    <Select
                      value={formData.recurrence_pattern}
                      onValueChange={(value) => setFormData({...formData, recurrence_pattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="패턴 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_PATTERNS.map((pattern) => (
                          <SelectItem key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>특정 날짜</Label>
                  <Input
                    type="date"
                    value={formData.specific_date}
                    onChange={(e) => setFormData({...formData, specific_date: e.target.value})}
                  />
                </div>
              )}

              {(formData.request_type === 'fixed_shift') && (
                <div className="space-y-2">
                  <Label>시간대</Label>
                  <Select
                    value={formData.shift_type}
                    onValueChange={(value) => setFormData({...formData, shift_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="시간대 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFT_TYPES.map((shift) => {
                        const IconComponent = shift.icon
                        return (
                          <SelectItem key={shift.value} value={shift.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" />
                              {shift.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-apply"
                    checked={formData.auto_apply}
                    onCheckedChange={(checked) => setFormData({...formData, auto_apply: checked})}
                  />
                  <Label htmlFor="auto-apply">스케줄 생성 시 자동 적용</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                취소
              </Button>
              <Button onClick={handleSubmit}>
                {editingRequest ? '수정' : '등록'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">등록된 요청사항이 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  고정 근무, 휴가 등을 미리 등록하여 스케줄 생성을 편리하게 하세요.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 번째 요청 등록
                </Button>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => {
              const typeInfo = getRequestTypeInfo(request.request_type)
              const TypeIcon = typeInfo.icon
              
              return (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{request.title}</h4>
                            {getStatusBadge(request.status)}
                            {getPriorityBadge(request.priority)}
                            {request.auto_apply && (
                              <Badge variant="outline" className="text-xs">
                                자동적용
                              </Badge>
                            )}
                          </div>
                          
                          {request.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {request.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {request.is_recurring ? (
                                `매주 ${WEEKDAYS.find(d => d.value === request.day_of_week)?.label}`
                              ) : (
                                request.specific_date
                              )}
                            </span>
                            
                            {request.shift_type && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {SHIFT_TYPES.find(s => s.value === request.shift_type)?.label}
                              </span>
                            )}
                          </div>

                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <span className="font-medium text-red-800">거부 사유:</span>
                              <span className="text-red-700 ml-1">{request.rejection_reason}</span>
                            </div>
                          )}

                          {request.approved_at && request.approved_by && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {new Date(request.approved_at).toLocaleDateString()} - {request.approved_by.name}에 의해 승인
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {request.status === 'pending' && (
                          <>
                            {isManager ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300"
                                  onClick={() => handleApproval(request.id, 'approve')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300"
                                  onClick={() => {
                                    const reason = prompt('거부 사유를 입력하세요 (선택사항):')
                                    handleApproval(request.id, 'reject', reason || undefined)
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(request)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300"
                                  onClick={() => handleDelete(request.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        
                        {(request.status !== 'pending' && !isManager) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(request.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUpDown, Users, Clock, AlertCircle, CheckCircle, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'

interface Employee {
  id: string
  name: string
  position: string
  hierarchy_level: number
  experience_years: number
  certifications: string[]
  current_fatigue_score: number
  exchange_group_id: string
  team_name: string
}

interface ExchangeCandidate {
  employee: Employee
  compatibility_score: number
  compatibility_factors: {
    same_level: boolean
    experience_gap: number
    certification_match: number
    fatigue_compatibility: boolean
    recent_exchange_count: number
  }
  current_assignment: {
    date: string
    shift_type: string
    shift_time: string
  }
  availability_conflicts: string[]
}

interface SameLevelExchangeDialogProps {
  currentEmployee: Employee
  currentAssignment: {
    id: string
    date: string
    shift_type: string
    shift_time: string
  }
  onExchangeRequested?: (exchangeData: any) => void
}

export default function SameLevelExchangeDialog({
  currentEmployee,
  currentAssignment,
  onExchangeRequested
}: SameLevelExchangeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [candidates, setCandidates] = useState<ExchangeCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<ExchangeCandidate | null>(null)
  const [exchangeReason, setExchangeReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadExchangeCandidates()
    }
  }, [isOpen, currentAssignment])

  const loadExchangeCandidates = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/schedule/exchange-candidates?` + new URLSearchParams({
        employee_id: currentEmployee.id,
        assignment_id: currentAssignment.id,
        date: currentAssignment.date,
        shift_type: currentAssignment.shift_type
      }))

      if (!response.ok) throw new Error('Failed to load exchange candidates')
      
      const data = await response.json()
      setCandidates(data.candidates || [])
    } catch (error) {
      console.error('Error loading exchange candidates:', error)
      toast.error('교환 가능한 동료를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const requestExchange = async () => {
    if (!selectedCandidate || !exchangeReason.trim()) {
      toast.error('교환 대상과 사유를 모두 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/schedule/same-level-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_assignment_id: currentAssignment.id,
          target_employee_id: selectedCandidate.employee.id,
          target_assignment: selectedCandidate.current_assignment,
          reason: exchangeReason,
          compatibility_score: selectedCandidate.compatibility_score,
          exchange_type: 'same_level'
        })
      })

      if (!response.ok) throw new Error('Failed to request exchange')
      
      const result = await response.json()
      
      toast.success('교환 요청이 전송되었습니다')
      onExchangeRequested?.(result)
      setIsOpen(false)
      resetForm()
      
    } catch (error) {
      console.error('Error requesting exchange:', error)
      toast.error('교환 요청에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedCandidate(null)
    setExchangeReason('')
    setCandidates([])
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompatibilityText = (score: number) => {
    if (score >= 0.8) return '매우 호환'
    if (score >= 0.6) return '호환 가능'
    return '호환 어려움'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          동일계층 교환
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            동일 계층 근무 교환
          </DialogTitle>
          <DialogDescription>
            같은 레벨의 간호사와 근무를 교환할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 현재 근무 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">현재 근무 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="font-medium">직원</Label>
                  <p>{currentEmployee.name}</p>
                </div>
                <div>
                  <Label className="font-medium">직급</Label>
                  <p>{currentEmployee.position}</p>
                </div>
                <div>
                  <Label className="font-medium">날짜</Label>
                  <p>{currentAssignment.date}</p>
                </div>
                <div>
                  <Label className="font-medium">교대</Label>
                  <Badge variant="outline">{currentAssignment.shift_type}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 교환 대상 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">교환 가능한 동료</CardTitle>
              <CardDescription>
                호환성 점수가 높을수록 교환이 원활합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2">교환 가능한 동료를 찾는 중...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>현재 교환 가능한 동료가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
                    <Card
                      key={candidate.employee.id}
                      className={`cursor-pointer transition-colors ${
                        selectedCandidate?.employee.id === candidate.employee.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <User className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                            <div>
                              <h4 className="font-medium">{candidate.employee.name}</h4>
                              <p className="text-sm text-gray-600">
                                {candidate.employee.position} • {candidate.employee.team_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${getCompatibilityColor(candidate.compatibility_score)}`}>
                              {Math.round(candidate.compatibility_score * 100)}%
                            </div>
                            <div className={`text-sm ${getCompatibilityColor(candidate.compatibility_score)}`}>
                              {getCompatibilityText(candidate.compatibility_score)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="font-medium">경력:</span>
                            <span className="ml-1">{candidate.employee.experience_years}년</span>
                          </div>
                          <div>
                            <span className="font-medium">현재 교대:</span>
                            <Badge variant="outline" className="ml-1">
                              {candidate.current_assignment.shift_type}
                            </Badge>
                          </div>
                          <div>
                            <span className="font-medium">피로도:</span>
                            <span className={`ml-1 ${candidate.employee.current_fatigue_score > 7 ? 'text-red-600' : 'text-green-600'}`}>
                              {candidate.employee.current_fatigue_score}/10
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">최근 교환:</span>
                            <span className="ml-1">{candidate.compatibility_factors.recent_exchange_count}회</span>
                          </div>
                        </div>

                        {candidate.availability_conflicts.length > 0 && (
                          <Alert className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              주의사항: {candidate.availability_conflicts.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2 mt-3">
                          {candidate.compatibility_factors.same_level && (
                            <Badge variant="secondary" className="text-xs">동일 레벨</Badge>
                          )}
                          {candidate.compatibility_factors.certification_match > 0.8 && (
                            <Badge variant="secondary" className="text-xs">자격증 일치</Badge>
                          )}
                          {candidate.compatibility_factors.fatigue_compatibility && (
                            <Badge variant="secondary" className="text-xs">피로도 양호</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 교환 사유 입력 */}
          {selectedCandidate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">교환 요청</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="exchange-reason">교환 사유</Label>
                  <Textarea
                    id="exchange-reason"
                    placeholder="교환이 필요한 사유를 입력해주세요..."
                    value={exchangeReason}
                    onChange={(e) => setExchangeReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    교환 요청 후 상대방의 승인과 관리자 승인이 필요합니다.
                    승인 완료 후 근무 일정이 자동으로 변경됩니다.
                  </AlertDescription>
                </Alert>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={requestExchange}
                    disabled={submitting || !exchangeReason.trim()}
                  >
                    {submitting ? '요청 중...' : '교환 요청'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
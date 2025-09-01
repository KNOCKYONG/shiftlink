'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeftRight,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

interface SwapCandidate {
  employee_id: string
  employee_name: string
  current_shift_type: string
  current_shift_time: string
  compatibility_score: number
  potential_issues: string[]
}

interface SwapRequestFormProps {
  currentAssignment: {
    id: string
    date: string
    shift_type: string
    shift_time: string
    employee_id: string
  }
  availableCandidates: SwapCandidate[]
  onSubmit: (data: {
    target_employee_id: string
    reason: string
    is_emergency?: boolean
  }) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function SwapRequestForm({
  currentAssignment,
  availableCandidates,
  onSubmit,
  onCancel,
  isSubmitting = false
}: SwapRequestFormProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string>('')
  const [reason, setReason] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [selectedCandidateData, setSelectedCandidateData] = useState<SwapCandidate | null>(null)

  useEffect(() => {
    if (selectedCandidate) {
      const candidate = availableCandidates.find(c => c.employee_id === selectedCandidate)
      setSelectedCandidateData(candidate || null)
    } else {
      setSelectedCandidateData(null)
    }
  }, [selectedCandidate, availableCandidates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCandidate || !reason.trim()) {
      return
    }

    await onSubmit({
      target_employee_id: selectedCandidate,
      reason: reason.trim(),
      is_emergency: isEmergency
    })
  }

  const getShiftName = (shiftType: string) => {
    switch (shiftType) {
      case 'day': return '데이'
      case 'evening': return '이브닝'
      case 'night': return '나이트'
      case 'off': return '오프'
      default: return shiftType
    }
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompatibilityText = (score: number) => {
    if (score >= 80) return '매우 좋음'
    if (score >= 60) return '보통'
    return '주의 필요'
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          근무 교환 요청
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 현재 배정 정보 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">교환하려는 근무</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>{currentAssignment.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{getShiftName(currentAssignment.shift_type)} ({currentAssignment.shift_time})</span>
              </div>
            </div>
          </div>

          {/* 교환 대상 선택 */}
          <div className="space-y-2">
            <Label htmlFor="candidate">교환 대상 선택 *</Label>
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger>
                <SelectValue placeholder="교환할 직원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {availableCandidates.map(candidate => (
                  <SelectItem key={candidate.employee_id} value={candidate.employee_id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{candidate.employee_name}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {getShiftName(candidate.current_shift_type)}
                        </Badge>
                        <span className={`text-xs font-medium ${getCompatibilityColor(candidate.compatibility_score)}`}>
                          {candidate.compatibility_score}%
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 후보자 상세 정보 */}
          {selectedCandidateData && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {selectedCandidateData.employee_name}님과의 교환 정보
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">현재 근무:</span>
                  <div className="font-medium">
                    {getShiftName(selectedCandidateData.current_shift_type)} ({selectedCandidateData.current_shift_time})
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">호환성:</span>
                  <div className={`font-medium ${getCompatibilityColor(selectedCandidateData.compatibility_score)}`}>
                    {getCompatibilityText(selectedCandidateData.compatibility_score)} ({selectedCandidateData.compatibility_score}%)
                  </div>
                </div>
              </div>

              {/* 잠재적 이슈 */}
              {selectedCandidateData.potential_issues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">주의사항:</div>
                      {selectedCandidateData.potential_issues.map((issue, index) => (
                        <div key={index} className="text-sm">• {issue}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* 교환 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">교환 사유 *</Label>
            <Textarea
              id="reason"
              placeholder="교환이 필요한 사유를 상세히 입력해 주세요..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 응급 요청 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="emergency"
              className="rounded border-gray-300"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
            />
            <Label htmlFor="emergency" className="text-sm">
              응급 상황 (즉시 처리 요청)
            </Label>
          </div>

          {isEmergency && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                응급 요청은 관리자에게 즉시 알림이 발송되며, 일반 승인 절차를 거치지 않고 우선 처리됩니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button
              type="submit"
              disabled={!selectedCandidate || !reason.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? '요청 중...' : '교환 요청하기'}
            </Button>
          </div>
        </form>

        {/* 도움말 */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 교환 요청 안내</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p>• 교환 요청은 상대방의 수락과 관리자 승인을 거쳐 확정됩니다.</p>
            <p>• 호환성이 낮은 교환은 거부될 수 있습니다.</p>
            <p>• 응급 상황이 아닌 경우 최소 24시간 전에 요청해 주세요.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
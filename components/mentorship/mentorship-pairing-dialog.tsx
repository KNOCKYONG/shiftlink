'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Calendar,
  Sparkles
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  level: number
  role: string
  team_name?: string
  current_mentees?: number
  current_mentor?: string
}

interface MentorRecommendation {
  mentor_id: string
  mentor_name: string
  mentor_level: number
  compatibility_score: number
  current_mentees: number
  reasons: string[]
}

interface MentorshipPairingDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  preSelectedMentee?: string
}

export function MentorshipPairingDialog({
  open,
  onClose,
  onSuccess,
  preSelectedMentee
}: MentorshipPairingDialogProps) {
  const [mentees, setMentees] = useState<Employee[]>([])
  const [mentors, setMentors] = useState<Employee[]>([])
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([])
  const [selectedMentee, setSelectedMentee] = useState(preSelectedMentee || '')
  const [selectedMentor, setSelectedMentor] = useState('')
  const [mentorshipType, setMentorshipType] = useState('onboarding')
  const [pairingStrength, setPairingStrength] = useState([7])
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)

  useEffect(() => {
    if (open) {
      fetchEmployees()
    }
  }, [open])

  useEffect(() => {
    if (selectedMentee) {
      fetchRecommendations(selectedMentee)
    }
  }, [selectedMentee])

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const data = await response.json()
      
      // 멘티 가능한 직원 (레벨이 낮은 직원들)
      const potentialMentees = data.employees.filter((e: Employee) => 
        e.level <= 2 && !e.current_mentor
      )
      setMentees(potentialMentees)
      
      // 멘토 가능한 직원 (레벨이 높은 직원들)
      const potentialMentors = data.employees.filter((e: Employee) => 
        e.level >= 2 && (!e.current_mentees || e.current_mentees < 3)
      )
      setMentors(potentialMentors)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchRecommendations = async (menteeId: string) => {
    try {
      const response = await fetch(`/api/mentorship/recommend?mentee_id=${menteeId}`)
      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setShowRecommendations(true)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedMentee || !selectedMentor) {
      alert('멘토와 멘티를 모두 선택해주세요')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/mentorship/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_id: selectedMentor,
          mentee_id: selectedMentee,
          mentorship_type: mentorshipType,
          pairing_strength: pairingStrength[0],
          duration_days: parseInt(duration),
          notes
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(`생성 실패: ${error.message}`)
      }
    } catch (error) {
      console.error('Error creating mentorship:', error)
      alert('멘토십 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getDurationText = (days: string) => {
    const d = parseInt(days)
    if (d === 30) return '1개월'
    if (d === 60) return '2개월'
    if (d === 90) return '3개월'
    if (d === 180) return '6개월'
    return `${d}일`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            새 멘토십 페어링 생성
          </DialogTitle>
          <DialogDescription>
            멘토와 멘티를 매칭하여 새로운 멘토십 관계를 생성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 멘티 선택 */}
          <div className="space-y-2">
            <Label htmlFor="mentee">멘티 선택</Label>
            <Select value={selectedMentee} onValueChange={setSelectedMentee}>
              <SelectTrigger>
                <SelectValue placeholder="멘티를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {mentees.map((mentee) => (
                  <SelectItem key={mentee.id} value={mentee.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{mentee.name}</span>
                      <Badge variant="outline" className="ml-2">
                        Level {mentee.level}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI 추천 멘토 */}
          {showRecommendations && recommendations.length > 0 && (
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">AI 추천 멘토</span>
              </div>
              <div className="space-y-2">
                {recommendations.slice(0, 3).map((rec) => (
                  <div
                    key={rec.mentor_id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => setSelectedMentor(rec.mentor_id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{rec.mentor_name}</div>
                        <div className="text-sm text-gray-600">
                          Level {rec.mentor_level} · 현재 멘티 {rec.current_mentees}명
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        매칭률 {rec.compatibility_score}%
                      </Badge>
                      {selectedMentor === rec.mentor_id && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 멘토 선택 */}
          <div className="space-y-2">
            <Label htmlFor="mentor">멘토 선택</Label>
            <Select value={selectedMentor} onValueChange={setSelectedMentor}>
              <SelectTrigger>
                <SelectValue placeholder="멘토를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {mentors.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{mentor.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Level {mentor.level}</Badge>
                        {mentor.current_mentees && (
                          <Badge variant="secondary">
                            멘티 {mentor.current_mentees}명
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 멘토십 타입 */}
          <div className="space-y-2">
            <Label htmlFor="type">멘토십 타입</Label>
            <Select value={mentorshipType} onValueChange={setMentorshipType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">
                  <div>
                    <div className="font-medium">온보딩</div>
                    <div className="text-sm text-gray-500">신입 직원 교육 및 적응</div>
                  </div>
                </SelectItem>
                <SelectItem value="skill_development">
                  <div>
                    <div className="font-medium">스킬 개발</div>
                    <div className="text-sm text-gray-500">전문 기술 향상</div>
                  </div>
                </SelectItem>
                <SelectItem value="leadership">
                  <div>
                    <div className="font-medium">리더십</div>
                    <div className="text-sm text-gray-500">리더십 역량 개발</div>
                  </div>
                </SelectItem>
                <SelectItem value="general">
                  <div>
                    <div className="font-medium">일반</div>
                    <div className="text-sm text-gray-500">전반적인 성장 지원</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 페어링 강도 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>페어링 강도</Label>
              <span className="text-sm font-medium">{pairingStrength[0]}/10</span>
            </div>
            <Slider
              value={pairingStrength}
              onValueChange={setPairingStrength}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              높을수록 같은 시프트 배치 우선순위가 높아집니다
            </p>
          </div>

          {/* 기간 설정 */}
          <div className="space-y-2">
            <Label htmlFor="duration">멘토십 기간</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">1개월</SelectItem>
                <SelectItem value="60">2개월</SelectItem>
                <SelectItem value="90">3개월</SelectItem>
                <SelectItem value="180">6개월</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="멘토십 목표, 특별 요청사항 등을 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* 정보 알림 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              멘토십이 생성되면 스케줄 생성 시 자동으로 같은 시프트에 배치를 우선 고려합니다.
              페어링 강도가 높을수록 우선순위가 높아집니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedMentee || !selectedMentor}>
            {loading ? '생성 중...' : '페어링 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
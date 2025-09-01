'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, AlertCircle, CheckCircle, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveType } from '@/types'

interface LeaveRequestFormProps {
  onSubmit?: (data: LeaveFormData) => Promise<void>
  onCancel?: () => void
  className?: string
}

interface LeaveFormData {
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
  is_emergency: boolean
  attachment_url?: string
}

const leaveTypes: Array<{ value: LeaveType; label: string; color: string; description: string }> = [
  { value: 'annual', label: '연차', color: 'bg-blue-100 text-blue-700', description: '개인 휴가 및 여행' },
  { value: 'sick', label: '병가', color: 'bg-red-100 text-red-700', description: '질병으로 인한 휴가' },
  { value: 'personal', label: '개인사유', color: 'bg-green-100 text-green-700', description: '개인적인 사유' },
  { value: 'maternity', label: '출산휴가', color: 'bg-pink-100 text-pink-700', description: '출산 관련 휴가' },
  { value: 'paternity', label: '육아휴가', color: 'bg-purple-100 text-purple-700', description: '육아 관련 휴가' },
  { value: 'emergency', label: '응급', color: 'bg-orange-100 text-orange-700', description: '긴급한 상황' },
  { value: 'bereavement', label: '경조사', color: 'bg-gray-100 text-gray-700', description: '경조사 관련' },
  { value: 'other', label: '기타', color: 'bg-yellow-100 text-yellow-700', description: '기타 사유' }
]

export function LeaveRequestForm({ onSubmit, onCancel, className }: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    is_emergency: false,
    attachment_url: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedLeaveType = leaveTypes.find(type => type.value === formData.leave_type)
  
  // 일수 계산
  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0
    const start = new Date(formData.start_date)
    const end = new Date(formData.end_date)
    if (end < start) return 0
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const daysCount = calculateDays()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.leave_type || !formData.start_date || !formData.end_date) {
      setError('모든 필수 항목을 입력해주세요.')
      return
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setError('종료일은 시작일보다 늦어야 합니다.')
      return
    }

    if (new Date(formData.start_date) < new Date()) {
      setError('시작일은 오늘 이후여야 합니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (onSubmit) {
        await onSubmit(formData)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '휴가 신청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = <K extends keyof LeaveFormData>(key: K, value: LeaveFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Card className={cn("max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          휴가 신청
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>휴가 신청이 성공적으로 제출되었습니다.</AlertDescription>
            </Alert>
          )}

          {/* 휴가 유형 선택 */}
          <div className="space-y-3">
            <Label htmlFor="leave-type">휴가 유형 *</Label>
            <Select 
              value={formData.leave_type} 
              onValueChange={(value: LeaveType) => updateField('leave_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={type.color}>
                        {type.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedLeaveType && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="secondary" className={selectedLeaveType.color}>
                  {selectedLeaveType.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedLeaveType.description}
                </span>
              </div>
            )}
          </div>

          {/* 날짜 선택 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">시작일 *</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">종료일 *</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* 일수 표시 */}
          {daysCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                신청 일수: {daysCount}일
              </span>
              <span className="text-sm text-blue-600">
                ({formData.start_date} ~ {formData.end_date})
              </span>
            </div>
          )}

          {/* 응급 휴가 설정 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="emergency" className="text-base font-medium">
                응급 휴가
              </Label>
              <p className="text-sm text-muted-foreground">
                응급한 상황으로 즉시 승인이 필요한 경우 체크하세요
              </p>
            </div>
            <Switch
              id="emergency"
              checked={formData.is_emergency}
              onCheckedChange={(checked) => updateField('is_emergency', checked)}
            />
          </div>

          {formData.is_emergency && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                응급 휴가로 신청하면 자동으로 승인되며, 관리자에게 즉시 알림이 전송됩니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 사유 입력 */}
          <div className="space-y-2">
            <Label htmlFor="reason">휴가 사유</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => updateField('reason', e.target.value)}
              placeholder="휴가 사유를 간단히 설명해주세요..."
              rows={3}
            />
          </div>

          {/* 첨부파일 (추후 구현) */}
          <div className="space-y-2">
            <Label htmlFor="attachment">첨부파일 (선택사항)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                의사 진단서 등 관련 서류가 있으면 첨부해주세요
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2" disabled>
                파일 업로드 (준비중)
              </Button>
            </div>
          </div>

          {/* 제출 버튼들 */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                취소
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={loading || !formData.leave_type || !formData.start_date || !formData.end_date}
              className="flex-1"
            >
              {loading ? '신청 중...' : (formData.is_emergency ? '응급 휴가 신청' : '휴가 신청')}
            </Button>
          </div>

          {/* 안내 사항 */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">📋 휴가 신청 안내</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 연차는 7일 전 사전 신청이 원칙입니다</li>
              <li>• 병가는 2일 이하인 경우 자동 승인됩니다</li>
              <li>• 응급 휴가는 즉시 승인되지만 사후 서류 제출이 필요할 수 있습니다</li>
              <li>• 승인 결과는 알림으로 전송됩니다</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
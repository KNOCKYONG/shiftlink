'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  Shield, 
  BarChart3, 
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Users
} from 'lucide-react'

interface AssignmentExplanationProps {
  employeeId: string
  scheduleId?: string
  dateRange?: {
    start: string
    end: string
  }
}

interface AssignmentReason {
  category: string
  category_display: string
  priority: number
  score: number
  explanation: string
  details: any
}

interface AuditRecord {
  date: string
  shift_type: string
  shift_display_name: string
  confidence_score: number
  assignment_reasons: AssignmentReason[]
  fairness_context: {
    fairness_score: number
    team_comparison: {
      night_shifts_comparison: number
      weekend_shifts_comparison: number
    }
    equity_justification: string
  }
  safety_analysis: {
    safety_score: number
    consecutive_days: number
    consecutive_nights: number
    detected_risks: Array<{
      type: string
      severity: string
      description: string
    }>
  }
  schedule_info: {
    schedule_name: string
    schedule_period: string
  }
  decision_timestamp: string
}

export default function AssignmentExplanation({ 
  employeeId, 
  scheduleId, 
  dateRange 
}: AssignmentExplanationProps) {
  const [auditData, setAuditData] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchAuditData()
  }, [employeeId, scheduleId, dateRange])

  const fetchAuditData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        employee_id: employeeId
      })
      
      if (scheduleId) params.append('schedule_id', scheduleId)
      if (dateRange?.start) params.append('start_date', dateRange.start)
      if (dateRange?.end) params.append('end_date', dateRange.end)

      const response = await fetch(`/api/assignments/audit?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch audit data')
      }

      setAuditData(result.data || [])
      if (result.data && result.data.length > 0) {
        setSelectedDate(result.data[0].date)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const selectedRecord = auditData.find(record => record.date === selectedDate)

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">배정 근거 데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          배정 근거 조회 중 오류가 발생했습니다: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (auditData.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>선택한 기간에 배정 기록이 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 날짜 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            배정 근거 상세 조회
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {auditData.map((record) => (
              <Button
                key={record.date}
                variant={selectedDate === record.date ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(record.date)}
                className="flex items-center gap-2"
              >
                <span>{new Date(record.date).toLocaleDateString('ko-KR', { 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
                <Badge variant={getShiftVariant(record.shift_type)}>
                  {record.shift_display_name}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 날짜의 상세 정보 */}
      {selectedRecord && (
        <Tabs defaultValue="reasons" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reasons">배정 근거</TabsTrigger>
            <TabsTrigger value="fairness">공정성</TabsTrigger>
            <TabsTrigger value="safety">안전성</TabsTrigger>
            <TabsTrigger value="overview">종합</TabsTrigger>
          </TabsList>

          {/* 배정 근거 탭 */}
          <TabsContent value="reasons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {new Date(selectedRecord.date).toLocaleDateString('ko-KR')} - {selectedRecord.shift_display_name} 근무
                  <Badge variant={getConfidenceVariant(selectedRecord.confidence_score)}>
                    신뢰도 {selectedRecord.confidence_score}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedRecord.assignment_reasons
                    .sort((a, b) => b.priority - a.priority)
                    .map((reason, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(reason.category)}
                          <span className="font-medium">{reason.category_display}</span>
                          <Badge variant="outline">
                            우선순위 {reason.priority}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">점수</div>
                          <div className="font-bold text-lg">{reason.score}점</div>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{reason.explanation}</p>
                      
                      {reason.details && Object.keys(reason.details).length > 0 && (
                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <div className="font-medium mb-2">세부사항:</div>
                          {renderReasonDetails(reason)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 공정성 탭 */}
          <TabsContent value="fairness" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  공정성 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 공정성 점수 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">개인 공정성 점수</span>
                      <span className="text-2xl font-bold">
                        {selectedRecord.fairness_context.fairness_score}점
                      </span>
                    </div>
                    <Progress 
                      value={selectedRecord.fairness_context.fairness_score} 
                      className="h-2"
                    />
                    <div className="text-sm text-gray-600 mt-1">
                      {getFairnessDescription(selectedRecord.fairness_context.fairness_score)}
                    </div>
                  </div>

                  {/* 팀 평균 비교 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium mb-1">야간근무</div>
                      <div className="text-lg font-bold">
                        {selectedRecord.fairness_context.team_comparison.night_shifts_comparison > 0 ? '+' : ''}
                        {selectedRecord.fairness_context.team_comparison.night_shifts_comparison.toFixed(1)}
                      </div>
                      <div className="text-xs text-blue-600">팀 평균 대비</div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium mb-1">주말근무</div>
                      <div className="text-lg font-bold">
                        {selectedRecord.fairness_context.team_comparison.weekend_shifts_comparison > 0 ? '+' : ''}
                        {selectedRecord.fairness_context.team_comparison.weekend_shifts_comparison.toFixed(1)}
                      </div>
                      <div className="text-xs text-green-600">팀 평균 대비</div>
                    </div>
                  </div>

                  {/* 공정성 근거 */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>공정성 근거:</strong> {selectedRecord.fairness_context.equity_justification}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 안전성 탭 */}
          <TabsContent value="safety" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  안전성 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 안전성 점수 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">패턴 안전성 점수</span>
                      <span className="text-2xl font-bold">
                        {selectedRecord.safety_analysis.safety_score}점
                      </span>
                    </div>
                    <Progress 
                      value={selectedRecord.safety_analysis.safety_score} 
                      className="h-2"
                    />
                    <div className="text-sm text-gray-600 mt-1">
                      {getSafetyDescription(selectedRecord.safety_analysis.safety_score)}
                    </div>
                  </div>

                  {/* 연속 근무 현황 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium mb-1">연속 근무일</div>
                      <div className="text-2xl font-bold">{selectedRecord.safety_analysis.consecutive_days}일</div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-purple-600 font-medium mb-1">연속 야간근무</div>
                      <div className="text-2xl font-bold">{selectedRecord.safety_analysis.consecutive_nights}일</div>
                    </div>
                  </div>

                  {/* 위험 패턴 감지 */}
                  {selectedRecord.safety_analysis.detected_risks.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        감지된 위험 패턴
                      </h4>
                      <div className="space-y-2">
                        {selectedRecord.safety_analysis.detected_risks.map((risk, index) => (
                          <Alert key={index} className="border-amber-200 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription>
                              <div className="flex items-center justify-between">
                                <span>{risk.description}</span>
                                <Badge variant={getSeverityVariant(risk.severity)}>
                                  {getSeverityText(risk.severity)}
                                </Badge>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 종합 탭 */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  배정 결정 종합 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 전체 신뢰도 */}
                  <div className="text-center bg-blue-50 rounded-lg p-6">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {selectedRecord.confidence_score}%
                    </div>
                    <div className="text-blue-800 font-medium">전체 배정 신뢰도</div>
                    <div className="text-sm text-blue-600 mt-2">
                      {getConfidenceDescription(selectedRecord.confidence_score)}
                    </div>
                  </div>

                  {/* 주요 지표들 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-lg font-bold">{selectedRecord.fairness_context.fairness_score}점</div>
                      <div className="text-sm text-gray-600">공정성</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-lg font-bold">{selectedRecord.safety_analysis.safety_score}점</div>
                      <div className="text-sm text-gray-600">안전성</div>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-lg font-bold">{selectedRecord.assignment_reasons.length}개</div>
                      <div className="text-sm text-gray-600">근거 요소</div>
                    </div>
                  </div>

                  {/* 스케줄 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">스케줄 정보</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>스케줄명:</strong> {selectedRecord.schedule_info.schedule_name}</div>
                      <div><strong>기간:</strong> {selectedRecord.schedule_info.schedule_period}</div>
                      <div><strong>결정 시각:</strong> {new Date(selectedRecord.decision_timestamp).toLocaleString('ko-KR')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// 헬퍼 함수들
function getShiftVariant(shiftType: string) {
  const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'day': 'default',
    'evening': 'secondary', 
    'night': 'destructive',
    'off': 'outline'
  }
  return variants[shiftType] || 'outline'
}

function getConfidenceVariant(score: number) {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'destructive'
}

function getCategoryIcon(category: string) {
  const icons: { [key: string]: JSX.Element } = {
    'preference': <Heart className="h-4 w-4 text-pink-500" />,
    'fairness': <BarChart3 className="h-4 w-4 text-blue-500" />,
    'constraint': <Shield className="h-4 w-4 text-red-500" />,
    'pattern_safety': <Shield className="h-4 w-4 text-green-500" />,
    'coverage': <Users className="h-4 w-4 text-purple-500" />,
    'optimization': <TrendingUp className="h-4 w-4 text-gray-500" />
  }
  return icons[category] || <Info className="h-4 w-4" />
}

function renderReasonDetails(reason: AssignmentReason) {
  if (!reason.details) return null

  return (
    <div className="space-y-1">
      {Object.entries(reason.details).map(([key, value]) => (
        <div key={key} className="flex justify-between">
          <span className="text-gray-600">{formatDetailKey(key)}:</span>
          <span className="font-medium">{formatDetailValue(value)}</span>
        </div>
      ))}
    </div>
  )
}

function formatDetailKey(key: string): string {
  const keyMap: { [key: string]: string } = {
    'confidence_score': '신뢰도',
    'current_fairness': '현재 공정성',
    'night_shift_ratio': '야간근무 비율',
    'weekend_ratio': '주말근무 비율',
    'risk_score': '위험 점수',
    'consecutive_days': '연속 근무일'
  }
  return keyMap[key] || key
}

function formatDetailValue(value: any): string {
  if (typeof value === 'number') {
    return `${Math.round(value)}${value > 1 ? '' : '%'}`
  }
  return String(value)
}

function getFairnessDescription(score: number): string {
  if (score >= 80) return '매우 공정한 수준입니다'
  if (score >= 60) return '양호한 공정성을 보입니다'
  if (score >= 40) return '개선이 필요한 상태입니다'
  return '공정성 개선이 우선 필요합니다'
}

function getSafetyDescription(score: number): string {
  if (score >= 80) return '매우 안전한 패턴입니다'
  if (score >= 60) return '안전한 수준입니다'
  if (score >= 40) return '주의가 필요한 패턴입니다'
  return '위험 패턴이 감지되었습니다'
}

function getSeverityVariant(severity: string) {
  const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'low': 'outline',
    'medium': 'secondary',
    'high': 'default',
    'critical': 'destructive'
  }
  return variants[severity] || 'outline'
}

function getSeverityText(severity: string): string {
  const textMap: { [key: string]: string } = {
    'low': '낮음',
    'medium': '보통', 
    'high': '높음',
    'critical': '위험'
  }
  return textMap[severity] || severity
}

function getConfidenceDescription(score: number): string {
  if (score >= 90) return '매우 높은 신뢰도의 최적 배정'
  if (score >= 80) return '높은 신뢰도의 적절한 배정'
  if (score >= 70) return '보통 수준의 적절한 배정'
  if (score >= 60) return '최소 기준을 만족하는 배정'
  return '제약 조건으로 인한 차선책 배정'
}
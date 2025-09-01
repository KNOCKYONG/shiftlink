'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface ScheduleReport {
  employee_id: string
  employee_name: string
  month: string
  
  // 근무 배정
  shifts: {
    day: number
    evening: number
    night: number
    off: number
  }
  
  // 반영된 사항
  reflected_items: {
    fixed_shifts: string[]
    time_off_requests: string[]
    special_considerations: string[]
  }
  
  // 공정성 지표
  fairness: {
    status: 'favorable' | 'average' | 'unfavorable'
    balance_score: number
    preference_match_rate: number
    explanation: string
  }
  
  // 특이사항
  highlights: string[]
}

interface ScheduleReportCardProps {
  report: ScheduleReport
  detailed?: boolean
}

export function ScheduleReportCard({ report, detailed = false }: ScheduleReportCardProps) {
  const getFairnessColor = (status: string) => {
    switch (status) {
      case 'favorable': return 'text-green-600'
      case 'unfavorable': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getFairnessIcon = (status: string) => {
    switch (status) {
      case 'favorable': return <TrendingUp className="h-4 w-4" />
      case 'unfavorable': return <TrendingDown className="h-4 w-4" />
      default: return <Minus className="h-4 w-4" />
    }
  }

  const getFairnessText = (status: string) => {
    switch (status) {
      case 'favorable': return '유리함'
      case 'unfavorable': return '불리함'
      default: return '평균적'
    }
  }

  const totalShifts = report.shifts.day + report.shifts.evening + report.shifts.night

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {report.employee_name}님의 {report.month} 스케줄
          </CardTitle>
          <Badge variant="outline" className={getFairnessColor(report.fairness.status)}>
            {getFairnessIcon(report.fairness.status)}
            <span className="ml-1">{getFairnessText(report.fairness.status)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 근무 배정 요약 */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-700">{report.shifts.day}</div>
            <div className="text-xs text-gray-600">Day</div>
          </div>
          <div className="p-2 bg-orange-50 rounded">
            <div className="text-2xl font-bold text-orange-700">{report.shifts.evening}</div>
            <div className="text-xs text-gray-600">Evening</div>
          </div>
          <div className="p-2 bg-purple-50 rounded">
            <div className="text-2xl font-bold text-purple-700">{report.shifts.night}</div>
            <div className="text-xs text-gray-600">Night</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-700">{report.shifts.off}</div>
            <div className="text-xs text-gray-600">휴무</div>
          </div>
        </div>

        {/* 반영된 사항 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">✅ 반영된 사항</div>
          <div className="space-y-1">
            {report.reflected_items.fixed_shifts.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {item}
              </div>
            ))}
            {report.reflected_items.time_off_requests.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* 선호도 매칭률 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">선호도 반영률</span>
            <span className="font-medium">{report.fairness.preference_match_rate}%</span>
          </div>
          <Progress value={report.fairness.preference_match_rate} className="h-2" />
        </div>

        {/* 공정성 설명 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            {report.fairness.explanation}
          </div>
        </div>

        {/* 상세 정보 (선택적) */}
        {detailed && report.highlights.length > 0 && (
          <div className="pt-3 border-t space-y-1">
            <div className="text-sm font-medium text-gray-700">💡 참고사항</div>
            {report.highlights.map((highlight, idx) => (
              <div key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                <AlertCircle className="h-3 w-3 text-blue-500 mt-0.5" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 팀 전체 공정성 리포트
export function TeamFairnessReport({ 
  teamName,
  month,
  reports 
}: {
  teamName: string
  month: string
  reports: ScheduleReport[]
}) {
  // 통계 계산
  const avgDayShifts = reports.reduce((sum, r) => sum + r.shifts.day, 0) / reports.length
  const avgEveningShifts = reports.reduce((sum, r) => sum + r.shifts.evening, 0) / reports.length
  const avgNightShifts = reports.reduce((sum, r) => sum + r.shifts.night, 0) / reports.length
  
  const favorableCount = reports.filter(r => r.fairness.status === 'favorable').length
  const unfavorableCount = reports.filter(r => r.fairness.status === 'unfavorable').length
  const averageCount = reports.filter(r => r.fairness.status === 'average').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {teamName} {month} 공정성 리포트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 근무 분포 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">평균 근무 분포</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold">{avgDayShifts.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Day</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold">{avgEveningShifts.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Evening</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold">{avgNightShifts.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Night</div>
            </div>
          </div>
        </div>

        {/* 공정성 분포 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">공정성 분포</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">유리함</span>
              <div className="flex items-center gap-2">
                <Progress value={(favorableCount / reports.length) * 100} className="w-24 h-2" />
                <span className="text-sm font-medium">{favorableCount}명</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">평균</span>
              <div className="flex items-center gap-2">
                <Progress value={(averageCount / reports.length) * 100} className="w-24 h-2" />
                <span className="text-sm font-medium">{averageCount}명</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">불리함</span>
              <div className="flex items-center gap-2">
                <Progress value={(unfavorableCount / reports.length) * 100} className="w-24 h-2" />
                <span className="text-sm font-medium">{unfavorableCount}명</span>
              </div>
            </div>
          </div>
        </div>

        {/* 요약 메시지 */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            전체 {reports.length}명 중 {Math.round((favorableCount / reports.length) * 100)}%가 
            선호 시간대를 배정받았으며, 팀 전체 균형도는 양호합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
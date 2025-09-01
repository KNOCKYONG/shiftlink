'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleGenerator } from '@/components/schedule/schedule-generator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Users,
  ArrowLeft,
  BarChart3,
  Clock
} from 'lucide-react'

interface User {
  id: string
  name: string
  role: string
  tenantId: string
  employeeId: string
}

interface Team {
  id: string
  name: string
  employee_count: number
}

interface Site {
  id: string
  name: string
}

interface GenerationResult {
  success: boolean
  schedule_id: string
  generation_stats: {
    total_assignments: number
    total_employees: number
    date_range_days: number
    coverage_rate: number
    fairness_score: number
    pattern_analysis: any
    generation_time_ms: number
  }
  assignments: Array<{
    employee_id: string
    employee_name: string
    date: string
    shift_type: string
    korean_shift_name: string
    reason: string
  }>
  message: string
}

interface ScheduleGenerationPageProps {
  user: User
  teams: Team[]
  sites: Site[]
}

export function ScheduleGenerationPage({ user, teams, sites }: ScheduleGenerationPageProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (data: any) => {
    setIsGenerating(true)
    setError(null)
    setGenerationResult(null)

    try {
      const response = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '스케줄 생성에 실패했습니다.')
      }

      setGenerationResult(result)
    } catch (err) {
      console.error('Schedule generation error:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewSchedule = () => {
    if (generationResult?.schedule_id) {
      router.push(`/dashboard/schedule/${generationResult.schedule_id}`)
    }
  }

  const handleGoBack = () => {
    router.push('/dashboard/schedule')
  }

  const handleCreateNew = () => {
    setGenerationResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">스케줄 생성</h1>
              <p className="text-gray-600 mt-1">
                자동 스케줄링 엔진을 사용하여 공정하고 효율적인 근무표를 생성합니다.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {user.role === 'admin' ? '관리자' : '매니저'}
        </Badge>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 생성 결과 */}
      {generationResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              스케줄 생성 완료!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700">{generationResult.message}</p>
            
            {/* 생성 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {generationResult.generation_stats.total_employees}
                </div>
                <div className="text-sm text-gray-600">직원 수</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <Calendar className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {generationResult.generation_stats.date_range_days}
                </div>
                <div className="text-sm text-gray-600">일 수</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <BarChart3 className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(generationResult.generation_stats.coverage_rate * 100)}%
                </div>
                <div className="text-sm text-gray-600">커버리지</div>
              </div>
              
              <div className="text-center p-3 bg-white rounded-lg">
                <Clock className="h-6 w-6 mx-auto text-orange-600 mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {(generationResult.generation_stats.generation_time_ms / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">생성 시간</div>
              </div>
            </div>

            {/* 공정성 점수 */}
            {generationResult.generation_stats.fairness_score > 0 && (
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">공정성 점수</span>
                  <Badge 
                    variant={generationResult.generation_stats.fairness_score >= 80 ? 'default' : 'secondary'}
                  >
                    {Math.round(generationResult.generation_stats.fairness_score)}/100
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      generationResult.generation_stats.fairness_score >= 80 
                        ? 'bg-green-600' 
                        : generationResult.generation_stats.fairness_score >= 60 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${generationResult.generation_stats.fairness_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleViewSchedule} className="flex-1">
                생성된 스케줄 보기
              </Button>
              <Button variant="outline" onClick={handleCreateNew}>
                새 스케줄 생성
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 스케줄 생성기 (결과가 없을 때만 표시) */}
      {!generationResult && (
        <ScheduleGenerator
          teams={teams}
          sites={sites}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {/* 도움말 */}
      {!generationResult && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              💡 스케줄 생성 도움말
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>선호 패턴 반영</strong>: 직원이 설정한 개인별 선호 근무 패턴을 최대한 반영합니다.</p>
              <p>• <strong>연속 야간 최소화</strong>: 건강을 위해 연속 야간 근무를 최소화합니다.</p>
              <p>• <strong>업무량 균형</strong>: 모든 직원이 공정하게 근무하도록 업무량을 균형있게 배분합니다.</p>
              <p>• <strong>위험 패턴 회피</strong>: 데이나오(연속 3교대) 등 위험한 근무 패턴을 피합니다.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  Award
} from 'lucide-react'

interface MentorshipRelationship {
  id: string
  mentor_name: string
  mentee_name: string
  status: string
  mentorship_type: string
  pairing_strength: number
  days_active: number
  pairing_success_rate?: number
}

interface MentorshipMetricsChartProps {
  relationships: MentorshipRelationship[]
}

export function MentorshipMetricsChart({ relationships }: MentorshipMetricsChartProps) {
  // 타입별 통계
  const typeStats = relationships.reduce((acc, rel) => {
    const type = rel.mentorship_type
    if (!acc[type]) {
      acc[type] = { count: 0, successRate: 0, totalRate: 0 }
    }
    acc[type].count++
    if (rel.pairing_success_rate) {
      acc[type].totalRate += rel.pairing_success_rate
    }
    return acc
  }, {} as Record<string, { count: number; successRate: number; totalRate: number }>)

  // 평균 성공률 계산
  Object.keys(typeStats).forEach(type => {
    const stat = typeStats[type]
    stat.successRate = stat.count > 0 ? Math.round(stat.totalRate / stat.count) : 0
  })

  // 상태별 통계
  const statusCounts = relationships.reduce((acc, rel) => {
    acc[rel.status] = (acc[rel.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 최고 성과 멘토십
  const topPerformers = relationships
    .filter(rel => rel.pairing_success_rate !== undefined)
    .sort((a, b) => (b.pairing_success_rate || 0) - (a.pairing_success_rate || 0))
    .slice(0, 3)

  // 평균 페어링 강도
  const avgPairingStrength = relationships.length > 0
    ? Math.round(relationships.reduce((sum, rel) => sum + rel.pairing_strength, 0) / relationships.length)
    : 0

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'onboarding': return '온보딩'
      case 'skill_development': return '스킬 개발'
      case 'leadership': return '리더십'
      case 'general': return '일반'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'onboarding': return 'bg-blue-500'
      case 'skill_development': return 'bg-green-500'
      case 'leadership': return 'bg-purple-500'
      case 'general': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 타입별 분포 및 성공률 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            타입별 멘토십 현황
          </CardTitle>
          <CardDescription>
            멘토십 타입별 분포와 평균 페어링 성공률
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(typeStats).map(([type, stat]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getTypeColor(type)}`} />
                  <span className="font-medium">{getTypeLabel(type)}</span>
                  <Badge variant="secondary">{stat.count}건</Badge>
                </div>
                <span className="text-sm text-gray-600">{stat.successRate}%</span>
              </div>
              <Progress value={stat.successRate} className="h-2" />
            </div>
          ))}

          {Object.keys(typeStats).length === 0 && (
            <div className="text-center py-4 text-gray-500">
              데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최고 성과 멘토십 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            최고 성과 멘토십
          </CardTitle>
          <CardDescription>
            페어링 성공률이 높은 상위 3개 멘토십
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topPerformers.map((rel, index) => (
            <div key={rel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {rel.mentor_name} → {rel.mentee_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTypeLabel(rel.mentorship_type)} · {rel.days_active}일
                  </div>
                </div>
              </div>
              <Badge variant="default">
                {rel.pairing_success_rate}%
              </Badge>
            </div>
          ))}

          {topPerformers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              아직 성과 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 핵심 지표 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            핵심 지표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">전체 관계 수</p>
              <p className="text-2xl font-bold">{relationships.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">평균 페어링 강도</p>
              <p className="text-2xl font-bold">{avgPairingStrength}/10</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">활성 관계</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts['active'] || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">완료된 관계</p>
              <p className="text-2xl font-bold text-blue-600">
                {statusCounts['completed'] || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상태별 분포 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            상태별 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const percentage = relationships.length > 0 
                ? Math.round((count / relationships.length) * 100)
                : 0
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={status === 'active' ? 'default' : 'secondary'}
                      className="min-w-[80px] justify-center"
                    >
                      {status}
                    </Badge>
                    <span className="text-sm text-gray-600">{count}건</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={percentage} className="w-20 h-2" />
                    <span className="text-sm font-medium w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
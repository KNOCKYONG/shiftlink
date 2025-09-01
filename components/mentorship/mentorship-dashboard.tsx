'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  Award, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { MentorshipPairingDialog } from './mentorship-pairing-dialog'
import { MentorshipMetricsChart } from './mentorship-metrics-chart'

interface MentorshipRelationship {
  id: string
  mentor_id: string
  mentor_name: string
  mentor_level: number
  mentee_id: string
  mentee_name: string
  mentee_level: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  mentorship_type: 'onboarding' | 'skill_development' | 'leadership' | 'general'
  pairing_strength: number
  days_active: number
  last_paired_date?: string
  pairing_success_rate?: number
}

interface MentorshipStats {
  active_relationships: number
  completed_relationships: number
  average_duration_days: number
  success_rate: number
  mentors_count: number
  mentees_count: number
}

export function MentorshipDashboard() {
  const [relationships, setRelationships] = useState<MentorshipRelationship[]>([])
  const [stats, setStats] = useState<MentorshipStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPairingDialog, setShowPairingDialog] = useState(false)
  const [selectedTab, setSelectedTab] = useState('active')

  useEffect(() => {
    fetchMentorshipData()
  }, [])

  const fetchMentorshipData = async () => {
    try {
      setLoading(true)
      
      // Fetch relationships
      const relResponse = await fetch('/api/mentorship/relationships')
      const relData = await relResponse.json()
      setRelationships(relData.relationships || [])
      
      // Fetch stats
      const statsResponse = await fetch('/api/mentorship/stats')
      const statsData = await statsResponse.json()
      setStats(statsData.stats)
      
    } catch (error) {
      console.error('Error fetching mentorship data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'onboarding': return <UserPlus className="h-4 w-4" />
      case 'skill_development': return <TrendingUp className="h-4 w-4" />
      case 'leadership': return <Award className="h-4 w-4" />
      default: return <GraduationCap className="h-4 w-4" />
    }
  }

  const activeRelationships = relationships.filter(r => r.status === 'active')
  const completedRelationships = relationships.filter(r => r.status === 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">멘토십 관리</h2>
          <p className="text-gray-600">멘토-멘티 관계를 관리하고 성과를 추적합니다</p>
        </div>
        <Button onClick={() => setShowPairingDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          새 페어링 생성
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                활성 관계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.active_relationships}</div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                성공률
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.success_rate}%</div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                평균 기간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.average_duration_days}일</div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                멘토 / 멘티
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {stats.mentors_count} / {stats.mentees_count}
                </div>
                <GraduationCap className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relationships Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>멘토십 관계</CardTitle>
          <CardDescription>
            현재 진행중이거나 완료된 멘토-멘티 관계를 확인합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                활성 ({activeRelationships.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                완료 ({completedRelationships.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-4">
              {activeRelationships.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>활성 멘토십 관계가 없습니다</p>
                </div>
              ) : (
                activeRelationships.map((rel) => (
                  <div key={rel.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(rel.mentorship_type)}
                          <span className="font-medium">
                            {rel.mentor_name} → {rel.mentee_name}
                          </span>
                          <Badge className={getStatusColor(rel.status)}>
                            {rel.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">타입:</span> {rel.mentorship_type}
                          </div>
                          <div>
                            <span className="font-medium">시작일:</span> {rel.start_date}
                          </div>
                          <div>
                            <span className="font-medium">진행일:</span> {rel.days_active}일
                          </div>
                          <div>
                            <span className="font-medium">페어링 강도:</span> {rel.pairing_strength}/10
                          </div>
                        </div>

                        {rel.pairing_success_rate !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>페어링 성공률</span>
                              <span>{rel.pairing_success_rate}%</span>
                            </div>
                            <Progress value={rel.pairing_success_rate} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          상세보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedRelationships.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>완료된 멘토십 관계가 없습니다</p>
                </div>
              ) : (
                completedRelationships.map((rel) => (
                  <div key={rel.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(rel.mentorship_type)}
                          <span className="font-medium">
                            {rel.mentor_name} → {rel.mentee_name}
                          </span>
                          <Badge className={getStatusColor(rel.status)}>
                            {rel.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">타입:</span> {rel.mentorship_type}
                          </div>
                          <div>
                            <span className="font-medium">기간:</span> {rel.start_date} ~ {rel.end_date}
                          </div>
                          <div>
                            <span className="font-medium">총 기간:</span> {rel.days_active}일
                          </div>
                          <div>
                            <span className="font-medium">최종 성공률:</span> {rel.pairing_success_rate || 0}%
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          이력보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Metrics Chart */}
      <MentorshipMetricsChart relationships={relationships} />

      {/* Pairing Dialog */}
      {showPairingDialog && (
        <MentorshipPairingDialog
          open={showPairingDialog}
          onClose={() => setShowPairingDialog(false)}
          onSuccess={() => {
            setShowPairingDialog(false)
            fetchMentorshipData()
          }}
        />
      )}
    </div>
  )
}
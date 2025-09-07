import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Plus, 
  Users,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react'
import Link from 'next/link'

export default async function SchedulePage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // 최근 스케줄 조회
  const { data: recentSchedules } = await supabase
    .from('schedules')
    .select(`
      *,
      employees:created_by(name),
      schedule_assignments(count)
    `)
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(5)

  // 현재 활성 스케줄 조회
  const today = new Date().toISOString().split('T')[0]
  const { data: activeSchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .lte('start_date', today)
    .gte('end_date', today)
    .eq('status', 'confirmed')

  // 팀별 현재 근무자 조회
  const { data: currentShifts } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      employees(name, team_id),
      shift_templates(name, type, start_time, end_time)
    `)
    .eq('date', today)
    .eq('tenant_id', user.tenantId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'generating':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '확정됨'
      case 'draft':
        return '초안'
      case 'generating':
        return '생성중'
      case 'failed':
        return '실패'
      default:
        return status
    }
  }

  const isManager = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">스케줄 관리</h1>
          <p className="text-gray-600 mt-2">
            근무표를 생성하고 관리합니다.
          </p>
        </div>
        {isManager && (
          <div className="space-x-2">
            <Button asChild>
              <Link href="/dashboard/schedule/generate">
                <Plus className="h-4 w-4 mr-2" />
                새 스케줄 생성
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 스케줄</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeSchedules?.length || 0}개
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">오늘 근무자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentShifts?.length || 0}명
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 스케줄</p>
                <p className="text-2xl font-bold text-gray-900">
                  {recentSchedules?.length || 0}개
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 오늘의 근무현황 */}
      <Card>
        <CardHeader>
          <CardTitle>오늘의 근무현황</CardTitle>
        </CardHeader>
        <CardContent>
          {currentShifts && currentShifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['day', 'evening', 'night'].map(shiftType => {
                const shiftsOfType = currentShifts.filter(
                  shift => shift.shift_templates?.type === shiftType
                )
                const shiftName = shiftType === 'day' ? '데이' : 
                                  shiftType === 'evening' ? '이브닝' : '나이트'
                
                return (
                  <div key={shiftType} className="border rounded-lg p-4">
                    <div className="font-medium mb-3 text-center">
                      {shiftName} 근무 ({shiftsOfType.length}명)
                    </div>
                    <div className="space-y-2">
                      {shiftsOfType.map(shift => (
                        <div 
                          key={shift.id}
                          className="text-sm p-2 bg-gray-50 rounded flex items-center justify-between"
                        >
                          <span>{shift.employees?.name}</span>
                          <span className="text-gray-500">
                            {shift.shift_templates?.start_time} - {shift.shift_templates?.end_time}
                          </span>
                        </div>
                      ))}
                      {shiftsOfType.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          근무자 없음
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>오늘 등록된 근무자가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 스케줄 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>최근 스케줄</CardTitle>
          {isManager && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/schedule/list">
                전체 보기
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentSchedules && recentSchedules.length > 0 ? (
            <div className="space-y-4">
              {recentSchedules.map(schedule => (
                <div 
                  key={schedule.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{schedule.name}</h3>
                        <Badge 
                          className={getStatusColor(schedule.status)}
                          variant="secondary"
                        >
                          {getStatusText(schedule.status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 space-x-4">
                        <span>
                          📅 {schedule.start_date} ~ {schedule.end_date}
                        </span>
                        <span>
                          👥 {schedule.schedule_assignments?.[0]?.count || 0}개 배정
                        </span>
                        <span>
                          👤 {schedule.employees?.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/schedule/${schedule.id}`}>
                          보기
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>등록된 스케줄이 없습니다.</p>
              {isManager && (
                <Button asChild className="mt-4">
                  <Link href="/dashboard/schedule/generate">
                    첫 번째 스케줄 생성하기
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
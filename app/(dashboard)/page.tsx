import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Shield,
  Coffee,
  Moon,
  Sun,
  Sunset,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await requireAuth()
  const supabase = createClient()

  // 오늘 날짜
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // 현재 사용자의 오늘 스케줄 조회
  const { data: todaySchedule } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      shift_templates(name, type, start_time, end_time, color),
      schedules(name, start_date, end_date)
    `)
    .eq('employee_id', user.employeeId)
    .eq('date', todayStr)
    .single()

  // 이번 주 스케줄 조회
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const { data: weekSchedule } = await supabase
    .from('schedule_assignments')
    .select(`
      *,
      shift_templates(name, type, start_time, end_time, color)
    `)
    .eq('employee_id', user.employeeId)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .order('date')

  // 대기 중인 휴가/교환 요청 조회 (권한별)
  const pendingRequests = { leaves: 0, swaps: 0 }
  
  if (user.role === 'admin' || user.role === 'manager') {
    // 관리자/매니저: 승인 대기 중인 요청들
    const { data: pendingLeaves } = await supabase
      .from('leaves')
      .select('id')
      .eq('status', 'pending')
      .eq('tenant_id', user.tenantId)

    const { data: pendingSwaps } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('status', 'pending')
      .eq('tenant_id', user.tenantId)

    pendingRequests.leaves = pendingLeaves?.length || 0
    pendingRequests.swaps = pendingSwaps?.length || 0
  } else {
    // 일반 직원: 자신의 요청들
    const { data: myLeaves } = await supabase
      .from('leaves')
      .select('id')
      .eq('employee_id', user.employeeId)
      .eq('status', 'pending')

    const { data: mySwaps } = await supabase
      .from('swap_requests')
      .select('id')
      .or(`requester_id.eq.${user.employeeId},target_id.eq.${user.employeeId}`)
      .eq('status', 'pending')

    pendingRequests.leaves = myLeaves?.length || 0
    pendingRequests.swaps = mySwaps?.length || 0
  }

  // 팀 통계 (관리자/매니저용)
  let teamStats = null
  if (user.role === 'admin' || user.role === 'manager') {
    const { data: teamData } = await supabase
      .from('schedule_assignments')
      .select(`
        *,
        shift_templates(type),
        employees(name)
      `)
      .eq('date', todayStr)
      .eq('tenant_id', user.tenantId)

    if (teamData) {
      const dayShifts = teamData.filter(s => s.shift_templates?.type === 'day').length
      const eveningShifts = teamData.filter(s => s.shift_templates?.type === 'evening').length
      const nightShifts = teamData.filter(s => s.shift_templates?.type === 'night').length
      const offShifts = teamData.filter(s => s.shift_templates?.type === 'off').length

      teamStats = {
        total: teamData.length,
        day: dayShifts,
        evening: eveningShifts,
        night: nightShifts,
        off: offShifts
      }
    }
  }

  function getShiftIcon(shiftType: string) {
    switch (shiftType) {
      case 'day':
        return <Sun className="h-4 w-4 text-yellow-600" />
      case 'evening':
        return <Sunset className="h-4 w-4 text-orange-600" />
      case 'night':
        return <Moon className="h-4 w-4 text-blue-600" />
      default:
        return <Coffee className="h-4 w-4 text-gray-600" />
    }
  }

  function getShiftName(shiftType: string) {
    switch (shiftType) {
      case 'day':
        return '데이'
      case 'evening':
        return '이브닝'
      case 'night':
        return '나이트'
      default:
        return '오프'
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          안녕하세요, {user.name}님! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          오늘은 {today.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}입니다.
        </p>
      </div>

      {/* 오늘의 스케줄 */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            오늘의 스케줄
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getShiftIcon(todaySchedule.shift_templates?.type)}
                <div>
                  <div className="text-xl font-bold">
                    {getShiftName(todaySchedule.shift_templates?.type)} 근무
                  </div>
                  <div className="text-blue-100">
                    {todaySchedule.shift_templates?.start_time} - {todaySchedule.shift_templates?.end_time}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {todaySchedule.schedules?.name}
              </Badge>
            </div>
          ) : (
            <div className="text-center py-4">
              <Coffee className="h-8 w-8 mx-auto mb-2 text-blue-100" />
              <div className="text-xl font-semibold">오늘은 휴무입니다</div>
              <div className="text-blue-100">편안한 하루 보내세요!</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 이번 주 근무일 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">이번 주 근무</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weekSchedule?.filter(s => s.shift_templates?.type !== 'off').length || 0}일
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* 대기 중인 휴가 요청 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {user.role === 'admin' || user.role === 'manager' ? '승인 대기' : '신청 중'} 휴가
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingRequests.leaves}건
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* 교환 요청 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">교환 요청</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingRequests.swaps}건
                </p>
              </div>
              <ArrowRight className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* 알림 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">새 알림</p>
                <p className="text-2xl font-bold text-gray-900">0건</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 콘텐츠 탭 */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">이번 주 스케줄</TabsTrigger>
          <TabsTrigger value="requests">대기 요청</TabsTrigger>
          {(user.role === 'admin' || user.role === 'manager') && (
            <TabsTrigger value="team">팀 현황</TabsTrigger>
          )}
        </TabsList>

        {/* 이번 주 스케줄 */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>이번 주 스케줄</CardTitle>
            </CardHeader>
            <CardContent>
              {weekSchedule && weekSchedule.length > 0 ? (
                <div className="space-y-3">
                  {weekSchedule.map((schedule) => {
                    const date = new Date(schedule.date)
                    const isToday = schedule.date === todayStr
                    
                    return (
                      <div
                        key={schedule.date}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[60px]">
                            <div className="text-sm text-gray-500">
                              {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                            </div>
                            <div className="font-semibold">
                              {date.getDate()}
                            </div>
                          </div>
                          {getShiftIcon(schedule.shift_templates?.type)}
                          <div>
                            <div className="font-medium">
                              {getShiftName(schedule.shift_templates?.type)} 근무
                            </div>
                            <div className="text-sm text-gray-500">
                              {schedule.shift_templates?.start_time} - {schedule.shift_templates?.end_time}
                            </div>
                          </div>
                        </div>
                        {isToday && (
                          <Badge variant="default">오늘</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  이번 주 스케줄이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 대기 요청 */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>휴가 요청</CardTitle>
                <Button asChild size="sm">
                  <Link href="/dashboard/leaves">
                    전체 보기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">
                    {user.role === 'admin' || user.role === 'manager' 
                      ? '승인 대기 중인 휴가 요청이' 
                      : '신청 중인 휴가가'} {pendingRequests.leaves}건 있습니다
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>교환 요청</CardTitle>
                <Button asChild size="sm">
                  <Link href="/dashboard/swaps">
                    전체 보기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <ArrowRight className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">
                    처리 대기 중인 교환 요청이 {pendingRequests.swaps}건 있습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 팀 현황 (관리자/매니저용) */}
        {(user.role === 'admin' || user.role === 'manager') && (
          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>오늘 팀 근무 현황</CardTitle>
              </CardHeader>
              <CardContent>
                {teamStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Sun className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                      <div className="text-2xl font-bold">{teamStats.day}</div>
                      <div className="text-sm text-gray-600">데이 근무</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <Sunset className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                      <div className="text-2xl font-bold">{teamStats.evening}</div>
                      <div className="text-sm text-gray-600">이브닝 근무</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Moon className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                      <div className="text-2xl font-bold">{teamStats.night}</div>
                      <div className="text-sm text-gray-600">나이트 근무</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Coffee className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                      <div className="text-2xl font-bold">{teamStats.off}</div>
                      <div className="text-sm text-gray-600">휴무</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    오늘 팀 스케줄이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
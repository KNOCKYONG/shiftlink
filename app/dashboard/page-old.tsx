'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck, Moon, AlertTriangle, Loader2 } from 'lucide-react'
import { KPIWidget } from '@/components/dashboard/kpi-widget'
import { ScheduleView } from '@/components/schedule/schedule-view'
import { NotificationPanel } from '@/components/dashboard/notification-panel'
import { SwapRequestPanel } from '@/components/dashboard/swap-request-panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRealtimeNotifications, useRealtimeSwapRequests } from '@/lib/supabase/realtime'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  kpi: {
    todayWorking: {
      count: number
      total: number
      percentage: number
      breakdown: {
        day: number
        evening: number
        night: number
        off: number
      }
    }
    pendingLeaves: {
      count: number
      urgent: number
    }
    consecutiveNightWorkers: {
      count: number
      workers: Array<{ name: string; consecutiveDays: number }>
      maxConsecutive: number
    }
    overtimeWarnings: {
      count: number
      critical: number
    }
  }
  swapRequests: {
    pending: any[]
    total: number
  }
  notifications: {
    unread: any[]
    count: number
  }
  todaySchedule: Array<{
    id: string
    employeeName: string
    employeeCode: string
    shiftType: string
    status: string
    startTime: string
    endTime: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClient()

  // Realtime hooks
  const realtimeNotifications = useRealtimeNotifications(currentUser?.id)
  const realtimeSwapRequests = useRealtimeSwapRequests(currentUser?.tenant_id)

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchDashboardStats()
    }
  }, [currentUser])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!employee) {
        throw new Error('Employee record not found')
      }

      setCurrentUser({ ...user, ...employee })
    } catch (err) {
      console.error('Get current user error:', err)
      setError('사용자 정보를 불러올 수 없습니다.')
    }
  }

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/dashboard/stats?date=${today}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Dashboard stats error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>대시보드 데이터를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">대시보드</h2>
          <p className="text-muted-foreground">
            ShiftLink 스케줄링 시스템 현황을 확인하세요.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || '대시보드 데이터를 불러올 수 없습니다.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">대시보드</h2>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          안녕하세요, {currentUser?.name || '사용자'}님! 오늘의 근무 현황을 확인하세요.
        </p>
      </div>

      {/* KPI 위젯들 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIWidget
          title="오늘 근무 인원"
          value={stats.kpi.todayWorking.count}
          subtitle={`총 ${stats.kpi.todayWorking.total}명 중 (${stats.kpi.todayWorking.percentage}%)`}
          icon={UserCheck}
          progress={{
            current: stats.kpi.todayWorking.count,
            total: stats.kpi.todayWorking.total,
            label: '근무율'
          }}
          breakdown={[
            { label: '주간', value: stats.kpi.todayWorking.breakdown.day, color: '#3b82f6' },
            { label: '오후', value: stats.kpi.todayWorking.breakdown.evening, color: '#f59e0b' },
            { label: '야간', value: stats.kpi.todayWorking.breakdown.night, color: '#6366f1' },
            { label: '휴무', value: stats.kpi.todayWorking.breakdown.off, color: '#6b7280' }
          ]}
          iconColor="text-green-600"
        />
        
        <KPIWidget
          title="휴가/결근 요청"
          value={stats.kpi.pendingLeaves.count}
          subtitle={`긴급 승인 필요: ${stats.kpi.pendingLeaves.urgent}건`}
          icon={Users}
          status={stats.kpi.pendingLeaves.urgent > 0 ? 'warning' : 'normal'}
          iconColor="text-blue-600"
        />
        
        <KPIWidget
          title="연속 야간 근무자"
          value={stats.kpi.consecutiveNightWorkers.count}
          subtitle={stats.kpi.consecutiveNightWorkers.maxConsecutive > 0 ? 
                   `최대 ${stats.kpi.consecutiveNightWorkers.maxConsecutive}일 연속` : 
                   '연속 근무자 없음'}
          icon={Moon}
          status={stats.kpi.consecutiveNightWorkers.maxConsecutive >= 5 ? 'critical' : 
                  stats.kpi.consecutiveNightWorkers.maxConsecutive >= 3 ? 'warning' : 'normal'}
          iconColor="text-purple-600"
        />
        
        <KPIWidget
          title="초과근무 경고"
          value={stats.kpi.overtimeWarnings.count}
          subtitle={stats.kpi.overtimeWarnings.critical > 0 ? 
                   `위험 수준: ${stats.kpi.overtimeWarnings.critical}명` : 
                   '경고 없음'}
          icon={AlertTriangle}
          status={stats.kpi.overtimeWarnings.critical > 0 ? 'critical' : 
                  stats.kpi.overtimeWarnings.count > 0 ? 'warning' : 'normal'}
          iconColor="text-orange-600"
        />
      </div>

      {/* 스케줄 뷰 */}
      <ScheduleView 
        scheduleData={stats.todaySchedule}
        onDateChange={fetchDashboardStats}
      />

      {/* 알림 및 교환 요청 패널 */}
      <div className="grid gap-4 lg:grid-cols-2 px-1 md:px-0">
        <NotificationPanel
          notifications={[...stats.notifications.unread, ...realtimeNotifications]}
          onMarkAsRead={fetchDashboardStats}
        />
        <SwapRequestPanel
          requests={[...stats.swapRequests.pending, ...realtimeSwapRequests]}
          currentUserId={currentUser?.id}
          onRequestUpdate={fetchDashboardStats}
        />
      </div>
    </div>
  )
}
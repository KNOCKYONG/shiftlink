'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3, 
  Activity, 
  Users, 
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkTimeSummary } from './work-time-summary'
import { FatigueMonitor } from './fatigue-monitor'
import { TeamBalanceReport } from './team-balance-report'

interface MonitoringDashboardProps {
  className?: string
  employeeId?: string
  teamId?: string
  isManager?: boolean
}

export function MonitoringDashboard({ 
  className, 
  employeeId, 
  teamId,
  isManager = false 
}: MonitoringDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [selectedView, setSelectedView] = useState<'personal' | 'team'>('personal')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Exporting monitoring report...')
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">모니터링 대시보드</h2>
          <p className="text-muted-foreground">
            근무 시간, 피로도, 팀 균형을 실시간으로 모니터링합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">일간</SelectItem>
              <SelectItem value="weekly">주간</SelectItem>
              <SelectItem value="monthly">월간</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            리포트 내보내기
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="주간 근무시간"
          value="42.5"
          unit="시간"
          change="+2.5"
          trend="up"
          icon={Clock}
          color="blue"
        />
        <KPICard
          title="피로도 지수"
          value="6.5"
          unit="/10"
          change="+0.8"
          trend="up"
          icon={Activity}
          color="orange"
          warning
        />
        <KPICard
          title="팀 균형 점수"
          value="75"
          unit="/100"
          change="-5"
          trend="down"
          icon={Users}
          color="green"
        />
        <KPICard
          title="연속 야간"
          value="3"
          unit="일"
          change="+1"
          trend="up"
          icon={AlertTriangle}
          color="purple"
          warning
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="worktime">근무시간</TabsTrigger>
          <TabsTrigger value="fatigue">피로도</TabsTrigger>
          {isManager && <TabsTrigger value="team">팀 균형</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WorkTimeSummary 
              key={`work-${refreshKey}`}
              employeeId={employeeId}
              period={selectedPeriod}
            />
            <FatigueMonitor
              key={`fatigue-${refreshKey}`}
              employeeId={employeeId}
              showRecommendations={false}
            />
          </div>

          {/* Alerts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                활성 알림
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>연속 야간 근무 3일째 - 피로 누적 주의</span>
                      <Badge variant="outline" className="ml-2">높음</Badge>
                    </div>
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>이번 주 근무시간 42.5시간 - 52시간 한도 임박</span>
                      <Badge variant="outline" className="ml-2">중간</Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worktime" className="space-y-4">
          <WorkTimeSummary 
            key={`work-detail-${refreshKey}`}
            employeeId={employeeId}
            period={selectedPeriod}
            className="w-full"
          />
          
          {/* Work Time Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                근무시간 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                차트 컴포넌트 (Recharts 등으로 구현 예정)
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fatigue" className="space-y-4">
          <FatigueMonitor
            key={`fatigue-detail-${refreshKey}`}
            employeeId={employeeId}
            showRecommendations={true}
            className="w-full"
          />
          
          {/* Fatigue History Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                피로도 변화 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                피로도 추이 차트 (구현 예정)
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-4">
            <TeamBalanceReport
              key={`team-${refreshKey}`}
              teamId={teamId || ''}
              className="w-full"
            />
            
            {/* Team Performance Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  팀 성과 매트릭스
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">95%</div>
                    <div className="text-sm text-muted-foreground">출근율</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">교환 요청</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">3.2</div>
                    <div className="text-sm text-muted-foreground">평균 피로도</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">98%</div>
                    <div className="text-sm text-muted-foreground">규정 준수율</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  title: string
  value: string
  unit: string
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red'
  warning?: boolean
}

function KPICard({ 
  title, 
  value, 
  unit, 
  change, 
  trend, 
  icon: Icon, 
  color,
  warning 
}: KPICardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
    red: 'text-red-600 bg-red-50'
  }

  const trendColors = {
    up: trend === 'up' && warning ? 'text-red-600' : 'text-green-600',
    down: trend === 'down' && !warning ? 'text-green-600' : 'text-red-600',
    stable: 'text-gray-600'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            <div className={cn("text-sm font-medium", trendColors[trend])}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {change} from last period
            </div>
          </div>
          <div className={cn("p-3 rounded-lg", colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
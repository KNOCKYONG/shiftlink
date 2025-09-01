'use client'

import { MonitoringDashboard } from '@/components/monitoring/monitoring-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, BarChart3, Activity, Users, Database, Clock } from 'lucide-react'

export default function MonitoringDemo() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">모니터링 & 리포트 시스템</h1>
        <p className="text-muted-foreground">
          Phase 8: 실시간 모니터링 및 분석 대시보드 구현 완료
        </p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            데이터베이스 스키마 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            API 엔드포인트 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            UI 컴포넌트 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            실시간 분석 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            알림 시스템 ✓
          </Badge>
        </div>
      </div>

      {/* Implementation Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              구현된 기능
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <strong>근무시간 집계</strong>
                  <p className="text-muted-foreground">일별/주별/월별 근무시간 자동 집계 및 초과근무 감지</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <strong>피로도 모니터링</strong>
                  <p className="text-muted-foreground">연속 야간근무, 누적 근무시간 기반 피로도 계산</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <strong>팀 균형 분석</strong>
                  <p className="text-muted-foreground">연차별 분포, 교대별 숙련도 균형 리포트</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>KPI 대시보드</strong>
                  <p className="text-muted-foreground">핵심 성과 지표 실시간 모니터링</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              기술적 구현
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• <strong>실시간 데이터 집계</strong>: PostgreSQL 트리거 & 함수</li>
              <li>• <strong>피로도 알고리즘</strong>: 다중 요인 가중치 계산</li>
              <li>• <strong>알림 시스템</strong>: 임계값 기반 자동 알림</li>
              <li>• <strong>권한 기반 접근</strong>: RLS 정책으로 데이터 보안</li>
              <li>• <strong>성능 최적화</strong>: 인덱싱 및 캐싱 전략</li>
              <li>• <strong>확장 가능 구조</strong>: 모듈화된 컴포넌트</li>
              <li>• <strong>반응형 UI</strong>: 모바일 친화적 디자인</li>
              <li>• <strong>타입 안정성</strong>: TypeScript 전체 적용</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alert Example */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          <strong>데모 모드:</strong> 실제 데이터베이스가 연결되지 않은 상태에서는 목업 데이터가 표시됩니다. 
          Supabase 연결 후 실시간 데이터가 반영됩니다.
        </AlertDescription>
      </Alert>

      {/* Main Dashboard Demo */}
      <Card>
        <CardHeader>
          <CardTitle>모니터링 대시보드</CardTitle>
        </CardHeader>
        <CardContent>
          <MonitoringDashboard 
            isManager={true}
            teamId="demo-team"
            employeeId="demo-employee"
          />
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>구현 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">데이터베이스 테이블</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <code className="bg-muted px-2 py-1 rounded">work_time_aggregations</code>
              <code className="bg-muted px-2 py-1 rounded">fatigue_metrics</code>
              <code className="bg-muted px-2 py-1 rounded">shift_statistics</code>
              <code className="bg-muted px-2 py-1 rounded">team_balance_reports</code>
              <code className="bg-muted px-2 py-1 rounded">performance_indicators</code>
              <code className="bg-muted px-2 py-1 rounded">monitoring_alerts</code>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">API 엔드포인트</h4>
            <ul className="space-y-1 text-sm font-mono">
              <li>GET /api/monitoring/work-time - 근무시간 조회</li>
              <li>GET /api/monitoring/fatigue - 피로도 조회</li>
              <li>GET /api/monitoring/team-balance - 팀 균형 조회</li>
              <li>POST /api/monitoring/alerts - 알림 생성</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">컴포넌트 구조</h4>
            <ul className="space-y-1 text-sm">
              <li>• <code>MonitoringDashboard</code> - 통합 대시보드</li>
              <li>• <code>WorkTimeSummary</code> - 근무시간 요약</li>
              <li>• <code>FatigueMonitor</code> - 피로도 모니터</li>
              <li>• <code>TeamBalanceReport</code> - 팀 균형 리포트</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">피로도 계산 알고리즘</h4>
            <div className="bg-muted p-3 rounded text-sm">
              <pre>{`fatigue_score = 
  (consecutive_nights × 1.5) +
  (consecutive_days > 5 ? (consecutive_days - 5) × 0.5 : 0) +
  (weekly_hours > 52 ? 2 : 0) +
  (night_shift_ratio × 3) +
  (overtime_ratio × 2)`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>다음 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• 실시간 차트 구현 (Recharts/Chart.js)</li>
            <li>• 이메일/SMS 알림 통합</li>
            <li>• PDF 리포트 생성 기능</li>
            <li>• 예측 분석 (ML 모델 통합)</li>
            <li>• 벤치마킹 기능</li>
            <li>• 커스텀 대시보드 설정</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { LeaveManagementSection } from '@/components/leave'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LeaveManagementDemo() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">휴가 관리 시스템</h1>
        <p className="text-muted-foreground">
          Phase 7: 휴가/결근 관리 시스템 구현 완료 데모
        </p>
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            API ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            UI Components ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Database Schema ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Integration ✓
          </Badge>
        </div>
      </div>

      {/* Demo Status */}
      <Card>
        <CardHeader>
          <CardTitle>구현된 기능</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">✅ 완료된 구성요소</h3>
              <ul className="space-y-1 text-sm">
                <li>• 데이터베이스 스키마 (휴가 정책, 잔액, 요청)</li>
                <li>• API 엔드포인트 (신청, 조회, 승인/거부)</li>
                <li>• 휴가 신청 폼 컴포넌트</li>
                <li>• 휴가 잔액 위젯</li>
                <li>• 관리자 승인 인터페이스</li>
                <li>• 휴가 이력 조회</li>
                <li>• 통합 관리 섹션</li>
                <li>• 자동 승인 로직 (정책 기반)</li>
                <li>• 알림 시스템</li>
                <li>• 감사 로그</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">🔧 기술적 특징</h3>
              <ul className="space-y-1 text-sm">
                <li>• Row Level Security (RLS) 보안</li>
                <li>• TypeScript 타입 안정성</li>
                <li>• 반응형 UI 디자인</li>
                <li>• 실시간 데이터 동기화</li>
                <li>• CSV 내보내기 기능</li>
                <li>• 고급 필터링 및 검색</li>
                <li>• 페이지네이션</li>
                <li>• 에러 처리 및 로딩 상태</li>
                <li>• 접근성 준수 (WCAG)</li>
                <li>• 모바일 친화적</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Demo */}
      <LeaveManagementSection 
        isManager={true}
        className="w-full"
      />

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>구현 노트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">API 엔드포인트</h4>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• <code>GET /api/leaves</code> - 휴가 신청 목록 조회</li>
              <li>• <code>POST /api/leaves</code> - 새 휴가 신청</li>
              <li>• <code>GET /api/leaves/balance</code> - 휴가 잔액 조회</li>
              <li>• <code>GET /api/leaves/[id]</code> - 특정 휴가 신청 조회</li>
              <li>• <code>PATCH /api/leaves/[id]</code> - 휴가 승인/거부/취소</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium">데이터베이스 테이블</h4>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• <code>leave_policies</code> - 휴가 정책 설정</li>
              <li>• <code>leave_balances</code> - 직원별 휴가 잔액</li>
              <li>• <code>leaves</code> - 휴가 신청 내역</li>
              <li>• <code>notifications</code> - 알림 발송</li>
              <li>• <code>audit_logs</code> - 감사 로그</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium">다음 단계</h4>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• 메인 대시보드에 휴가 관리 섹션 통합</li>
              <li>• 이메일/카카오톡 알림 발송 구현</li>
              <li>• 캘린더 연동 (iCal, Google Calendar)</li>
              <li>• 휴가 정책 설정 UI</li>
              <li>• 대량 승인 처리</li>
              <li>• 휴가 통계 및 리포트</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
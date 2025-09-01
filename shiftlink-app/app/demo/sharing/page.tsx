'use client'

import { useState } from 'react'
import { ScheduleShareDialog } from '@/components/sharing/schedule-share-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Share2, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Download,
  FileText,
  Table,
  CalendarDays,
  CheckCircle,
  Users,
  Globe,
  Smartphone,
  Cloud
} from 'lucide-react'

export default function SharingDemo() {
  const [selectedMonth] = useState(new Date())
  
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Demo Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">공유 기능</h1>
        <p className="text-muted-foreground">
          Phase 9: 근무표 공유 및 내보내기 기능 구현 완료
        </p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            이메일 발송 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            PDF 생성 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            CSV 내보내기 ✓
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            캘린더 연동 ✓
          </Badge>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
            카카오톡 (준비중)
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
                <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <strong>이메일 발송</strong>
                  <p className="text-muted-foreground">다중 수신자, 첨부파일 포함, HTML 템플릿</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <strong>PDF 생성</strong>
                  <p className="text-muted-foreground">월간 근무표, 색상 코딩, 범례 포함</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Table className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <strong>CSV 내보내기</strong>
                  <p className="text-muted-foreground">엑셀 호환, UTF-8 BOM, 요약 정보</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <strong>캘린더 연동</strong>
                  <p className="text-muted-foreground">iCal 구독, Google/Outlook 연동</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              지원 플랫폼
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• <strong>이메일 서비스</strong>: Resend API</li>
              <li>• <strong>PDF 라이브러리</strong>: jsPDF + autoTable</li>
              <li>• <strong>CSV 생성</strong>: Native TypeScript</li>
              <li>• <strong>캘린더 포맷</strong>: ICS (RFC 5545)</li>
              <li>• <strong>Google Calendar</strong>: 직접 연동 링크</li>
              <li>• <strong>Outlook</strong>: 웹 연동 지원</li>
              <li>• <strong>Apple Calendar</strong>: ICS 구독</li>
              <li>• <strong>카카오톡</strong>: BizMessage API (예정)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      <Alert>
        <Share2 className="h-4 w-4" />
        <AlertDescription>
          <strong>데모 모드:</strong> 실제 이메일 발송 및 API 연동은 환경 변수 설정이 필요합니다.
          UI 및 파일 생성 로직은 완전히 구현되었습니다.
        </AlertDescription>
      </Alert>

      {/* Main Demo */}
      <Card>
        <CardHeader>
          <CardTitle>공유 대화상자 데모</CardTitle>
          <CardDescription>
            근무표를 다양한 방법으로 공유하고 내보낼 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <ScheduleShareDialog
              scheduleId="demo-schedule-id"
              teamName="개발팀"
              month={selectedMonth}
              trigger={
                <Button>
                  <Share2 className="h-4 w-4 mr-2" />
                  근무표 공유
                </Button>
              }
            />
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              빠른 다운로드
            </Button>
            
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              팀 전체 발송
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Mail className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-medium">이메일</div>
              <div className="text-xs text-muted-foreground">다중 발송</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-sm font-medium">PDF</div>
              <div className="text-xs text-muted-foreground">인쇄용</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Table className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-medium">CSV</div>
              <div className="text-xs text-muted-foreground">엑셀용</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-sm font-medium">캘린더</div>
              <div className="text-xs text-muted-foreground">실시간 동기화</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>기술 구현 상세</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">파일 생성 라이브러리</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <code className="bg-muted px-2 py-1 rounded">jspdf</code>
              <code className="bg-muted px-2 py-1 rounded">jspdf-autotable</code>
              <code className="bg-muted px-2 py-1 rounded">ics</code>
              <code className="bg-muted px-2 py-1 rounded">resend</code>
              <code className="bg-muted px-2 py-1 rounded">date-fns</code>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">API 엔드포인트</h4>
            <ul className="space-y-1 text-sm font-mono">
              <li>POST /api/share/email - 이메일 발송</li>
              <li>GET /api/ical/[token] - 캘린더 구독 피드</li>
              <li>GET /api/schedules/[id]/export/pdf - PDF 다운로드</li>
              <li>GET /api/schedules/[id]/export/csv - CSV 다운로드</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">컴포넌트 구조</h4>
            <ul className="space-y-1 text-sm">
              <li>• <code>ScheduleShareDialog</code> - 통합 공유 대화상자</li>
              <li>• <code>SchedulePDFGenerator</code> - PDF 생성 클래스</li>
              <li>• <code>ScheduleCSVExporter</code> - CSV 내보내기 클래스</li>
              <li>• <code>ScheduleCalendarGenerator</code> - ICS 생성 클래스</li>
              <li>• <code>ScheduleMailer</code> - 이메일 발송 서비스</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">보안 및 권한</h4>
            <ul className="space-y-1 text-sm">
              <li>• 관리자/매니저만 전체 팀 근무표 공유 가능</li>
              <li>• 개인은 본인 근무표만 공유 가능</li>
              <li>• 캘린더 구독 토큰으로 인증</li>
              <li>• 감사 로그 자동 기록</li>
            </ul>
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
            <li>• 카카오톡 알림톡 API 연동</li>
            <li>• 네이버 캘린더 직접 연동</li>
            <li>• 일정 리마인더 기능</li>
            <li>• 공유 히스토리 관리</li>
            <li>• 공유 템플릿 커스터마이징</li>
            <li>• 대량 발송 스케줄링</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
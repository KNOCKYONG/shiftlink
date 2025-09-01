'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Plus, Clock, Users, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeaveBalanceWidget } from './leave-balance-widget'
import { LeaveRequestForm } from './leave-request-form'
import type { LeaveFormData } from './leave-request-form'

interface LeaveManagementSectionProps {
  className?: string
  isManager?: boolean
}

export function LeaveManagementSection({ className, isManager = false }: LeaveManagementSectionProps) {
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleLeaveRequestSubmit = async (formData: LeaveFormData) => {
    try {
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit leave request')
      }

      // 성공 시 다이얼로그 닫기 및 데이터 새로고침
      setIsRequestDialogOpen(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      // 에러는 LeaveRequestForm에서 처리됨
      throw error
    }
  }

  const handleRequestLeave = () => {
    setIsRequestDialogOpen(true)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 휴가 관리 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">휴가 관리</h2>
          <p className="text-muted-foreground">
            휴가 신청, 잔여 현황 및 승인 관리
          </p>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleRequestLeave}>
              <Plus className="h-4 w-4 mr-2" />
              휴가 신청
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>휴가 신청</DialogTitle>
            </DialogHeader>
            <LeaveRequestForm 
              onSubmit={handleLeaveRequestSubmit}
              onCancel={() => setIsRequestDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 휴가 잔여 현황 위젯 */}
        <div className="lg:col-span-1">
          <LeaveBalanceWidget 
            key={refreshKey}
            onRequestLeave={handleRequestLeave} 
            className="w-full"
          />
        </div>

        {/* 우측: 휴가 관리 탭 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                휴가 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">개요</TabsTrigger>
                  <TabsTrigger value="requests">신청 내역</TabsTrigger>
                  {isManager && (
                    <TabsTrigger value="approvals">승인 관리</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <LeaveOverviewTab key={refreshKey} />
                </TabsContent>

                <TabsContent value="requests" className="space-y-4">
                  <LeaveRequestsTab key={refreshKey} />
                </TabsContent>

                {isManager && (
                  <TabsContent value="approvals" className="space-y-4">
                    <LeaveApprovalsTab key={refreshKey} />
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// 개요 탭 컴포넌트
function LeaveOverviewTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-2xl font-bold text-blue-600">15일</div>
            <p className="text-sm text-muted-foreground">연차 잔여</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-2xl font-bold text-green-600">3건</div>
            <p className="text-sm text-muted-foreground">승인 완료</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-2xl font-bold text-yellow-600">1건</div>
            <p className="text-sm text-muted-foreground">승인 대기</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-2xl font-bold text-purple-600">12일</div>
            <p className="text-sm text-muted-foreground">올해 사용</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">이번 달 휴가 일정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <div className="font-medium">연차</div>
                <div className="text-sm text-muted-foreground">2024-12-23 ~ 2024-12-24</div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">승인됨</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <div className="font-medium">개인사유</div>
                <div className="text-sm text-muted-foreground">2024-12-30</div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">승인대기</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 신청 내역 탭 컴포넌트
function LeaveRequestsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">나의 신청 내역</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            대기 중 (1)
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* 신청 내역 목록 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">연차</Badge>
                  <span className="text-sm text-muted-foreground">2024-12-23 신청</span>
                </div>
                <div className="font-medium">2024-12-23 ~ 2024-12-24 (2일)</div>
                <div className="text-sm text-muted-foreground">연말 휴가</div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">승인됨</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">개인사유</Badge>
                  <span className="text-sm text-muted-foreground">2024-12-20 신청</span>
                </div>
                <div className="font-medium">2024-12-30 (1일)</div>
                <div className="text-sm text-muted-foreground">개인 용무</div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">승인대기</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 승인 관리 탭 컴포넌트 (관리자 전용)
function LeaveApprovalsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">승인 대기 중인 요청</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            긴급 (0)
          </Button>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            전체 (3)
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* 승인 대기 목록 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">연차</Badge>
                  <span className="font-medium">김직원</span>
                  <span className="text-sm text-muted-foreground">개발팀</span>
                </div>
                <div className="font-medium">2024-12-25 ~ 2024-12-27 (3일)</div>
                <div className="text-sm text-muted-foreground">가족 여행</div>
                <div className="text-xs text-muted-foreground">신청일: 2024-12-20</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-red-600">
                  거부
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  승인
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-700">병가</Badge>
                  <span className="font-medium">박사원</span>
                  <span className="text-sm text-muted-foreground">운영팀</span>
                </div>
                <div className="font-medium">2024-12-22 (1일)</div>
                <div className="text-sm text-muted-foreground">감기 치료</div>
                <div className="text-xs text-muted-foreground">신청일: 2024-12-21</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-red-600">
                  거부
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  승인
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
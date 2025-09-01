import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User
} from 'lucide-react'
import Link from 'next/link'

export default async function SwapsPage() {
  const user = await requireAuth()
  const supabase = createClient()

  // 사용자와 관련된 교환 요청 조회
  const { data: swapRequests } = await supabase
    .from('swap_requests')
    .select(`
      *,
      requester:requester_id(id, name, employee_code),
      target:target_id(id, name, employee_code),
      requester_assignment:requester_assignment_id(
        date,
        shift_templates(name, type, start_time, end_time)
      ),
      target_assignment:target_assignment_id(
        date,
        shift_templates(name, type, start_time, end_time)
      )
    `)
    .or(`requester_id.eq.${user.employeeId},target_id.eq.${user.employeeId}`)
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  // 상태별 분류
  const pendingRequests = swapRequests?.filter(req => req.status === 'pending') || []
  const acceptedRequests = swapRequests?.filter(req => req.status === 'accepted') || []
  const approvedRequests = swapRequests?.filter(req => req.status === 'approved') || []
  const rejectedRequests = swapRequests?.filter(req => req.status === 'rejected') || []

  // 내가 받은 요청 중 대기중인 것
  const incomingPending = pendingRequests.filter(req => req.target_id === user.employeeId)
  // 내가 보낸 요청 중 대기중인 것  
  const outgoingPending = pendingRequests.filter(req => req.requester_id === user.employeeId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-blue-100 text-blue-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'accepted':
        return '수락됨'
      case 'approved':
        return '승인됨'
      case 'rejected':
        return '거부됨'
      case 'cancelled':
        return '취소됨'
      default:
        return status
    }
  }

  const getShiftName = (shiftType?: string) => {
    switch (shiftType) {
      case 'day': return '데이'
      case 'evening': return '이브닝'
      case 'night': return '나이트'
      case 'off': return '오프'
      default: return '알 수 없음'
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">근무 교환</h1>
        <p className="text-gray-600 mt-2">
          동료와 근무를 교환하고 요청을 관리합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">받은 요청</p>
                <p className="text-2xl font-bold text-orange-600">
                  {incomingPending.length}
                </p>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">보낸 요청</p>
                <p className="text-2xl font-bold text-blue-600">
                  {outgoingPending.length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">승인 대기</p>
                <p className="text-2xl font-bold text-purple-600">
                  {acceptedRequests.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">완료됨</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedRequests.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 받은 요청 (액션 필요) */}
      {incomingPending.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <ArrowLeftRight className="h-5 w-5" />
              받은 교환 요청 (응답 필요)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomingPending.map(request => (
                <div 
                  key={request.id}
                  className="border rounded-lg p-4 bg-orange-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{request.requester?.name}님의 요청</span>
                        <Badge className={getStatusColor(request.status)} variant="secondary">
                          {getStatusText(request.status)}
                        </Badge>
                        {request.is_emergency && (
                          <Badge variant="destructive" className="text-xs">
                            응급
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">요청자 근무</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>{request.requester_assignment?.date}</span>
                            <span>
                              {getShiftName(request.requester_assignment?.shift_templates?.type)}
                            </span>
                            <span className="text-gray-500">
                              ({request.requester_assignment?.shift_templates?.start_time}-{request.requester_assignment?.shift_templates?.end_time})
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">내 근무</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>{request.target_assignment?.date}</span>
                            <span>
                              {getShiftName(request.target_assignment?.shift_templates?.type)}
                            </span>
                            <span className="text-gray-500">
                              ({request.target_assignment?.shift_templates?.start_time}-{request.target_assignment?.shift_templates?.end_time})
                            </span>
                          </div>
                        </div>
                      </div>

                      {request.reason && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">요청 사유</p>
                          <p className="text-sm bg-white p-2 rounded border">{request.reason}</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {new Date(request.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        수락
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거부
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 교환 요청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>교환 요청 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {swapRequests && swapRequests.length > 0 ? (
            <div className="space-y-4">
              {swapRequests.map(request => {
                const isMyRequest = request.requester_id === user.employeeId
                
                return (
                  <div 
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {isMyRequest ? (
                              <span className="text-sm text-blue-600 font-medium">내가 요청함</span>
                            ) : (
                              <span className="text-sm text-orange-600 font-medium">요청 받음</span>
                            )}
                            <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {isMyRequest ? request.target?.name : request.requester?.name}님
                            </span>
                          </div>
                          <Badge className={getStatusColor(request.status)} variant="secondary">
                            {getStatusText(request.status)}
                          </Badge>
                          {request.is_emergency && (
                            <Badge variant="destructive" className="text-xs">
                              응급
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                          <div className="text-sm">
                            <span className="text-gray-600">
                              {isMyRequest ? '내 근무' : '상대방 근무'}: 
                            </span>
                            <span className="ml-2">
                              {request.requester_assignment?.date} {getShiftName(request.requester_assignment?.shift_templates?.type)}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <span className="text-gray-600">
                              {isMyRequest ? '상대방 근무' : '내 근무'}: 
                            </span>
                            <span className="ml-2">
                              {request.target_assignment?.date} {getShiftName(request.target_assignment?.shift_templates?.type)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>

                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/swaps/${request.id}`}>
                          상세보기
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>아직 교환 요청이 없습니다.</p>
              <p className="text-sm mt-2">스케줄에서 근무를 선택하고 교환을 요청해보세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
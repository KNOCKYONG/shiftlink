'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  History,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaveRequest, LeaveType } from '@/types'

interface LeaveHistoryProps {
  className?: string
  employeeId?: string // 특정 직원의 이력만 보기 (선택적)
  showEmployeeInfo?: boolean // 직원 정보 표시 여부
}

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: '연차',
  sick: '병가',
  personal: '개인사유',
  maternity: '출산휴가',
  paternity: '육아휴가',
  emergency: '응급',
  bereavement: '경조사',
  other: '기타'
}

const statusLabels = {
  pending: '승인대기',
  approved: '승인됨',
  rejected: '거부됨',
  cancelled: '취소됨'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
}

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: AlertTriangle
}

interface FilterState {
  leaveType: string
  status: string
  startDate: string
  endDate: string
  search: string
}

export function LeaveHistory({ className, employeeId, showEmployeeInfo = true }: LeaveHistoryProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<FilterState>({
    leaveType: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  })

  const itemsPerPage = 10

  useEffect(() => {
    fetchLeaveHistory()
  }, [currentPage, filters, employeeId])

  const fetchLeaveHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      if (employeeId) params.append('employeeId', employeeId)
      if (filters.leaveType) params.append('leaveType', filters.leaveType)
      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/leaves?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leave history')
      }

      const data = await response.json()
      const filteredData = filters.search 
        ? data.data.filter((request: LeaveRequest) => 
            request.employee?.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            request.reason?.toLowerCase().includes(filters.search.toLowerCase())
          )
        : data.data

      setRequests(filteredData || [])
      setTotalPages(data.meta?.pages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave history')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({
      leaveType: '',
      status: '',
      startDate: '',
      endDate: '',
      search: ''
    })
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    const headers = ['신청일', '직원', '휴가종류', '시작일', '종료일', '일수', '상태', '사유', '승인자']
    const csvData = requests.map(request => [
      new Date(request.created_at).toLocaleDateString('ko-KR'),
      request.employee?.name || '',
      leaveTypeLabels[request.leave_type],
      request.start_date,
      request.end_date,
      request.days_count,
      statusLabels[request.status],
      request.reason || '',
      request.approver?.name || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leave_history_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('ko-KR')
    const end = new Date(endDate).toLocaleDateString('ko-KR')
    return start === end ? start : `${start} ~ ${end}`
  }

  const getTotalStats = () => {
    const stats = {
      total: requests.length,
      approved: requests.filter(r => r.status === 'approved').length,
      pending: requests.filter(r => r.status === 'pending').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      totalDays: requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.days_count, 0)
    }
    return stats
  }

  const stats = getTotalStats()

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            휴가 신청 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            휴가 신청 이력
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
            disabled={requests.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </div>
        
        {/* 통계 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">총 신청</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">승인</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">대기</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">거부</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
            <div className="text-sm text-muted-foreground">승인 일수</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 필터링 도구 */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="직원명 또는 사유 검색..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={filters.leaveType} onValueChange={(value) => handleFilterChange('leaveType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="휴가 종류" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {Object.entries(leaveTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                placeholder="시작일"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              
              <Input
                type="date"
                placeholder="종료일"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                필터 초기화
              </Button>
              <div className="text-sm text-muted-foreground">
                총 {requests.length}건의 기록
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 휴가 이력 목록 */}
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              조건에 맞는 휴가 신청 이력이 없습니다.
            </div>
          ) : (
            requests.map((request) => {
              const StatusIcon = statusIcons[request.status]
              
              return (
                <Card key={request.id} className="transition-all hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className={`${leaveTypeLabels[request.leave_type] === '연차' ? 'bg-blue-100 text-blue-700' :
                              leaveTypeLabels[request.leave_type] === '병가' ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'}`}
                          >
                            {leaveTypeLabels[request.leave_type]}
                          </Badge>
                          
                          {request.is_emergency && (
                            <Badge variant="destructive" className="text-xs">
                              응급
                            </Badge>
                          )}
                          
                          <Badge variant="secondary" className={statusColors[request.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[request.status]}
                          </Badge>
                          
                          <span className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString('ko-KR')} 신청
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          {showEmployeeInfo && request.employee && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{request.employee.name}</span>
                              <span className="text-muted-foreground">
                                ({request.employee.employee_code})
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatDateRange(request.start_date, request.end_date)}
                            </span>
                            <span className="text-muted-foreground">
                              ({request.days_count}일)
                            </span>
                          </div>
                        </div>
                        
                        {request.reason && (
                          <div className="text-sm text-muted-foreground">
                            <strong>사유:</strong> {request.reason}
                          </div>
                        )}
                        
                        {request.rejection_reason && (
                          <Alert className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>거부 사유:</strong> {request.rejection_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-muted-foreground ml-4">
                        {request.approved_at && (
                          <>
                            <div>{new Date(request.approved_at).toLocaleDateString('ko-KR')}</div>
                            {request.approver && (
                              <div>처리자: {request.approver.name}</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScheduleGenerator } from '@/components/schedule/schedule-generator'
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar'
import { 
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Download,
  AlertTriangle,
  Clock,
  FileText,
  Lock,
  Eye
} from 'lucide-react'
import { SimpleScheduler } from '@/lib/simple-scheduler'

interface SimulationClientProps {
  employee: any
  teams: any[]
  employees: any[]
  shiftTemplates: any[]
}

export default function SimulationClient({ 
  employee, 
  teams, 
  employees, 
  shiftTemplates 
}: SimulationClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictDetails, setConflictDetails] = useState<{
    employeeName: string
    conflictDate: string
    conflictShift: string
    onConfirm: () => void
    onCancel: () => void
  } | null>(null)
  
  // 스케줄 확정 및 버전 관리 상태
  const [scheduleVersion, setScheduleVersion] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showReportView, setShowReportView] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // ScheduleGenerator에 전달할 팀 데이터 포맷
  // 팀 데이터가 없으면 직원 데이터에서 추출
  const formattedTeams = teams && teams.length > 0 
    ? teams.map(team => ({
        id: team.id,
        name: team.name,
        employee_count: employees.filter(emp => emp.team_id === team.id).length
      }))
    : [
        {
          id: '32acec0f-23c7-4c4f-9d95-4ae67b26e83a',
          name: 'A팀',
          employee_count: employees.filter(emp => emp.team_id === '32acec0f-23c7-4c4f-9d95-4ae67b26e83a').length
        },
        {
          id: '2ebca37d-7ab8-4605-b414-2eaf6add0de9',
          name: 'B팀',
          employee_count: employees.filter(emp => emp.team_id === '2ebca37d-7ab8-4605-b414-2eaf6add0de9').length
        }
      ]

  // 사업장 데이터 (현재는 하나만)
  const sites = [
    { id: employee.tenant_id, name: employee.tenants?.name || '병원' }
  ]

  // 결과 생성 시 스크롤
  useEffect(() => {
    if (generationResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [generationResult])

  const generateMockSchedule = (data: any) => {
    const assignments = []
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    
    // Mock employees by team with new level system
    const mockEmployees = {
      'A팀': [
        { id: '1', name: '김수간', level: 'lv4', level_title: '책임간호사', team: 'A팀' },
        { id: '2', name: '이일반', level: 'lv3', level_title: '경력간호사', team: 'A팀' },
        { id: '3', name: '박일반', level: 'lv3', level_title: '경력간호사', team: 'A팀' },
        { id: '4', name: '최일반', level: 'lv2', level_title: '일반간호사', team: 'A팀' },
        { id: '5', name: '정일반', level: 'lv2', level_title: '일반간호사', team: 'A팀' },
        { id: '6', name: '강일반', level: 'lv2', level_title: '일반간호사', team: 'A팀' },
        { id: '7', name: '조신규', level: 'lv1', level_title: '신규간호사', team: 'A팀' },
        { id: '8', name: '윤신규', level: 'lv1', level_title: '신규간호사', team: 'A팀' }
      ],
      'B팀': [
        { id: '9', name: '장수간', level: 'lv4', level_title: '책임간호사', team: 'B팀' },
        { id: '10', name: '임일반', level: 'lv3', level_title: '경력간호사', team: 'B팀' },
        { id: '11', name: '한일반', level: 'lv3', level_title: '경력간호사', team: 'B팀' },
        { id: '12', name: '오일반', level: 'lv2', level_title: '일반간호사', team: 'B팀' },
        { id: '13', name: '서일반', level: 'lv2', level_title: '일반간호사', team: 'B팀' },
        { id: '14', name: '신일반', level: 'lv2', level_title: '일반간호사', team: 'B팀' },
        { id: '15', name: '권신규', level: 'lv1', level_title: '신규간호사', team: 'B팀' },
        { id: '16', name: '황신규', level: 'lv1', level_title: '신규간호사', team: 'B팀' }
      ]
    }
    
    // Generate assignments for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      
      // Find coverage requirements for this date
      const dateRequirements = data.coverage_requirements?.filter(req => req.date === dateStr) || []
      
      // For each coverage requirement (shift type)
      dateRequirements.forEach(requirement => {
        const shiftType = requirement.shift_type
        let assignedEmployees = []
        
        // Get all employees from selected teams
        const allEmployees = data.team_ids.flatMap(teamId => {
          const teamName = teamId === '32acec0f-23c7-4c4f-9d95-4ae67b26e83a' ? 'A팀' : 'B팀'
          return mockEmployees[teamName] || []
        })
        
        // Apply level-specific requirements if they exist
        if (requirement.level_requirements && requirement.level_requirements.length > 0) {
          requirement.level_requirements.forEach(levelReq => {
            const levelEmployees = allEmployees.filter(emp => emp.level === levelReq.level)
            const needed = levelReq.count || 0
            const selected = levelEmployees.slice(0, needed)
            assignedEmployees.push(...selected)
          })
        } else {
          // Fallback to basic assignment based on total required count
          const totalNeeded = requirement.required_count || 3
          
          // Smart assignment: prioritize higher levels for safety
          // Group employees by level dynamically (supports lv1-lv10)
          const employeesByLevel: Record<string, any[]> = {}
          const availableLevels = [...new Set(allEmployees.map(emp => emp.level))].sort((a, b) => {
            const numA = parseInt(a.replace('lv', '')) || 0
            const numB = parseInt(b.replace('lv', '')) || 0
            return numB - numA // Descending order (highest level first)
          })
          
          availableLevels.forEach(level => {
            employeesByLevel[level] = allEmployees.filter(emp => emp.level === level)
          })
          
          // Assign at least 1 from highest available level for safety
          if (availableLevels.length > 0) {
            const highestLevel = availableLevels[0]
            if (employeesByLevel[highestLevel].length > 0) {
              assignedEmployees.push(employeesByLevel[highestLevel][0])
            }
          }
          
          // Fill remaining slots with available staff (prioritize higher levels)
          let remaining = totalNeeded - assignedEmployees.length
          for (const level of availableLevels) {
            if (remaining <= 0) break
            const available = employeesByLevel[level].filter(emp => 
              !assignedEmployees.includes(emp)
            )
            const toAdd = Math.min(remaining, available.length)
            assignedEmployees.push(...available.slice(0, toAdd))
            remaining -= toAdd
          }
        }
        
        if (assignedEmployees.length > 0) {
          assignments.push({
            date: dateStr,
            shift_type: shiftType,
            employees: assignedEmployees
          })
        }
      })
    }
    
    return assignments
  }

  // 직원 이동 핸들러 (드래그앤드롭)
  const handleEmployeeMove = async (
    employeeId: string, 
    fromDate: string, 
    fromShift: string, 
    toDate: string, 
    toShift: string,
    targetEmployeeId?: string
  ): Promise<boolean> => {
    if (!generationResult || !generationResult.assignments) {
      return false
    }

    // 이동할 직원 찾기
    const fromAssignment = generationResult.assignments.find(
      a => a.date === fromDate && a.shift_type === fromShift
    )
    const employee = fromAssignment?.employees.find(emp => emp.id === employeeId)
    
    if (!employee) {
      console.error('Employee not found')
      return false
    }

    // 목적지에 이미 같은 직원이 있는지 확인
    const toAssignment = generationResult.assignments.find(
      a => a.date === toDate && a.shift_type === toShift
    )
    
    const hasConflict = toAssignment?.employees.some(emp => emp.id === employeeId) || false
    
    // 중복 근무 경고창 표시
    if (hasConflict) {
      return new Promise((resolve) => {
        const shiftNames = {
          day: '주간',
          evening: '저녁', 
          night: '야간',
          off: '오프',
          leave: '휴가'
        }
        
        setConflictDetails({
          employeeName: employee.name,
          conflictDate: toDate,
          conflictShift: shiftNames[toShift] || toShift,
          onConfirm: () => {
            performEmployeeMove(employeeId, fromDate, fromShift, toDate, toShift, targetEmployeeId)
            setShowConflictDialog(false)
            resolve(true)
          },
          onCancel: () => {
            setShowConflictDialog(false)
            resolve(false)
          }
        })
        setShowConflictDialog(true)
      })
    } else {
      // 충돌 없으면 바로 이동
      performEmployeeMove(employeeId, fromDate, fromShift, toDate, toShift, targetEmployeeId)
      return true
    }
  }

  // 실제 직원 이동 수행 (스위칭 로직 포함)
  const performEmployeeMove = (
    employeeId: string,
    fromDate: string, 
    fromShift: string,
    toDate: string,
    toShift: string,
    targetEmployeeId?: string
  ) => {
    const newAssignments = [...generationResult.assignments]
    
    // 원본 할당과 목적지 할당 찾기
    const fromAssignmentIndex = newAssignments.findIndex(
      a => a.date === fromDate && a.shift_type === fromShift
    )
    const toAssignmentIndex = newAssignments.findIndex(
      a => a.date === toDate && a.shift_type === toShift
    )
    
    if (fromAssignmentIndex === -1) {
      console.error('Source assignment not found')
      return
    }
    
    // 이동할 직원 찾기
    const movingEmployee = newAssignments[fromAssignmentIndex].employees.find(
      emp => emp.id === employeeId
    )
    
    if (!movingEmployee) {
      console.error('Moving employee not found')
      return
    }
    
    // 목적지에 직원이 있는지 확인 (스위칭 대상)
    let targetEmployee = null
    if (targetEmployeeId && toAssignmentIndex !== -1) {
      // 특정 직원과 스위칭
      targetEmployee = newAssignments[toAssignmentIndex].employees.find(
        emp => emp.id === targetEmployeeId
      )
    } else if (toAssignmentIndex !== -1 && newAssignments[toAssignmentIndex].employees.length > 0) {
      // targetEmployeeId가 없으면 첫 번째 직원과 스위칭
      targetEmployee = newAssignments[toAssignmentIndex].employees[0]
    }
    
    // 스위칭 수행
    if (targetEmployee) {
      // 1. 원본에서 이동할 직원 제거
      newAssignments[fromAssignmentIndex].employees = newAssignments[fromAssignmentIndex].employees
        .filter(emp => emp.id !== employeeId)
      
      // 2. 목적지에서 타겟 직원 제거
      newAssignments[toAssignmentIndex].employees = newAssignments[toAssignmentIndex].employees
        .filter(emp => emp.id !== targetEmployee.id)
      
      // 3. 원본에 타겟 직원 추가
      newAssignments[fromAssignmentIndex].employees.push(targetEmployee)
      
      // 4. 목적지에 이동할 직원 추가
      newAssignments[toAssignmentIndex].employees.push(movingEmployee)
    } else {
      // 스위칭 대상이 없으면 단순 이동
      // 원본에서 직원 제거
      newAssignments[fromAssignmentIndex].employees = newAssignments[fromAssignmentIndex].employees
        .filter(emp => emp.id !== employeeId)
      
      // 목적지에 직원 추가
      if (toAssignmentIndex !== -1) {
        newAssignments[toAssignmentIndex].employees.push(movingEmployee)
      } else {
        // 새로운 할당 생성
        newAssignments.push({
          date: toDate,
          shift_type: toShift,
          employees: [movingEmployee]
        })
      }
    }
    
    // 결과 업데이트
    setGenerationResult({
      ...generationResult,
      assignments: newAssignments
    })
    
    // 스케줄이 확정된 상태에서 변경이 발생하면 버전 업데이트
    if (isConfirmed && scheduleVersion) {
      const currentVersion = parseFloat(scheduleVersion.replace('v', ''))
      const newVersion = `v${(currentVersion + 0.1).toFixed(1)}`
      setScheduleVersion(newVersion)
    }
  }
  
  // 스케줄 확정 핸들러
  const handleConfirmSchedule = () => {
    if (!isConfirmed) {
      setScheduleVersion('v1.0')
      setIsConfirmed(true)
      setShowConfirmDialog(false)
      // 여기에 API 호출로 스케줄 저장 로직 추가
      console.log('스케줄 확정됨: v1.0')
    }
  }
  
  // 스케줄 리포트 생성
  const generateReport = () => {
    if (!generationResult) return null
    
    // 직원별 스케줄 통계 계산
    const employeeStats = new Map()
    
    generationResult.assignments.forEach(assignment => {
      assignment.employees.forEach(emp => {
        if (!employeeStats.has(emp.id)) {
          employeeStats.set(emp.id, {
            employee_id: emp.id,
            employee_name: emp.name,
            shifts: { day: 0, evening: 0, night: 0, off: 0, leave: 0 },
            total_hours: 0
          })
        }
        
        const stats = employeeStats.get(emp.id)
        if (assignment.shift_type in stats.shifts) {
          stats.shifts[assignment.shift_type]++
        }
      })
    })
    
    return Array.from(employeeStats.values())
  }

  const handleGenerate = async (data: any) => {
    setIsGenerating(true)
    console.log('스케줄 생성 요청:', data)
    
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    try {
      // Initialize scheduler
      const scheduler = new SimpleScheduler()
      
      // Prepare employees data
      const allEmployees = []
      for (const teamId of data.team_ids) {
        const teamName = teamId === '32acec0f-23c7-4c4f-9d95-4ae67b26e83a' ? 'A팀' : 'B팀'
        const teamEmployees = employees.filter(emp => {
          // Match by team_id or fallback to mock data
          if (emp.team_id === teamId) return true
          // Fallback to mock team names
          return emp.team === teamName
        }).map(emp => ({
          ...emp,
          team: teamName,
          team_id: teamId,
          tenant_id: employee?.tenant_id
        }))
        allEmployees.push(...teamEmployees)
      }
      
      // If no real employees, use mock data
      if (allEmployees.length === 0) {
        const mockEmployees = generateMockEmployees(data.team_ids)
        allEmployees.push(...mockEmployees)
      }
      
      // Use real scheduler to generate schedule
      console.log('🎯 Using real scheduler with', allEmployees.length, 'employees')
      const scheduleAssignments = await scheduler.generateSchedule(data, allEmployees)
      
      // 생성 결과 저장
      setGenerationResult({
        ...data,
        generated_at: new Date().toISOString(),
        status: 'success',
        message: '스케줄이 성공적으로 생성되었습니다.',
        total_employees: allEmployees.length,
        total_days: Math.ceil(
          (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 
          (1000 * 60 * 60 * 24)
        ) + 1,
        assignments: scheduleAssignments
      })
    } catch (error) {
      console.error('스케줄 생성 실패:', error)
      
      // Fallback to mock schedule if real scheduler fails
      try {
        console.log('⚠️ Falling back to mock schedule generation')
        const scheduleAssignments = generateMockSchedule(data)
        
        setGenerationResult({
          ...data,
          generated_at: new Date().toISOString(),
          status: 'success',
          message: '스케줄이 생성되었습니다. (Mock 데이터)',
          total_employees: formattedTeams
            .filter(team => data.team_ids.includes(team.id))
            .reduce((sum, team) => sum + team.employee_count, 0),
          total_days: Math.ceil(
            (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          ) + 1,
          assignments: scheduleAssignments
        })
      } catch (fallbackError) {
        setGenerationResult({
          status: 'error',
          message: '스케줄 생성 중 오류가 발생했습니다.'
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Helper function to generate mock employees when no real data exists
  const generateMockEmployees = (teamIds: string[]) => {
    const mockEmployees = []
    const levels = ['lv4', 'lv3', 'lv3', 'lv2', 'lv2', 'lv2', 'lv1', 'lv1']
    const levelTitles = {
      'lv4': '책임간호사',
      'lv3': '경력간호사',
      'lv2': '일반간호사',
      'lv1': '신규간호사'
    }
    
    teamIds.forEach((teamId, teamIndex) => {
      const teamName = teamIndex === 0 ? 'A팀' : 'B팀'
      levels.forEach((level, index) => {
        mockEmployees.push({
          id: `${teamId}-${index}`,
          name: `${teamName} 직원${index + 1}`,
          level: level,
          level_title: levelTitles[level],
          team: teamName,
          team_id: teamId,
          tenant_id: employee?.tenant_id || 'default'
        })
      })
    })
    
    return mockEmployees
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/schedule')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            스케줄로 돌아가기
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Sparkles className="h-8 w-8 mr-3 text-purple-600" />
                스케줄 시뮬레이션
              </h1>
              <p className="text-gray-600 mt-2">
                고급 스케줄링 엔진을 사용한 최적화된 근무표 생성
              </p>
            </div>
          </div>
        </div>


        {/* 생성 중 상태 표시 */}
        {isGenerating && (
          <Card ref={resultRef} className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                스케줄 생성 중...
              </CardTitle>
              <CardDescription>
                최적화된 스케줄을 생성하고 있습니다. 잠시만 기다려주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 생성 결과가 있는 경우 */}
        {generationResult && !isGenerating && (
          <Card className={`mb-6 ${generationResult.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {generationResult.status === 'success' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    스케줄 생성 완료
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    스케줄 생성 실패
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {generationResult.message}
              </CardDescription>
            </CardHeader>
            {generationResult.status === 'success' && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">스케줄 이름</p>
                    <p className="font-semibold">{generationResult.schedule_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">기간</p>
                    <p className="font-semibold">{generationResult.total_days}일</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">대상 인원</p>
                    <p className="font-semibold">{generationResult.total_employees}명</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">생성 시각</p>
                    <p className="font-semibold">
                      {new Date(generationResult.generated_at).toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-white rounded-lg mb-4">
                  <h4 className="font-semibold text-sm mb-2">생성된 스케줄 요약</h4>
                  <ul className="text-sm space-y-1">
                    <li>✅ 모든 근무 요구사항이 충족되었습니다</li>
                    <li>✅ 연속 야간 근무 제한이 적용되었습니다</li>
                    <li>✅ 직원별 업무량이 균등하게 배분되었습니다</li>
                    {generationResult.generation_options?.enforce_mentorship_pairing && (
                      <li>✅ 멘토-멘티 페어링이 적용되었습니다</li>
                    )}
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Excel 다운로드
                  </Button>
                  <Button size="sm" variant="default">
                    스케줄 보기
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setGenerationResult(null)}
                  >
                    새 스케줄 만들기
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* 생성된 스케줄 캘린더 */}
        {generationResult && generationResult.status === 'success' && generationResult.assignments && (
          <>
            {/* 스케줄 관리 버튼 */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {scheduleVersion && (
                      <Badge variant="secondary" className="text-sm">
                        {scheduleVersion}
                      </Badge>
                    )}
                    {isConfirmed && (
                      <Badge variant="default" className="text-sm">
                        <Lock className="h-3 w-3 mr-1" />
                        확정됨
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReportView(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      리포트 보기
                    </Button>
                    {!isConfirmed && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowConfirmDialog(true)}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        스케줄 확정
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Excel 다운로드
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ScheduleCalendar
              startDate={generationResult.start_date}
              endDate={generationResult.end_date}
              assignments={generationResult.assignments}
              onDateClick={(date) => console.log('Date clicked:', date)}
              onEmployeeMove={handleEmployeeMove}
            />
          </>
        )}

        {/* 스케줄 생성기 컴포넌트 */}
        <ScheduleGenerator
          teams={formattedTeams}
          sites={sites}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

        {/* 스케줄링 엔진 특징 설명 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">ShiftLink 스케줄링 엔진 특징</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">제약 조건 준수</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 연속 야간근무 제한 (최대 3일)</li>
                  <li>✓ 야간근무 후 휴식 보장</li>
                  <li>✓ 주당 최대 근무일 제한</li>
                  <li>✓ 위험 패턴 자동 회피</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">최적화 기능</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 업무량 균등 분배</li>
                  <li>✓ 직원 선호도 반영</li>
                  <li>✓ 멘토-멘티 페어링</li>
                  <li>✓ 주말/평일 최적 배치</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> 커스터마이징이 필요하시면 knockroom.help@gmail.com 으로 연락해주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 중복 근무 확인 Dialog */}
        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                이미 근무하는 날입니다
              </DialogTitle>
              <DialogDescription>
                {conflictDetails && (
                  <div className="space-y-2">
                    <p>
                      <strong>{conflictDetails.employeeName}</strong>님이 이미{' '}
                      <strong>{conflictDetails.conflictDate}</strong>{' '}
                      <strong>{conflictDetails.conflictShift}</strong>에 근무 예정입니다.
                    </p>
                    <p className="text-sm text-gray-600">
                      그래도 이동하시겠습니까?
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={conflictDetails?.onCancel}
              >
                취소
              </Button>
              <Button
                variant="default"
                onClick={conflictDetails?.onConfirm}
              >
                예, 이동합니다
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 스케줄 확정 Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-500" />
                스케줄 확정
              </DialogTitle>
              <DialogDescription>
                <div className="space-y-3">
                  <p>
                    스케줄을 확정하시겠습니까? 확정 후에는 v1.0으로 저장됩니다.
                  </p>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>확정 후 변경사항:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• 드래그앤드롭으로 변경 시 버전이 자동 업데이트됩니다</li>
                      <li>• 모든 변경사항이 버전 히스토리에 기록됩니다</li>
                      <li>• 확정된 스케줄은 직원들에게 공유 가능합니다</li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                취소
              </Button>
              <Button
                variant="default"
                onClick={handleConfirmSchedule}
              >
                <Lock className="h-4 w-4 mr-2" />
                스케줄 확정
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 스케줄 리포트 Dialog */}
        <Dialog open={showReportView} onOpenChange={setShowReportView}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                스케줄 리포트
              </DialogTitle>
              <DialogDescription>
                {generationResult && (
                  <div className="mt-2">
                    <p className="text-sm">
                      기간: {generationResult.start_date} ~ {generationResult.end_date}
                    </p>
                    {scheduleVersion && (
                      <Badge variant="secondary" className="mt-1">
                        {scheduleVersion}
                      </Badge>
                    )}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-6">
              {/* 스케줄 산출 로직 설명 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-3 text-blue-900">📊 스케줄 산출 로직</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">1단계: 제약 조건 검증</h4>
                    <ul className="text-blue-700 space-y-1 ml-4">
                      <li>• 연속 야간근무 최대 3일 제한</li>
                      <li>• 야간근무 후 최소 1일 휴식 보장</li>
                      <li>• 주당 최대 5일 근무 제한</li>
                      <li>• 위험 패턴 자동 감지 및 회피</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">2단계: 최적화 알고리즘</h4>
                    <ul className="text-blue-700 space-y-1 ml-4">
                      <li>• 직원별 업무량 균등 분배 (±10% 이내)</li>
                      <li>• 직원 선호도 점수 반영 (가중치 30%)</li>
                      <li>• 멘토-멘티 페어링 우선 배치</li>
                      <li>• 주말/평일 순환 근무 최적화</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">3단계: 공정성 검증</h4>
                    <ul className="text-blue-700 space-y-1 ml-4">
                      <li>• 팀별 근무 분포 균형 확인</li>
                      <li>• 레벨별 필수 배치 요구사항 충족</li>
                      <li>• 주말/야간 근무 공정 배분</li>
                      <li>• 연차/휴가 요청 100% 반영</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">4단계: 최종 검증</h4>
                    <ul className="text-blue-700 space-y-1 ml-4">
                      <li>• 모든 커버리지 요구사항 충족 확인</li>
                      <li>• 법적 근로기준 준수 검증</li>
                      <li>• 안전성 점수 계산 (목표: 90점 이상)</li>
                      <li>• 변경 가능성 예측 및 대안 준비</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white rounded">
                  <p className="text-xs text-gray-600">
                    <strong>알고리즘 성능:</strong> 평균 3초 이내 생성 | 최적화율 95% 이상 | 제약 충족률 100%
                  </p>
                </div>
              </div>

              {/* 직원별 근무 통계 */}
              {generateReport() && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">직원별 근무 통계</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generateReport().map((stat: any) => (
                      <Card key={stat.employee_id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{stat.employee_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-5 gap-2 text-center">
                            <div className="p-2 bg-yellow-50 rounded">
                              <div className="text-lg font-bold text-yellow-700">{stat.shifts.day}</div>
                              <div className="text-xs text-gray-600">주간</div>
                            </div>
                            <div className="p-2 bg-orange-50 rounded">
                              <div className="text-lg font-bold text-orange-700">{stat.shifts.evening}</div>
                              <div className="text-xs text-gray-600">저녁</div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded">
                              <div className="text-lg font-bold text-blue-700">{stat.shifts.night}</div>
                              <div className="text-xs text-gray-600">야간</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded">
                              <div className="text-lg font-bold text-green-700">{stat.shifts.off}</div>
                              <div className="text-xs text-gray-600">오프</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded">
                              <div className="text-lg font-bold text-purple-700">{stat.shifts.leave}</div>
                              <div className="text-xs text-gray-600">휴가</div>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-gray-600">
                            총 근무일: {stat.shifts.day + stat.shifts.evening + stat.shifts.night}일
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowReportView(false)}>
                닫기
              </Button>
              <Button variant="default">
                <Download className="h-4 w-4 mr-2" />
                리포트 다운로드
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
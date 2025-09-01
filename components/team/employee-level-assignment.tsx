'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Shield,
  Star,
  GraduationCap,
  Award,
  Crown,
  Zap,
  Target,
  Briefcase,
  UserPlus,
  Save,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  level: number
  role: string
  hire_date: string
  employee_code?: string
  avatar_url?: string
}

interface HierarchyLevel {
  level: number
  role_name: string
  color: string
  icon: string
}

interface EmployeeLevelAssignmentProps {
  teamId: string
}

const LEVEL_ICONS = {
  Crown: Crown,        // Level 1
  Shield: Shield,      // Level 2
  Star: Star,          // Level 3
  Award: Award,        // Level 4
  Briefcase: Briefcase,// Level 5
  Target: Target,      // Level 6
  Zap: Zap,           // Level 7
  GraduationCap: GraduationCap, // Level 8
  UserPlus: UserPlus,  // Level 9
  Users: Users        // Level 10
}

export default function EmployeeLevelAssignment({ teamId }: EmployeeLevelAssignmentProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkLevel, setBulkLevel] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    loadEmployees()
    loadHierarchyLevels()
  }, [teamId])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('level', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Failed to load employees:', error)
      toast.error('직원 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const loadHierarchyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_hierarchy')
        .select('*')
        .eq('team_id', teamId)
        .order('level', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setHierarchyLevels(data.map(item => ({
          level: item.level,
          role_name: item.role_name,
          color: getLevelColor(item.level),
          icon: getLevelIcon(item.level)
        })))
      } else {
        // Default levels if none configured
        setHierarchyLevels([
          { level: 1, role_name: '팀장', color: 'bg-purple-500', icon: 'Shield' },
          { level: 2, role_name: '시니어', color: 'bg-blue-500', icon: 'Star' },
          { level: 3, role_name: '주니어', color: 'bg-green-500', icon: 'GraduationCap' }
        ])
      }
    } catch (error) {
      console.error('Failed to load hierarchy levels:', error)
    }
  }

  const getLevelColor = (level: number): string => {
    const colors = [
      'bg-purple-600',  // Level 1
      'bg-purple-500',  // Level 2
      'bg-indigo-500',  // Level 3
      'bg-blue-500',    // Level 4
      'bg-cyan-500',    // Level 5
      'bg-teal-500',    // Level 6
      'bg-green-500',   // Level 7
      'bg-lime-500',    // Level 8
      'bg-yellow-500',  // Level 9
      'bg-orange-500'   // Level 10
    ]
    return colors[level - 1] || 'bg-gray-500'
  }

  const getLevelIcon = (level: number): string => {
    const icons = [
      'Crown',          // Level 1
      'Shield',         // Level 2
      'Star',           // Level 3
      'Award',          // Level 4
      'Briefcase',      // Level 5
      'Target',         // Level 6
      'Zap',            // Level 7
      'GraduationCap',  // Level 8
      'UserPlus',       // Level 9
      'Users'           // Level 10
    ]
    return icons[level - 1] || 'Users'
  }

  const handleLevelChange = async (employeeId: string, newLevel: number) => {
    const updatedEmployees = employees.map(emp =>
      emp.id === employeeId ? { ...emp, level: newLevel } : emp
    )
    setEmployees(updatedEmployees)
  }

  const handleBulkLevelChange = () => {
    if (!bulkLevel || selectedEmployees.size === 0) {
      toast.error('레벨과 직원을 선택해주세요')
      return
    }

    const newLevel = parseInt(bulkLevel)
    const updatedEmployees = employees.map(emp =>
      selectedEmployees.has(emp.id) ? { ...emp, level: newLevel } : emp
    )
    setEmployees(updatedEmployees)
    setSelectedEmployees(new Set())
    setBulkLevel('')
    toast.success(`${selectedEmployees.size}명의 레벨이 변경되었습니다`)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update all employees with their new levels
      const updates = employees.map(emp => ({
        id: emp.id,
        level: emp.level
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('employees')
          .update({ level: update.level })
          .eq('id', update.id)

        if (error) throw error
      }

      toast.success('레벨 변경사항이 저장되었습니다')
    } catch (error) {
      console.error('Failed to save levels:', error)
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(emp => emp.id)))
    }
  }

  const toggleSelectEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const getYearsOfService = (hireDate: string): number => {
    const hire = new Date(hireDate)
    const now = new Date()
    return Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.employee_code?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesLevel = filterLevel === 'all' || emp.level === parseInt(filterLevel)
    return matchesSearch && matchesLevel
  })

  const levelDistribution = employees.reduce((acc, emp) => {
    acc[emp.level] = (acc[emp.level] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>직원 레벨 관리</CardTitle>
          <CardDescription>
            팀 구성원의 계층 레벨을 할당하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {hierarchyLevels.map(level => {
              const IconComponent = LEVEL_ICONS[level.icon as keyof typeof LEVEL_ICONS] || Users
              const count = levelDistribution[level.level] || 0
              
              return (
                <div key={level.level} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${level.color} bg-opacity-20`}>
                    <IconComponent className={`w-5 h-5 ${level.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="text-sm font-medium">{level.role_name}</div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.size > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{selectedEmployees.size}명 선택됨</span>
              <div className="flex items-center gap-2">
                <Select value={bulkLevel} onValueChange={setBulkLevel}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchyLevels.map(level => (
                      <SelectItem key={level.level} value={level.level.toString()}>
                        {level.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkLevelChange}>
                  일괄 변경
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>직원 목록</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 이메일 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              {/* Level Filter */}
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 레벨</SelectItem>
                  {hierarchyLevels.map(level => (
                    <SelectItem key={level.level} value={level.level.toString()}>
                      {level.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Select All */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">전체 선택</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredEmployees.length}명
              </span>
            </div>

            {/* Employee Rows */}
            {filteredEmployees.map((employee) => {
              const levelInfo = hierarchyLevels.find(l => l.level === employee.level)
              const IconComponent = levelInfo ? LEVEL_ICONS[levelInfo.icon as keyof typeof LEVEL_ICONS] : Users
              const yearsOfService = employee.hire_date ? getYearsOfService(employee.hire_date) : 0

              return (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedEmployees.has(employee.id)}
                      onCheckedChange={() => toggleSelectEmployee(employee.id)}
                    />
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar_url} />
                      <AvatarFallback>
                        {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {employee.employee_code && (
                          <Badge variant="outline" className="text-xs">
                            {employee.employee_code}
                          </Badge>
                        )}
                        {yearsOfService > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {yearsOfService}년차
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {levelInfo && (
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${levelInfo.color} bg-opacity-20`}>
                          <IconComponent className={`w-4 h-4 ${levelInfo.color.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="text-sm font-medium">{levelInfo.role_name}</span>
                      </div>
                    )}
                    
                    <Select
                      value={employee.level.toString()}
                      onValueChange={(value) => handleLevelChange(employee.id, parseInt(value))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hierarchyLevels.map(level => (
                          <SelectItem key={level.level} value={level.level.toString()}>
                            <div className="flex items-center gap-2">
                              {React.createElement(LEVEL_ICONS[level.icon as keyof typeof LEVEL_ICONS] || Users, {
                                className: "w-3 h-3"
                              })}
                              {level.role_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>저장 중...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              변경사항 저장
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
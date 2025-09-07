'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, UserPlus, Edit, Trash2, Mail, Phone, Save, X, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  department?: string
  team_id?: string
  phone?: string
  hire_date: string
  is_active: boolean
  skills?: string[]
  tenant_id?: string
}

interface EmployeesClientProps {
  userRole: string
  userTenantId: string
}

export function EmployeesClient({ userRole, userTenantId }: EmployeesClientProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedEmployee, setEditedEmployee] = useState<Employee | null>(null)
  
  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const supabase = createClient()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      // admin은 모든 직원 조회, 그 외는 tenant_id로 필터링
      let query = supabase
        .from('employees')
        .select('*')
        .order('name')
      
      if (userRole !== 'admin') {
        query = query.eq('tenant_id', userTenantId)
      }

      const { data, error } = await query

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => {
    // Search filter
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Role filter
    const matchesRole = roleFilter === 'all' || emp.role === roleFilter
    
    // Department filter
    const matchesDepartment = departmentFilter === 'all' || 
      (departmentFilter === 'none' ? !emp.department : emp.department === departmentFilter)
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? emp.is_active : !emp.is_active)
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })

  // Get unique departments for filter
  const uniqueDepartments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)))

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'manager': return '매니저'
      default: return '직원'
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id)
    setEditedEmployee({ ...employee })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditedEmployee(null)
  }

  const handleSave = async () => {
    if (!editedEmployee) return

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          role: editedEmployee.role,
          department: editedEmployee.department,
          is_active: editedEmployee.is_active
        })
        .eq('id', editedEmployee.id)

      if (error) throw error

      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === editedEmployee.id ? editedEmployee : emp
      ))
      
      toast.success('직원 정보가 업데이트되었습니다.')
      setEditingId(null)
      setEditedEmployee(null)
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error('직원 정보 업데이트에 실패했습니다.')
    }
  }

  const handleFieldChange = (field: keyof Employee, value: any) => {
    if (!editedEmployee) return
    setEditedEmployee({ ...editedEmployee, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">직원 관리</h2>
          <p className="text-muted-foreground">
            직원 정보를 관리하고 권한을 설정하세요.
            {userRole === 'admin' && ' (전체 테넌트)'}
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          직원 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>직원 목록</CardTitle>
              {(roleFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoleFilter('all')
                    setDepartmentFilter('all')
                    setStatusFilter('all')
                  }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  필터 초기화
                </Button>
              )}
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="이름, 이메일 또는 부서로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <p className="text-gray-500">직원 목록을 불러오는 중...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <span>역할</span>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="h-6 w-6 p-0 border-0 hover:bg-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="manager">매니저</SelectItem>
                          <SelectItem value="employee">직원</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <span>부서</span>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="h-6 w-6 p-0 border-0 hover:bg-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="none">미지정</SelectItem>
                          {uniqueDepartments.map(dept => (
                            <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <span>상태</span>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-6 w-6 p-0 border-0 hover:bg-accent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="active">활성</SelectItem>
                          <SelectItem value="inactive">비활성</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {employee.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === employee.id ? (
                          <Select
                            value={editedEmployee?.role}
                            onValueChange={(value) => handleFieldChange('role', value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">관리자</SelectItem>
                              <SelectItem value="manager">매니저</SelectItem>
                              <SelectItem value="employee">직원</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleBadgeColor(employee.role)} variant="secondary">
                            {getRoleLabel(employee.role)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === employee.id ? (
                          <Input
                            value={editedEmployee?.department || ''}
                            onChange={(e) => handleFieldChange('department', e.target.value)}
                            className="w-[120px]"
                            placeholder="부서명"
                          />
                        ) : (
                          employee.department || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {employee.phone}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{employee.hire_date || '-'}</TableCell>
                      <TableCell>
                        {editingId === employee.id ? (
                          <Select
                            value={editedEmployee?.is_active ? 'active' : 'inactive'}
                            onValueChange={(value) => handleFieldChange('is_active', value === 'active')}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">활성</SelectItem>
                              <SelectItem value="inactive">비활성</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? '활성' : '비활성'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingId === employee.id ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={handleSave}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(employee)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <p className="text-gray-500">
                        {searchTerm ? '검색 결과가 없습니다.' : '등록된 직원이 없습니다.'}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
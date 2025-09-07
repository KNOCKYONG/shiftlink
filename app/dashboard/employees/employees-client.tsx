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
import { Search, UserPlus, Edit, Trash2, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <CardTitle>직원 목록</CardTitle>
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
                  <TableHead>역할</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead>상태</TableHead>
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
                        <Badge className={getRoleBadgeColor(employee.role)} variant="secondary">
                          {getRoleLabel(employee.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
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
                        <Badge variant={employee.is_active ? "default" : "secondary"}>
                          {employee.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
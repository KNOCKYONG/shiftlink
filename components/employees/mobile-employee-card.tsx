'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  Trash2,
  MoreVertical,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

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

interface MobileEmployeeCardProps {
  employee: Employee
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
  getRoleBadgeColor: (role: string) => string
  getRoleLabel: (role: string) => string
}

export function MobileEmployeeCard({ 
  employee, 
  onEdit, 
  onDelete,
  getRoleBadgeColor,
  getRoleLabel
}: MobileEmployeeCardProps) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        {/* Header with name and actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full p-2">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{employee.name}</h3>
              <Badge 
                className={`${getRoleBadgeColor(employee.role)} mt-1`} 
                variant="secondary"
              >
                {getRoleLabel(employee.role)}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(employee)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(employee.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-3 w-3" />
            <span className="text-xs truncate">{employee.email}</span>
          </div>
          
          {employee.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-3 w-3" />
              <span className="text-xs">{employee.phone}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">
              입사일: {format(new Date(employee.hire_date), 'yyyy.MM.dd', { locale: ko })}
            </span>
          </div>
        </div>

        {/* Footer with department and status */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500">
            {employee.department || '부서 미지정'}
          </div>
          <Badge 
            variant={employee.is_active ? "default" : "secondary"}
            className={employee.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
          >
            {employee.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
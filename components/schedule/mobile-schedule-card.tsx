'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, User, Calendar } from 'lucide-react'

interface MobileScheduleCardProps {
  employee: {
    name: string
    code: string
    shiftType: string
    startTime?: string
    endTime?: string
    leaveType?: string
  }
  getShiftTypeColor: (type: string, leaveType?: string) => string
  getShiftTypeLabel: (type: string, leaveType?: string, koreanStyle?: boolean) => string
}

export function MobileScheduleCard({ 
  employee, 
  getShiftTypeColor, 
  getShiftTypeLabel 
}: MobileScheduleCardProps) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">{employee.name}</span>
              <span className="text-xs text-gray-500">({employee.code})</span>
            </div>
            
            {employee.startTime && employee.endTime && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{employee.startTime} - {employee.endTime}</span>
              </div>
            )}
          </div>
          
          <Badge 
            className={getShiftTypeColor(employee.shiftType, employee.leaveType)}
            variant="outline"
          >
            {getShiftTypeLabel(employee.shiftType, employee.leaveType)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { LogOut } from 'lucide-react'

interface DashboardHeaderProps {
  user: {
    id: string
    name: string
    role: string
  }
  onSignOut: () => void
}

export function DashboardHeader({ user, onSignOut }: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">ShiftLink</h1>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm text-gray-600">{user.name}</span>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {user.role === 'admin' ? '관리자' : user.role === 'manager' ? '매니저' : '직원'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationBell userId={user.id} />
          <form action={onSignOut}>
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
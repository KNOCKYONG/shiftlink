'use client'

import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        {/* Mobile menu and logo */}
        <div className="flex items-center space-x-3">
          <MobileSidebar user={user} />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">ShiftLink</h1>
          
          {/* Desktop only user info */}
          <div className="hidden md:flex items-center space-x-2 ml-4">
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-600">{user.name}</span>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {user.role === 'admin' ? '관리자' : user.role === 'manager' ? '매니저' : '직원'}
            </span>
          </div>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <NotificationBell userId={user.id} />
          
          {/* Mobile user menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">
                      {user.role === 'admin' ? '관리자' : user.role === 'manager' ? '매니저' : '직원'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={onSignOut} className="w-full">
                    <button type="submit" className="flex items-center w-full">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>로그아웃</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop logout */}
          <form action={onSignOut} className="hidden md:block">
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
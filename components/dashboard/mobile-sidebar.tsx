'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Menu,
  X,
  Calendar, 
  Users, 
  Settings, 
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  BarChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  user: {
    role: string
  }
}

export function MobileSidebar({ user }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { href: '/dashboard/schedule', icon: Calendar, label: '스케줄' },
    { href: '/dashboard/employees', icon: Users, label: '직원 관리', roles: ['admin', 'manager'] },
    { href: '/dashboard/swaps', icon: ArrowLeftRight, label: '교환 요청' },
    { href: '/dashboard/leaves', icon: ClipboardList, label: '휴가 관리' },
    { href: '/dashboard/reports', icon: BarChart, label: '리포트', roles: ['admin', 'manager'] },
    { href: '/dashboard/settings', icon: Settings, label: '설정' },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">메뉴</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            // Check role-based visibility
            if (item.roles && !item.roles.includes(user.role)) {
              return null
            }
            
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
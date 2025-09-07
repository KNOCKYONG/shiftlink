import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardList,
  BarChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  const supabase = await createClient()

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
    { href: '/dashboard/schedule', icon: Calendar, label: '스케줄' },
    { href: '/dashboard/employees', icon: Users, label: '직원 관리', roles: ['admin', 'manager'] },
    { href: '/dashboard/swaps', icon: ArrowLeftRight, label: '교환 요청' },
    { href: '/dashboard/leaves', icon: ClipboardList, label: '휴가 관리' },
    { href: '/dashboard/reports', icon: BarChart, label: '리포트', roles: ['admin', 'manager'] },
    { href: '/dashboard/settings', icon: Settings, label: '설정' },
  ]

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            <form action={handleSignOut}>
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              // Check role-based visibility
              if (item.roles && !item.roles.includes(user.role)) {
                return null
              }
              
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 px-4 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
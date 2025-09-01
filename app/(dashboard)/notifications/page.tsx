import { requireAuth } from '@/lib/auth/utils'
import { NotificationCenter } from '@/components/notifications/notification-center'

export default async function NotificationsPage() {
  const user = await requireAuth()
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">알림 센터</h1>
          <p className="text-gray-600 mt-1">
            모든 알림을 한눈에 확인하고 관리하세요.
          </p>
        </div>
      </div>
      
      <div className="flex justify-center">
        <NotificationCenter 
          userId={user.id} 
        />
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell,
  BellRing,
  Check,
  X,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'schedule_updated' | 'swap_request' | 'swap_accepted' | 'swap_rejected' | 'leave_approved' | 'leave_rejected' | 'emergency' | 'system'
  priority: 'low' | 'medium' | 'high' | 'critical'
  is_read: boolean
  created_at: string
  related_id?: string
  sender?: {
    id: string
    name: string
    employee_code: string
  }
}

interface NotificationBellProps {
  userId: string
  onNotificationAction?: (notificationId: string, action: string) => Promise<void>
}

export function NotificationBell({ userId, onNotificationAction }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadNotifications()
    // 실시간 알림 구독 (향후 구현)
    // const subscription = subscribeToNotifications(userId, handleNewNotification)
    // return () => subscription?.unsubscribe()
  }, [userId])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      const data = await response.json()
      if (response.ok && data.success) {
        setNotifications(data.data.notifications || [])
        setUnreadCount(data.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'mark_read',
          notificationIds: [notificationId]
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'mark_read'
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'critical' ? 'text-red-600' : 
                     priority === 'high' ? 'text-orange-600' :
                     priority === 'medium' ? 'text-blue-600' : 'text-gray-600'

    switch (type) {
      case 'swap_request':
        return <ArrowLeftRight className={`h-3 w-3 ${iconClass}`} />
      case 'swap_accepted':
        return <CheckCircle2 className={`h-3 w-3 ${iconClass}`} />
      case 'swap_rejected':
        return <XCircle className={`h-3 w-3 ${iconClass}`} />
      case 'schedule_updated':
        return <Calendar className={`h-3 w-3 ${iconClass}`} />
      case 'leave_approved':
      case 'leave_rejected':
        return <Clock className={`h-3 w-3 ${iconClass}`} />
      case 'emergency':
        return <AlertTriangle className={`h-3 w-3 ${iconClass}`} />
      default:
        return <Bell className={`h-3 w-3 ${iconClass}`} />
    }
  }

  const getKoreanType = (type: string) => {
    switch (type) {
      case 'swap_request': return '교환 요청'
      case 'swap_accepted': return '교환 수락'
      case 'swap_rejected': return '교환 거부'
      case 'schedule_updated': return '스케줄 변경'
      case 'leave_approved': return '휴가 승인'
      case 'leave_rejected': return '휴가 거부'
      case 'emergency': return '응급 상황'
      case 'system': return '시스템'
      default: return '알림'
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    
    // 알림 관련 페이지로 이동
    if (notification.type.includes('swap') && notification.related_id) {
      setIsOpen(false)
      router.push(`/dashboard/swaps?highlight=${notification.related_id}`)
    }
  }

  const handleSwapAction = async (notificationId: string, action: 'accept' | 'reject') => {
    try {
      if (onNotificationAction) {
        await onNotificationAction(notificationId, action)
        await loadNotifications() // 목록 새로고침
      }
    } catch (error) {
      console.error(`Failed to ${action} swap:`, error)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">알림</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                모두 읽음
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Bell className="h-8 w-8 text-gray-400 animate-pulse" />
              <span className="ml-2 text-gray-600 text-sm">알림을 불러오는 중...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">새로운 알림이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type, notification.priority)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{getKoreanType(notification.type)}</span>
                        <span>
                          {new Date(notification.created_at).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* 교환 요청 액션 버튼 */}
                      {notification.type === 'swap_request' && !notification.is_read && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSwapAction(notification.id, 'accept')
                            }}
                          >
                            수락
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSwapAction(notification.id, 'reject')
                            }}
                          >
                            거부
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false)
                router.push('/dashboard/notifications')
              }}
            >
              모든 알림 보기
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell,
  BellRing,
  Check,
  X,
  Clock,
  ArrowLeftRight,
  AlertTriangle,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Archive
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
  data?: any
}

interface NotificationCenterProps {
  userId: string
  onNotificationAction?: (notificationId: string, action: string) => Promise<void>
}

export function NotificationCenter({ userId, onNotificationAction }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('unread')

  useEffect(() => {
    loadNotifications()
    // 실시간 알림 구독 (향후 구현)
    // const subscription = subscribeToNotifications(userId, handleNewNotification)
    // return () => subscription?.unsubscribe()
  }, [userId])

  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?filter=${filter}`)
      const data = await response.json()
      if (response.ok) {
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true }
              : notification
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        )
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        )
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'critical' ? 'text-red-600' : 
                     priority === 'high' ? 'text-orange-600' :
                     priority === 'medium' ? 'text-blue-600' : 'text-gray-600'

    switch (type) {
      case 'swap_request':
        return <ArrowLeftRight className={`h-4 w-4 ${iconClass}`} />
      case 'swap_accepted':
        return <CheckCircle2 className={`h-4 w-4 ${iconClass}`} />
      case 'swap_rejected':
        return <XCircle className={`h-4 w-4 ${iconClass}`} />
      case 'schedule_updated':
        return <Calendar className={`h-4 w-4 ${iconClass}`} />
      case 'leave_approved':
      case 'leave_rejected':
        return <Clock className={`h-4 w-4 ${iconClass}`} />
      case 'emergency':
        return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
      case 'system':
        return <Bell className={`h-4 w-4 ${iconClass}`} />
      default:
        return <Bell className={`h-4 w-4 ${iconClass}`} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '긴급'
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      default:
        return '낮음'
    }
  }

  const getKoreanType = (type: string) => {
    switch (type) {
      case 'swap_request':
        return '교환 요청'
      case 'swap_accepted':
        return '교환 수락'
      case 'swap_rejected':
        return '교환 거부'
      case 'schedule_updated':
        return '스케줄 변경'
      case 'leave_approved':
        return '휴가 승인'
      case 'leave_rejected':
        return '휴가 거부'
      case 'emergency':
        return '응급 상황'
      case 'system':
        return '시스템'
      default:
        return '알림'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read
      case 'critical':
        return notification.priority === 'critical'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const criticalCount = notifications.filter(n => n.priority === 'critical').length

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            알림 센터
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-1" />
              모두 읽음
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 필터 버튼 */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            읽지 않음 ({unreadCount})
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            긴급 ({criticalCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            전체 ({notifications.length})
          </Button>
        </div>

        {/* 알림 목록 */}
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Bell className="h-8 w-8 text-gray-400 animate-pulse" />
              <span className="ml-2 text-gray-600">알림을 불러오는 중...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>
                {filter === 'unread' ? '읽지 않은 알림이 없습니다.' :
                 filter === 'critical' ? '긴급 알림이 없습니다.' :
                 '알림이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    notification.is_read 
                      ? 'bg-gray-50 opacity-75' 
                      : 'bg-white hover:bg-gray-50'
                  } ${notification.priority === 'critical' ? 'border-red-300' : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type, notification.priority)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {getPriorityText(notification.priority)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getKoreanType(notification.type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {new Date(notification.created_at).toLocaleString('ko-KR')}
                          </span>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">
                              새로운 알림
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1 ml-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          title="읽음 표시"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="text-red-600 hover:bg-red-50"
                        title="삭제"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 교환 요청 등의 액션 버튼 */}
                  {notification.type === 'swap_request' && !notification.is_read && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNotificationAction?.(notification.id, 'accept')
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        수락
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onNotificationAction?.(notification.id, 'reject')
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        거부
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Calendar, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'swap' | 'leave' | 'schedule' | 'alert' | 'info'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  priority?: 'high' | 'medium' | 'low'
}

interface NotificationPanelProps {
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
}

export function NotificationPanel({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationPanelProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'swap':
        return <Users className="h-4 w-4" />
      case 'leave':
        return <Calendar className="h-4 w-4" />
      case 'schedule':
        return <Clock className="h-4 w-4" />
      case 'alert':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'swap':
        return 'text-blue-600 bg-blue-50'
      case 'leave':
        return 'text-green-600 bg-green-50'
      case 'schedule':
        return 'text-purple-600 bg-purple-50'
      case 'alert':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const
    const labels = {
      high: '긴급',
      medium: '보통',
      low: '낮음'
    }
    return (
      <Badge variant={variants[priority as keyof typeof variants]}>
        {labels[priority as keyof typeof labels]}
      </Badge>
    )
  }

  // 임시 알림 데이터
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'swap',
      title: '교환 요청',
      message: '김철수님이 9월 5일 근무 교환을 요청했습니다.',
      timestamp: new Date(),
      isRead: false,
      priority: 'high'
    },
    {
      id: '2',
      type: 'leave',
      title: '휴가 승인 필요',
      message: '박영희님의 휴가 신청이 대기 중입니다.',
      timestamp: new Date(Date.now() - 3600000),
      isRead: false,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'schedule',
      title: '스케줄 업데이트',
      message: '다음 주 스케줄이 확정되었습니다.',
      timestamp: new Date(Date.now() - 7200000),
      isRead: true,
      priority: 'low'
    },
    {
      id: '4',
      type: 'alert',
      title: '연속 야간 근무 경고',
      message: '이민호님이 5일 연속 야간 근무 중입니다.',
      timestamp: new Date(Date.now() - 10800000),
      isRead: false,
      priority: 'high'
    }
  ]

  const displayNotifications = notifications.length > 0 ? notifications : mockNotifications
  const unreadCount = displayNotifications.filter(n => !n.isRead).length

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>알림</CardTitle>
          <CardDescription>
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모든 알림을 확인했습니다'}
          </CardDescription>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            모두 읽음
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
                  !notification.isRead ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => onMarkAsRead?.(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </h4>
                      {getPriorityBadge(notification.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(notification.timestamp, 'MM월 dd일 HH:mm', { locale: ko })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
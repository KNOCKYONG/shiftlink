'use client'

import { createClient } from './client'
import { useEffect, useRef, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

type NotificationPayload = {
  id: string
  type: string
  title: string
  message: string
  recipient_id: string
  is_read: boolean
  created_at: string
}

type SwapRequestPayload = {
  id: string
  status: string
  requester_id: string
  target_employee_id: string
  original_date: string
  target_date: string
}

type ScheduleAssignmentPayload = {
  id: string
  employee_id: string
  date: string
  shift_type: string
  status: string
}

export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    // 기존 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // 새 채널 생성
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationPayload
          setNotifications(prev => [newNotification, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as NotificationPayload
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, supabase])

  return notifications
}

export function useRealtimeSwapRequests(tenantId: string | null) {
  const [swapRequests, setSwapRequests] = useState<SwapRequestPayload[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!tenantId) return

    // 기존 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // 새 채널 생성
    const channel = supabase
      .channel(`swap_requests:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSwapRequest = payload.new as SwapRequestPayload
            setSwapRequests(prev => [newSwapRequest, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedSwapRequest = payload.new as SwapRequestPayload
            setSwapRequests(prev => 
              prev.map(s => s.id === updatedSwapRequest.id ? updatedSwapRequest : s)
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedSwapRequest = payload.old as SwapRequestPayload
            setSwapRequests(prev => 
              prev.filter(s => s.id !== deletedSwapRequest.id)
            )
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [tenantId, supabase])

  return swapRequests
}

export function useRealtimeScheduleChanges(teamId: string | null) {
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleAssignmentPayload[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!teamId) return

    // 기존 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // 새 채널 생성
    const channel = supabase
      .channel(`schedule_assignments:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_assignments',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAssignment = payload.new as ScheduleAssignmentPayload
            setScheduleChanges(prev => [newAssignment, ...prev.slice(0, 49)]) // 최대 50개 유지
          } else if (payload.eventType === 'UPDATE') {
            const updatedAssignment = payload.new as ScheduleAssignmentPayload
            setScheduleChanges(prev => {
              const existing = prev.find(s => s.id === updatedAssignment.id)
              if (existing) {
                return prev.map(s => s.id === updatedAssignment.id ? updatedAssignment : s)
              } else {
                return [updatedAssignment, ...prev.slice(0, 49)]
              }
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [teamId, supabase])

  return scheduleChanges
}

// 실시간 알림을 위한 브라우저 알림 권한 요청
export function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }
}

// 브라우저 알림 표시
export function showBrowserNotification(title: string, message: string, icon?: string) {
  if (
    typeof window !== 'undefined' && 
    'Notification' in window && 
    Notification.permission === 'granted'
  ) {
    new Notification(title, {
      body: message,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    })
  }
}

// 실시간 연결 상태 확인
export function useRealtimeConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel('connection-status')
    
    channel
      .on('system', { event: 'phx_reply' }, (payload) => {
        if (payload.status === 'ok') {
          setIsConnected(true)
        }
      })
      .on('system', { event: 'phx_error' }, () => {
        setIsConnected(false)
      })
      .on('system', { event: 'phx_close' }, () => {
        setIsConnected(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return isConnected
}
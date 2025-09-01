import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const isRead = searchParams.get('isRead')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:employees!notifications_sender_id_fkey (
          id,
          name,
          employee_code
        )
      `)
      .eq('recipient_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('type', type)
    }

    if (isRead !== null) {
      query = query.eq('is_read', isRead === 'true')
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch notifications: ${error.message}` },
        { status: 500 }
      )
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', employee.id)
      .eq('is_read', false)

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        total: notifications?.length || 0
      }
    })

  } catch (error) {
    console.error('Notifications fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      recipientIds, 
      type, 
      title, 
      message, 
      priority = 'medium',
      actionUrl,
      expiresAt 
    } = body

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json(
        { error: 'Recipient IDs array is required' },
        { status: 400 }
      )
    }

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    // Validate recipients are in same tenant
    const { data: recipients } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', employee.tenant_id)
      .in('id', recipientIds)

    if (!recipients || recipients.length !== recipientIds.length) {
      return NextResponse.json(
        { error: 'Some recipients not found or not in same organization' },
        { status: 400 }
      )
    }

    // Create notifications
    const notifications = recipientIds.map(recipientId => ({
      tenant_id: employee.tenant_id,
      recipient_id: recipientId,
      sender_id: employee.id,
      type,
      title,
      message,
      priority,
      action_url: actionUrl || null,
      expires_at: expiresAt || null,
      is_read: false,
      created_at: new Date().toISOString()
    }))

    const { data: createdNotifications, error: createError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create notifications: ${createError.message}` },
        { status: 500 }
      )
    }

    // Send real-time notifications if enabled
    await sendRealtimeNotifications(supabase, notifications)

    // Send email notifications if configured
    await sendEmailNotifications(supabase, notifications)

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: employee.tenant_id,
        user_id: user.id,
        action: 'notifications_sent',
        entity_type: 'notification',
        details: {
          recipientCount: recipientIds.length,
          type,
          title
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${recipientIds.length} recipient(s)`,
      data: {
        notificationIds: createdNotifications?.map(n => n.id) || [],
        recipientCount: recipientIds.length
      }
    })

  } catch (error) {
    console.error('Notification creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, notificationIds } = body

    if (!action || !['mark_read', 'mark_unread', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be mark_read, mark_unread, or delete' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('notifications')
      .eq('recipient_id', employee.id)

    if (notificationIds && Array.isArray(notificationIds)) {
      query = query.in('id', notificationIds)
    }

    let result
    if (action === 'delete') {
      result = await query.delete()
    } else {
      result = await query.update({
        is_read: action === 'mark_read',
        updated_at: new Date().toISOString()
      })
    }

    if (result.error) {
      return NextResponse.json(
        { error: `Failed to ${action} notifications: ${result.error.message}` },
        { status: 500 }
      )
    }

    const actionText = action === 'mark_read' ? 'marked as read' : 
                     action === 'mark_unread' ? 'marked as unread' : 'deleted'

    return NextResponse.json({
      success: true,
      message: `Notifications ${actionText}`,
      data: {
        affectedCount: result.count || 0
      }
    })

  } catch (error) {
    console.error('Notification update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function sendRealtimeNotifications(supabase: any, notifications: any[]) {
  try {
    // Send real-time updates via Supabase Realtime
    for (const notification of notifications) {
      await supabase.channel(`notifications:${notification.recipient_id}`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: notification
        })
    }
  } catch (error) {
    console.warn('Failed to send real-time notifications:', error)
  }
}

async function sendEmailNotifications(supabase: any, notifications: any[]) {
  try {
    // Get recipient email preferences
    const recipientIds = notifications.map(n => n.recipient_id)
    const { data: employees } = await supabase
      .from('employees')
      .select('id, email, notification_preferences')
      .in('id', recipientIds)

    const emailsToSend = []

    for (const notification of notifications) {
      const employee = employees?.find(e => e.id === notification.recipient_id)
      if (employee?.email) {
        const preferences = employee.notification_preferences || {}
        
        // Check if email notifications are enabled for this type
        if (preferences.email_enabled !== false && 
            preferences[`email_${notification.type}`] !== false) {
          
          emailsToSend.push({
            to: employee.email,
            subject: notification.title,
            body: notification.message,
            priority: notification.priority
          })
        }
      }
    }

    // Here you would integrate with your email service (Resend, SendGrid, etc.)
    if (emailsToSend.length > 0) {
      console.log(`Would send ${emailsToSend.length} email notifications`)
      // await emailService.sendBatch(emailsToSend)
    }

  } catch (error) {
    console.warn('Failed to send email notifications:', error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's employee record
    const { data: employee } = await supabase
      .from('employees')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const olderThanDays = parseInt(searchParams.get('olderThan') || '30')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', employee.id)
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      return NextResponse.json(
        { error: `Failed to clean up notifications: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Notifications older than ${olderThanDays} days have been deleted`
    })

  } catch (error) {
    console.error('Notification cleanup error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
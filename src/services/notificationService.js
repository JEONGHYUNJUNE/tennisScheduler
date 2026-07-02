import { supabase } from '../lib/supabase'

const missingNotificationTableCodes = new Set(['42P01', '42703'])

const selfActionNotificationTypes = new Set(['attendance_created', 'attendance_cancelled'])
const readNotificationVisibleDays = 30
const maxVisibleNotifications = 20
const notificationSelectColumns = 'id, type, title, message, event_id, free_opinion_id, free_opinion_comment_id, tennis_event_comment_id, tennis_diary_entry_id, tennis_diary_comment_id, tennis_diary_group_id, inquiry_id, inquiry_reply_id, actor_member_id, is_read, created_at'
const fallbackNotificationSelectColumns = 'id, type, title, message, event_id, actor_member_id, is_read, created_at'

export async function getNotifications(currentMemberId) {
  const readVisibleSince = new Date()
  readVisibleSince.setDate(readVisibleSince.getDate() - readNotificationVisibleDays)

  const result = await supabase
    .from('ot_notifications')
    .select(notificationSelectColumns)
    .order('created_at', { ascending: false })
    .limit(80)

  const { data, error } = result.error?.code === '42703'
    ? await supabase
      .from('ot_notifications')
      .select(fallbackNotificationSelectColumns)
      .order('created_at', { ascending: false })
      .limit(80)
    : result

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }

  return (data || [])
    .filter((notification) => {
      return !(notification.actor_member_id === currentMemberId && selfActionNotificationTypes.has(notification.type))
    })
    .filter((notification) => {
      if (!notification.is_read) return true
      return new Date(notification.created_at) >= readVisibleSince
    })
    .slice(0, maxVisibleNotifications)
}

export async function markNotificationsRead(notificationIds) {
  if (!notificationIds.length) return

  const { error } = await supabase
    .from('ot_notifications')
    .update({ is_read: true })
    .in('id', notificationIds)

  if (error) {
    if (missingNotificationTableCodes.has(error.code)) return
    throw error
  }
}

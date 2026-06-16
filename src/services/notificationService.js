import { supabase } from '../lib/supabase'

const missingNotificationTableCodes = new Set(['42P01', '42703'])

const selfActionNotificationTypes = new Set(['attendance_created', 'attendance_cancelled'])

export async function getNotifications(currentMemberId) {
  const { data, error } = await supabase
    .from('ot_notifications')
    .select('id, type, title, message, event_id, actor_member_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    if (missingNotificationTableCodes.has(error.code)) return []
    throw error
  }

  return (data || []).filter((notification) => {
    return !(notification.actor_member_id === currentMemberId && selfActionNotificationTypes.has(notification.type))
  })
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

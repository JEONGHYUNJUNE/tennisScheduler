import { supabase } from '../lib/supabase'
import { getNotificationPreferences } from './notificationPreferenceService'

const missingNotificationTableCodes = new Set(['42P01', '42703'])

const selfActionNotificationTypes = new Set(['attendance_created', 'attendance_cancelled'])
const hiddenMenuNotificationTypes = new Set([
  'chat_requested',
  'chat_message_created',
  'chat_message_reaction_created',
])
const readNotificationVisibleDays = 30
const maxVisibleNotifications = 20
const notificationSelectColumns = 'id, type, title, message, event_id, free_opinion_id, free_opinion_comment_id, tennis_event_comment_id, tennis_diary_entry_id, tennis_diary_comment_id, tennis_diary_group_id, chat_room_id, inquiry_id, inquiry_reply_id, actor_member_id, is_read, created_at'
const fallbackNotificationSelectColumns = 'id, type, title, message, event_id, actor_member_id, is_read, created_at'

function getNotificationCategory(notification) {
  const type = notification.type || ''
  if (notification.event_id || type.startsWith('tennis_event_')) return 'schedule'
  if (notification.chat_room_id || type.startsWith('chat_')) return 'chat'
  if (notification.inquiry_id || type.startsWith('member_inquiry_')) return 'inquiry'
  if (notification.tennis_diary_entry_id || notification.tennis_diary_comment_id || notification.tennis_diary_group_id || type.startsWith('tennis_diary_')) return 'diary'
  if (notification.free_opinion_id || notification.free_opinion_comment_id || type.startsWith('free_opinion_')) return 'social'
  if (['attendance_created', 'attendance_cancelled', 'waiting_promoted', 'event_created', 'event_updated', 'event_cancelled', 'event_reminder_day_before', 'event_reminder_today'].includes(type)) return 'schedule'
  return 'general'
}

function isNotificationPreferenceEnabled(notification, preferences) {
  const key = `${getNotificationCategory(notification)}_enabled`
  return preferences[key] !== false
}

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

  const preferences = await getNotificationPreferences(currentMemberId)

  return (data || [])
    .filter((notification) => {
      return !(notification.actor_member_id === currentMemberId && selfActionNotificationTypes.has(notification.type))
    })
    .filter((notification) => !hiddenMenuNotificationTypes.has(notification.type))
    .filter((notification) => isNotificationPreferenceEnabled(notification, preferences))
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

export async function getUnreadNotificationCount(currentMemberId) {
  const result = await supabase
    .from('ot_notifications')
    .select('id, type, actor_member_id, is_read')
    .eq('is_read', false)
    .limit(1000)

  const { data, error } = result.error?.code === '42703'
    ? await supabase
      .from('ot_notifications')
      .select('id, type, actor_member_id, is_read')
      .eq('is_read', false)
      .limit(1000)
    : result

  if (error) {
    if (missingNotificationTableCodes.has(error.code)) return 0
    throw error
  }

  const preferences = await getNotificationPreferences(currentMemberId)

  return (data || []).filter((notification) => {
    if (notification.actor_member_id === currentMemberId && selfActionNotificationTypes.has(notification.type)) {
      return false
    }
    return !hiddenMenuNotificationTypes.has(notification.type) && isNotificationPreferenceEnabled(notification, preferences)
  }).length
}

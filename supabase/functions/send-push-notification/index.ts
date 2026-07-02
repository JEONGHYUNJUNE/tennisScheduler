// @ts-nocheck
// Supabase Edge Function runs on Deno; IntelliJ's Node TypeScript checker does not resolve Deno npm: imports.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0'
import webpush from 'npm:web-push@3.6.7'

type NotificationRecord = {
  id: string
  recipient_member_id: string
  actor_member_id: string | null
  event_id: string | null
  free_opinion_id?: string | null
  free_opinion_comment_id?: string | null
  tennis_diary_entry_id?: string | null
  tennis_diary_comment_id?: string | null
  tennis_diary_group_id?: string | null
  chat_room_id?: string | null
  inquiry_id?: string | null
  inquiry_reply_id?: string | null
  type: string
  title: string
  message: string
  created_at: string
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const selfActionNotificationTypes = new Set(['attendance_created', 'attendance_cancelled'])

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    assertRequiredEnv()

    const payload = await request.json().catch(() => ({}))
    const notification = await resolveNotification(payload)

    if (!notification) {
      return jsonResponse({ ok: false, reason: 'notification-not-found' }, 404)
    }

    if (
      notification.actor_member_id === notification.recipient_member_id &&
      selfActionNotificationTypes.has(notification.type)
    ) {
      return jsonResponse({ ok: true, skipped: true, reason: 'self-action' })
    }

    const subscriptions = await getSubscriptions(notification.recipient_member_id)
    const results = await Promise.allSettled(
      subscriptions.map((subscription) => sendPush(subscription, notification)),
    )

    await deactivateExpiredSubscriptions(subscriptions, results)

    return jsonResponse({
      ok: true,
      notification_id: notification.id,
      sent: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
    })
  } catch (error) {
    console.error(error)
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})

async function resolveNotification(payload: Record<string, unknown>) {
  const record = payload.record as NotificationRecord | undefined
  const notificationId = record?.id || payload.notification_id || payload.id
  if (!notificationId || typeof notificationId !== 'string') return null

  const result = await getSupabase()
    .from('ot_notifications')
    .select('id, recipient_member_id, actor_member_id, event_id, free_opinion_id, free_opinion_comment_id, tennis_diary_entry_id, tennis_diary_comment_id, tennis_diary_group_id, chat_room_id, inquiry_id, inquiry_reply_id, type, title, message, created_at')
    .eq('id', notificationId)
    .single()

  const { data, error } = result.error?.code === '42703'
    ? await getSupabase()
      .from('ot_notifications')
      .select('id, recipient_member_id, actor_member_id, event_id, type, title, message, created_at')
      .eq('id', notificationId)
      .single()
    : result

  if (error) throw error
  return data as NotificationRecord
}

async function getSubscriptions(memberId: string) {
  const { data, error } = await getSupabase()
    .from('ot_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('member_id', memberId)
    .eq('is_active', true)

  if (error) throw error
  return (data || []) as PushSubscriptionRow[]
}

async function sendPush(subscription: PushSubscriptionRow, notification: NotificationRecord) {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@ot-tennis.app',
    Deno.env.get('VAPID_PUBLIC_KEY') || '',
    Deno.env.get('VAPID_PRIVATE_KEY') || '',
  )

  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  const url = getNotificationUrl(appUrl, notification)
  const body = getNotificationBody(notification)

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify({
      title: notification.title,
      body,
      url,
      notificationId: notification.id,
      tag: `ot-${notification.id}`,
    }),
  )
}

function getNotificationUrl(appUrl: string, notification: NotificationRecord) {
  if (notification.event_id) return `${appUrl}/#/events/${notification.event_id}`
  if (
    notification.type === 'free_opinion_created' ||
    notification.type === 'free_opinion_comment_created' ||
    notification.type === 'free_opinion_comment_reply_created' ||
    notification.type === 'free_opinion_comment_liked' ||
    notification.type === 'free_opinion_mention' ||
    notification.type === 'free_opinion_comment_mention'
  ) {
    const params = new URLSearchParams()
    if (notification.free_opinion_id) params.set('opinion', notification.free_opinion_id)
    if (notification.free_opinion_comment_id) params.set('comment', notification.free_opinion_comment_id)
    const query = params.toString()
    return `${appUrl}/#/free-opinions${query ? `?${query}` : ''}`
  }
  if (
    notification.type === 'member_inquiry_created' ||
    notification.type === 'member_inquiry_replied' ||
    notification.type === 'member_inquiry_followed_up'
  ) {
    const params = new URLSearchParams({ inquiryTab: 'inbox' })
    if (notification.inquiry_id) params.set('inquiry', notification.inquiry_id)
    return `${appUrl}/#/mypage?${params.toString()}`
  }
  if (
    notification.type === 'tennis_diary_comment_created' ||
    notification.type === 'tennis_diary_comment_reply_created' ||
    notification.type === 'tennis_diary_liked' ||
    notification.type === 'tennis_diary_comment_liked' ||
    notification.type === 'tennis_diary_entry_mention' ||
    notification.type === 'tennis_diary_comment_mention'
  ) {
    const params = new URLSearchParams()
    if (notification.tennis_diary_entry_id) params.set('entry', notification.tennis_diary_entry_id)
    if (notification.tennis_diary_comment_id) params.set('comment', notification.tennis_diary_comment_id)
    const query = params.toString()
    return `${appUrl}/#/diary${query ? `?${query}` : ''}`
  }
  if (notification.type === 'tennis_diary_group_invited') {
    const params = new URLSearchParams({ diaryTab: 'invites' })
    if (notification.tennis_diary_group_id) params.set('diaryGroup', notification.tennis_diary_group_id)
    return `${appUrl}/#/mypage?${params.toString()}`
  }
  if (
    notification.type === 'chat_requested' ||
    notification.type === 'chat_message_created'
  ) {
    return `${appUrl}/#/chats${notification.chat_room_id ? `/${notification.chat_room_id}` : ''}`
  }
  return `${appUrl}/#/`
}

function getNotificationBody(notification: NotificationRecord) {
  if (
    notification.type !== 'free_opinion_comment_created' &&
    notification.type !== 'free_opinion_comment_reply_created' &&
    notification.type !== 'tennis_diary_comment_created' &&
    notification.type !== 'tennis_diary_comment_reply_created' &&
    notification.type !== 'free_opinion_mention' &&
    notification.type !== 'free_opinion_comment_mention' &&
    notification.type !== 'tennis_diary_entry_mention' &&
    notification.type !== 'tennis_diary_comment_mention' &&
    notification.type !== 'member_inquiry_created' &&
    notification.type !== 'member_inquiry_replied' &&
    notification.type !== 'member_inquiry_followed_up'
  ) {
    return notification.message
  }

  const match = notification.message.match(/^(.*?:\s*)(.*)$/s)
  if (!match) return notification.message

  const preview = getPreviewText(match[2])
  return `${match[1]}${preview}`
}

function getPreviewText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 10) return normalized
  return `${normalized.slice(0, 10)}…`
}

async function deactivateExpiredSubscriptions(
  subscriptions: PushSubscriptionRow[],
  results: PromiseSettledResult<unknown>[],
) {
  const expiredIds = subscriptions
    .filter((_, index) => {
      const result = results[index]
      if (result.status !== 'rejected') return false

      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      return statusCode === 404 || statusCode === 410
    })
    .map((subscription) => subscription.id)

  if (!expiredIds.length) return

  const { error } = await getSupabase()
    .from('ot_push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in('id', expiredIds)

  if (error) throw error
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SERVICE_ROLE_KEY') || '',
    {
      auth: {
        persistSession: false,
      },
    },
  )
}

function assertRequiredEnv() {
  const requiredKeys = ['SUPABASE_URL', 'SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'APP_URL']
  const missingKeys = requiredKeys.filter((key) => !Deno.env.get(key))

  if (missingKeys.length) {
    throw new Error(`Missing env: ${missingKeys.join(', ')}`)
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

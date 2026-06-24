import { supabase } from '../lib/supabase'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function isPushSupported() {
  return Boolean(
    window.isSecureContext &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  )
}

export function hasVapidPublicKey() {
  return Boolean(vapidPublicKey)
}

export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) return 'unsupported'
  if (!hasVapidPublicKey()) return 'missing-key'
  if (Notification.permission === 'denied') return 'denied'

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()

  if (subscription) return 'subscribed'
  return Notification.permission === 'granted' ? 'unsubscribed' : 'default'
}

export async function syncExistingPushSubscription(memberId) {
  if (!isPushSupported() || !hasVapidPublicKey()) return null

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()

  if (!subscription) return null

  await savePushSubscription(memberId, subscription)
  return subscription
}

export async function subscribeToPushNotifications(memberId) {
  if (!isPushSupported()) throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.')
  if (!hasVapidPublicKey()) throw new Error('VITE_VAPID_PUBLIC_KEY가 설정되지 않았습니다.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('알림 권한이 허용되지 않았습니다.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  const readyRegistration = await navigator.serviceWorker.ready
  const activeRegistration = readyRegistration || registration
  const existingSubscription = await activeRegistration.pushManager.getSubscription()
  const subscription = existingSubscription || await activeRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  await savePushSubscription(memberId, subscription)
  return subscription
}

export async function unsubscribeFromPushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()

  if (!subscription) return

  await supabase
    .from('ot_push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint)

  await subscription.unsubscribe()
}

async function savePushSubscription(memberId, subscription) {
  const subscriptionJson = subscription.toJSON()
  const keys = subscriptionJson.keys || {}

  const { error } = await supabase
    .from('ot_push_subscriptions')
    .upsert(
      {
        member_id: memberId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

  if (error) throw error
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

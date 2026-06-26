const appIconUrl = '/pwa-icon.svg'
const notificationBadgeUrl = '/notification-badge.svg'

self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {
      title: 'ONS Tennis',
      body: event.data?.text() || '새 알림이 있습니다.',
    }
  }

  const title = payload.title || 'ONS Tennis'
  const options = {
    body: payload.body || payload.message || '새 알림이 있습니다.',
    badge: payload.badge || notificationBadgeUrl,
    icon: payload.icon || appIconUrl,
    data: {
      url: payload.url || '/#/',
      notificationId: payload.notificationId || null,
    },
    tag: payload.tag || payload.notificationId || 'ons-tennis-notification',
    renotify: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/#/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const sameOriginClient = clientList.find((client) => new URL(client.url).origin === self.location.origin)

      if (sameOriginClient) {
        return sameOriginClient.focus().then(() => sameOriginClient.navigate(targetUrl))
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})

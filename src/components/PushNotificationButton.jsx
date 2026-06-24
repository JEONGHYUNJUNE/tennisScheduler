import { useEffect, useState } from 'react'
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeToPushNotifications,
  syncExistingPushSubscription,
  unsubscribeFromPushNotifications,
} from '../services/pushService'

const statusLabels = {
  default: '푸시켜기',
  unsubscribed: '푸시켜기',
  subscribed: '푸시ON',
  denied: '푸시차단',
  unsupported: '푸시불가',
  'missing-key': '푸시준비',
}

export default function PushNotificationButton({ profile }) {
  const [status, setStatus] = useState('unsupported')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    if (!profile?.id || !isPushSupported()) {
      setStatus('unsupported')
      return undefined
    }

    getPushSubscriptionStatus()
      .then((nextStatus) => {
        if (ignore) return
        setStatus(nextStatus)
        if (nextStatus === 'subscribed') {
          syncExistingPushSubscription(profile.id).catch((err) => {
            if (!ignore) setMessage(err.message)
          })
        }
      })
      .catch(() => {
        if (!ignore) setStatus('unsupported')
      })

    return () => {
      ignore = true
    }
  }, [profile?.id])

  if (status === 'unsupported') return null

  const handleClick = async () => {
    if (status === 'unsupported' || status === 'missing-key' || status === 'denied') return

    setIsBusy(true)
    setMessage('')

    try {
      if (status === 'subscribed') {
        await unsubscribeFromPushNotifications()
        setStatus(await getPushSubscriptionStatus())
        setMessage('푸시 알림을 껐습니다.')
      } else {
        await subscribeToPushNotifications(profile.id)
        setStatus('subscribed')
        setMessage('푸시 알림을 켰습니다.')
      }
    } catch (err) {
      setMessage(err.message)
      setStatus(await getPushSubscriptionStatus().catch(() => status))
    } finally {
      setIsBusy(false)
    }
  }

  const title = message || {
    subscribed: '클릭하면 이 기기의 푸시 알림을 끕니다.',
    unsupported: '이 브라우저 또는 현재 실행 환경에서는 웹 푸시를 지원하지 않습니다.',
    denied: '브라우저 설정에서 알림 권한을 다시 허용해야 합니다.',
    'missing-key': 'VITE_VAPID_PUBLIC_KEY 설정이 필요합니다.',
  }[status] || '이 기기에서 푸시 알림을 켭니다.'

  return (
    <button
      className={`push-toggle ${status === 'subscribed' ? 'enabled' : ''}`}
      type="button"
      onClick={handleClick}
      disabled={isBusy || status === 'unsupported' || status === 'missing-key' || status === 'denied'}
      title={title}
    >
      {isBusy ? '처리중' : statusLabels[status]}
    </button>
  )
}

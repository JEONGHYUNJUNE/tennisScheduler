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

function isStandaloneApp() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent)
}

export default function PushNotificationButton({ profile }) {
  const [status, setStatus] = useState('unsupported')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneApp())
  const isIos = isIosDevice()
  const isAndroid = isAndroidDevice()

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

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

  const shouldShowInstallGuide = !isStandalone && (isIos || isAndroid)

  const handleInstall = async () => {
    if (isIos) {
      setMessage('Safari 공유 버튼 → 홈 화면에 추가 후 앱 아이콘으로 실행해주세요.')
      setShowInstallGuide(true)
      return
    }

    if (!installPrompt) {
      setMessage('브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해주세요.')
      setShowInstallGuide(true)
      return
    }

    installPrompt.prompt()
    await installPrompt.userChoice.catch(() => null)
    setInstallPrompt(null)
    setIsStandalone(isStandaloneApp())
  }

  if (shouldShowInstallGuide) {
    return (
      <div className="install-guide-wrap">
        <button
          className="push-toggle install-toggle"
          type="button"
          onClick={handleInstall}
          title={message || (isIos ? '공유 버튼 → 홈 화면에 추가 후 푸시 알림을 사용할 수 있습니다.' : '앱 설치 후 푸시 알림을 켤 수 있습니다.')}
        >
          {isIos ? '앱추가' : '앱설치'}
        </button>
        {showInstallGuide && (
          <div className="install-guide-panel" role="status">
            <button type="button" aria-label="설치 안내 닫기" onClick={() => setShowInstallGuide(false)}>×</button>
            <strong>{isIos ? 'iPhone 알림 사용 방법' : '앱 설치 안내'}</strong>
            <p>{message}</p>
            {isIos && <small>공유 아이콘은 Safari 하단 또는 상단 주소창 근처에 있어요.</small>}
          </div>
        )}
      </div>
    )
  }

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

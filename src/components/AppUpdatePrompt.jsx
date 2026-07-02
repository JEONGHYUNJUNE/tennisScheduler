import { useCallback, useEffect, useRef, useState } from 'react'

const DIARY_RELEASE_NOTICE_KEY = 'ons-tennis-release-notice-diary-20260702'
const UPDATE_PROMPT_ENABLED = import.meta.env.VITE_UPDATE_PROMPT_ENABLED === 'true'
const DIARY_RELEASE_NOTICE_ENABLED = import.meta.env.VITE_DIARY_RELEASE_NOTICE_ENABLED !== 'false'

function getAssetSignature(documentLike = document) {
  return Array.from(documentLike.querySelectorAll('script[src], link[rel="stylesheet"][href]'))
    .map((element) => element.getAttribute('src') || element.getAttribute('href'))
    .filter((assetPath) => assetPath?.includes('/assets/'))
    .map((assetPath) => new URL(assetPath, window.location.origin).pathname)
    .sort()
    .join('|')
}

export default function AppUpdatePrompt() {
  const currentSignatureRef = useRef('')
  const checkingRef = useRef(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showDiaryNotice, setShowDiaryNotice] = useState(false)

  const checkForUpdate = useCallback(async () => {
    if (!UPDATE_PROMPT_ENABLED || !import.meta.env.PROD || checkingRef.current || updateAvailable) return

    checkingRef.current = true

    try {
      const response = await fetch(`/?update-check=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      const html = await response.text()
      const nextDocument = new DOMParser().parseFromString(html, 'text/html')
      const nextSignature = getAssetSignature(nextDocument)

      if (nextSignature && currentSignatureRef.current && nextSignature !== currentSignatureRef.current) {
        setUpdateAvailable(true)
      }
    } catch {
      // 업데이트 확인 실패는 사용 흐름을 막지 않습니다.
    } finally {
      checkingRef.current = false
    }
  }, [updateAvailable])

  useEffect(() => {
    currentSignatureRef.current = getAssetSignature()

    if (
      DIARY_RELEASE_NOTICE_ENABLED &&
      import.meta.env.PROD &&
      window.localStorage.getItem(DIARY_RELEASE_NOTICE_KEY) !== 'seen'
    ) {
      setShowDiaryNotice(true)
    }

    if (!UPDATE_PROMPT_ENABLED || !import.meta.env.PROD) return undefined

    const intervalId = window.setInterval(checkForUpdate, 60000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }

    window.addEventListener('focus', checkForUpdate)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    checkForUpdate()

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkForUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForUpdate])

  const handleDiaryNoticeClose = () => {
    window.localStorage.setItem(DIARY_RELEASE_NOTICE_KEY, 'seen')
    setShowDiaryNotice(false)
  }

  if (!updateAvailable && !showDiaryNotice) return null

  return (
    <div className="app-update-overlay" role="alertdialog" aria-modal="true" aria-labelledby="app-update-title">
      <section className="app-update-card">
        <div className="app-update-ball" aria-hidden="true" />
        {showDiaryNotice ? (
          <>
            <p className="eyebrow">NEW</p>
            <h2 id="app-update-title">테니스 다이어리가 추가됐습니다</h2>
            <p>날짜별 기록, 사진 첨부, 공개 범위와 그룹다이어리까지 사용할 수 있어요.</p>
            <button type="button" onClick={handleDiaryNoticeClose}>
              확인
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">UPDATE</p>
            <h2 id="app-update-title">새 버전이 준비됐습니다</h2>
            <p>최신 화면으로 적용하려면 앱을 새로고침해 주세요.</p>
            <button type="button" onClick={() => window.location.reload()}>
              업데이트하기
            </button>
          </>
        )}
      </section>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'

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

  const checkForUpdate = useCallback(async () => {
    if (!import.meta.env.PROD || checkingRef.current || updateAvailable) return

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
    if (!import.meta.env.PROD) return undefined

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

  if (!updateAvailable) return null

  return (
    <div className="app-update-overlay" role="alertdialog" aria-modal="true" aria-labelledby="app-update-title">
      <section className="app-update-card">
        <div className="app-update-ball" aria-hidden="true" />
        <p className="eyebrow">UPDATE</p>
        <h2 id="app-update-title">새 버전이 준비됐습니다</h2>
        <p>최신 화면으로 적용하려면 앱을 새로고침해 주세요.</p>
        <button type="button" onClick={() => window.location.reload()}>
          업데이트하기
        </button>
      </section>
    </div>
  )
}

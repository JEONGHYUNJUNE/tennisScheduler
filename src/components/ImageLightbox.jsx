import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

const MIME_EXTENSION_MAP = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function hasImageExtension(fileName) {
  return /\.(gif|jpe?g|png|webp)$/i.test(fileName)
}

function getDownloadName(src, alt) {
  try {
    const url = new URL(src)
    const lastSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '')
    if (lastSegment && hasImageExtension(lastSegment)) return lastSegment
  } catch {
    // Ignore invalid URL-like strings and fall back to the visible label.
  }

  const cleanAlt = String(alt || 'image')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
  return cleanAlt || 'image'
}

function withBlobExtension(fileName, mimeType) {
  if (hasImageExtension(fileName)) return fileName
  const extension = MIME_EXTENSION_MAP[mimeType] || 'jpg'
  return `${fileName}.${extension}`
}

export default function ImageLightbox({ src, alt = '첨부 이미지', className = '', children }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const downloadName = useMemo(() => getDownloadName(src, alt), [src, alt])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!src) return null

  const handleSave = async (event) => {
    event.stopPropagation()
    if (saving) return

    setSaving(true)
    try {
      const response = await fetch(src, { mode: 'cors' })
      if (!response.ok) throw new Error('이미지를 불러오지 못했습니다.')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = withBlobExtension(downloadName, blob.type)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer')
    } finally {
      setSaving(false)
    }
  }

  const lightbox = open ? createPortal(
    <div className="image-lightbox-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <button type="button" className="image-lightbox-close" onClick={() => setOpen(false)} aria-label="이미지 닫기">
        ×
      </button>
      <figure
        className="image-lightbox-stage"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <img src={src} alt={alt} />
        <figcaption>이미지를 저장하려면 아래 버튼을 눌러주세요.</figcaption>
      </figure>
      <button type="button" className="image-lightbox-save" onClick={handleSave} disabled={saving}>
        {saving ? '준비 중...' : '기기에 저장'}
      </button>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button type="button" className={className || 'image-lightbox-trigger'} onClick={() => setOpen(true)}>
        {children || <img src={src} alt={alt} />}
      </button>
      {lightbox}
    </>
  )
}

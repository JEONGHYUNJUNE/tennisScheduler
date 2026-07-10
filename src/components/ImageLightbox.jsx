import { useEffect, useMemo, useRef, useState } from 'react'
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

export default function ImageLightbox({ src, alt = '첨부 이미지', className = '', children, onLoad }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewerTransform, setViewerTransform] = useState({ scale: 1, x: 0, y: 0 })
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
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

  useEffect(() => {
    if (!open) return
    setViewerTransform({ scale: 1, x: 0, y: 0 })
    pointersRef.current.clear()
    gestureRef.current = null
  }, [open, src])

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

  const getPointerList = () => [...pointersRef.current.values()]
  const getDistance = (first, second) => Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
  const getCenter = (first, second) => ({
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  })

  const handleViewerPointerDown = (event) => {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })

    const pointers = getPointerList()
    if (pointers.length === 2) {
      const center = getCenter(pointers[0], pointers[1])
      gestureRef.current = {
        type: 'pinch',
        distance: getDistance(pointers[0], pointers[1]),
        center,
        scale: viewerTransform.scale,
        x: viewerTransform.x,
        y: viewerTransform.y,
      }
      return
    }

    if (pointers.length === 1 && viewerTransform.scale > 1) {
      gestureRef.current = {
        type: 'pan',
        clientX: event.clientX,
        clientY: event.clientY,
        x: viewerTransform.x,
        y: viewerTransform.y,
      }
    }
  }

  const handleViewerPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return
    event.stopPropagation()
    event.preventDefault()
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })

    const pointers = getPointerList()
    const gesture = gestureRef.current
    if (pointers.length === 2 && gesture?.type === 'pinch') {
      const center = getCenter(pointers[0], pointers[1])
      const nextScale = Math.min(4, Math.max(1, gesture.scale * (getDistance(pointers[0], pointers[1]) / Math.max(1, gesture.distance))))
      setViewerTransform({
        scale: nextScale,
        x: nextScale <= 1 ? 0 : gesture.x + center.x - gesture.center.x,
        y: nextScale <= 1 ? 0 : gesture.y + center.y - gesture.center.y,
      })
      return
    }

    if (pointers.length === 1 && gesture?.type === 'pan') {
      setViewerTransform((current) => {
        if (current.scale <= 1) return { scale: 1, x: 0, y: 0 }
        return {
          ...current,
          x: gesture.x + event.clientX - gesture.clientX,
          y: gesture.y + event.clientY - gesture.clientY,
        }
      })
    }
  }

  const handleViewerPointerEnd = (event) => {
    event.stopPropagation()
    pointersRef.current.delete(event.pointerId)
    gestureRef.current = null
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
        onPointerDown={handleViewerPointerDown}
        onPointerMove={handleViewerPointerMove}
        onPointerUp={handleViewerPointerEnd}
        onPointerCancel={handleViewerPointerEnd}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate(${viewerTransform.x}px, ${viewerTransform.y}px) scale(${viewerTransform.scale})`,
          }}
        />
        <figcaption>저장하려면 이미지를 꾹 누르거나 아래 버튼을 눌러주세요.</figcaption>
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
        {children || <img src={src} alt={alt} onLoad={onLoad} />}
      </button>
      {lightbox}
    </>
  )
}

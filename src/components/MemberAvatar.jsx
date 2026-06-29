import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function MemberAvatar({ name, imageUrl, className = '', size = 'md', previewable = false }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const initial = name?.trim()?.slice(0, 1) || '?'
  const classes = ['member-avatar', `member-avatar-${size}`, className].filter(Boolean).join(' ')
  const content = imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <b>{initial}</b>

  if (previewable) {
    return (
      <>
        <button
          className={`${classes} member-avatar-clickable`}
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`${name || '회원'} 프로필 사진 크게 보기`}
        >
          {content}
        </button>

        {previewOpen && createPortal((
          <div className="avatar-viewer-backdrop" role="presentation" onMouseDown={() => setPreviewOpen(false)}>
            <div className="avatar-viewer" role="dialog" aria-modal="true" aria-label="프로필 사진 미리보기" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="inquiry-close-button" onClick={() => setPreviewOpen(false)} aria-label="프로필 사진 닫기">×</button>
              <span className="avatar-viewer-image">
                {imageUrl ? <img src={imageUrl} alt="" /> : <b>{initial}</b>}
              </span>
              <strong>{name || '회원'}</strong>
            </div>
          </div>
        ), document.body)}
      </>
    )
  }

  return (
    <span className={classes} aria-hidden="true">
      {content}
    </span>
  )
}

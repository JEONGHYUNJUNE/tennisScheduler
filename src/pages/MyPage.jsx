import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import { getMyUpcomingEvents } from '../services/eventService'
import { createInquiry, deleteInquiry, deleteInquiryReply, getAdminInquiries, getMyInquiries, replyToInquiry } from '../services/inquiryService'
import { updateProfileAvatar } from '../services/profileService'

const formatDate = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${dateText}T00:00:00`))
}

function formatTennisExperience(startDate) {
  if (!startDate) return '-'

  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  if (Number.isNaN(start.getTime()) || start > today) return '-'

  let months = (today.getFullYear() - start.getFullYear()) * 12
  months += today.getMonth() - start.getMonth()
  if (today.getDate() < start.getDate()) months -= 1
  months = Math.max(months, 0)

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths}개월`
  if (remainingMonths === 0) return `${years}년`
  return `${years}년 ${remainingMonths}개월`
}

export default function MyPage() {
  const { profile, refreshProfile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [myEvents, setMyEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [eventError, setEventError] = useState('')
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  useEffect(() => {
    if (!profile?.id) return undefined

    let ignore = false

    setLoadingEvents(true)
    setEventError('')

    getMyUpcomingEvents(profile.id)
      .then((events) => {
        if (!ignore) setMyEvents(events)
      })
      .catch((err) => {
        if (!ignore) setEventError(err.message)
      })
      .finally(() => {
        if (!ignore) setLoadingEvents(false)
      })

    return () => {
      ignore = true
    }
  }, [profile?.id])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('inquiry') || params.get('inquiryTab') === 'inbox') {
      setInquiryOpen(true)
    }
  }, [location.search])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <section className="my-page-shell">
      <div className="my-page-card">
        <div className="my-page-profile">
          <button className="my-page-avatar-button" type="button" onClick={() => setAvatarOpen(true)} aria-label="프로필 사진 설정">
            <MemberAvatar name={profile?.name} imageUrl={profile?.avatar_url} size="xl" />
            <span>변경</span>
          </button>
          <div>
            <p className="eyebrow">MY PAGE</p>
            <h1>{profile?.name || '회원'}님</h1>
            <span>{profile?.user_id || '-'}</span>
          </div>
        </div>

        <dl className="profile-list my-page-list">
          <div><dt>이름</dt><dd>{profile?.name || '-'}</dd></div>
          <div><dt>아이디</dt><dd>{profile?.user_id || '-'}</dd></div>
          <div><dt>권한</dt><dd>{profile?.role || 'member'}</dd></div>
          <div><dt>테니스 시작일</dt><dd>{profile?.tennis_start_date || '-'}</dd></div>
          <div><dt>구력</dt><dd>{formatTennisExperience(profile?.tennis_start_date)}</dd></div>
        </dl>

        <button className="danger-button my-page-logout" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      <div className="my-page-card my-page-events-card">
        <div className="my-page-section-head">
          <div>
            <p className="eyebrow">MY SCHEDULE</p>
            <h2>참석 예정 일정</h2>
          </div>
          <Link to="/events">모든 일정 보기</Link>
        </div>

        <div className="my-event-list my-page-event-list">
          {loadingEvents && <LoadingState message="참석 일정을 불러오는 중입니다." variant="inline" />}
          {eventError && <p className="notification-empty">{eventError}</p>}
          {!loadingEvents && !eventError && myEvents.length === 0 && (
            <EmptyState
              compact
              title="참석 예정 일정이 없어요."
              description="참가 일정은 여기에 모아둘게요."
            />
          )}
          {myEvents.map((event) => {
            const mine = event.tennis_attendances?.find((attendance) => attendance.member_id === profile.id)
            return (
              <Link key={event.id} to={`/events/${event.id}`}>
                <strong>{event.title}</strong>
                <span>{formatDate(event.event_date)} {event.start_time?.slice(0, 5)}</span>
                <em>{mine?.status === 'waiting' ? '대기' : '참석'}</em>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="my-page-card my-page-inquiry-card">
        <div className="my-page-section-head">
          <div>
            <p className="eyebrow">SUPPORT</p>
            <h2>문의하기</h2>
          </div>
        </div>
        <p>app이나 운영 문의 및 건의사항이 있으면 남겨주세요.</p>
        <button className="primary-button inquiry-open-button" type="button" onClick={() => setInquiryOpen(true)}>
          문의하기
        </button>
      </div>

      {inquiryOpen && (
        <InquiryModal
          initialTab={new URLSearchParams(location.search).get('inquiryTab') === 'inbox' || new URLSearchParams(location.search).get('inquiry') ? 'inbox' : 'write'}
          highlightedInquiryId={new URLSearchParams(location.search).get('inquiry') || ''}
          profile={profile}
          onClose={() => {
            setInquiryOpen(false)
            if (location.search) navigate('/mypage', { replace: true })
          }}
        />
      )}

      {avatarOpen && (
        <AvatarModal
          profile={profile}
          onClose={() => setAvatarOpen(false)}
          onSaved={async () => {
            await refreshProfile()
            setAvatarOpen(false)
          }}
        />
      )}
    </section>
  )
}

function AvatarModal({ profile, onClose, onSaved }) {
  const cropStageSize = 236
  const outputSize = 512
  const dragRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSize, setImageSize] = useState(null)
  const [avatarScale, setAvatarScale] = useState(1)
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    setImageSize(null)
    setAvatarScale(1)
    setAvatarOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    if (!previewUrl) return undefined

    const image = new Image()
    image.onload = () => {
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      setError('이미지를 불러오지 못했습니다.')
    }
    image.src = previewUrl

    return () => {
      image.onload = null
      image.onerror = null
    }
  }, [previewUrl])

  const getCoverSize = useCallback((scale = avatarScale) => {
    if (!imageSize) return { width: cropStageSize, height: cropStageSize }

    const aspectRatio = imageSize.width / imageSize.height
    const baseWidth = aspectRatio >= 1 ? cropStageSize * aspectRatio : cropStageSize
    const baseHeight = aspectRatio >= 1 ? cropStageSize : cropStageSize / aspectRatio

    return {
      width: baseWidth * scale,
      height: baseHeight * scale,
    }
  }, [avatarScale, imageSize])

  const clampAvatarOffset = useCallback((nextOffset, scale = avatarScale) => {
    const displaySize = getCoverSize(scale)
    const maxX = Math.max(0, (displaySize.width - cropStageSize) / 2)
    const maxY = Math.max(0, (displaySize.height - cropStageSize) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
      y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
    }
  }, [avatarScale, getCoverSize])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setError('')
    if (!file) {
      setImageFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 선택해 주세요.')
      setImageFile(null)
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('프로필 이미지는 12MB 이하만 가능합니다.')
      setImageFile(null)
      return
    }
    setImageFile(file)
  }

  const handleCropPointerDown = (event) => {
    if (!previewUrl) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: avatarOffset,
    }
  }

  const handleCropPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    setAvatarOffset(clampAvatarOffset({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    }))
  }

  const handleCropPointerEnd = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
    }
  }

  const handleScaleChange = (event) => {
    const nextScale = Number(event.target.value)
    setAvatarScale(nextScale)
    setAvatarOffset((current) => clampAvatarOffset(current, nextScale))
  }

  const createCroppedAvatarBlob = async () => {
    if (!previewUrl || !imageSize) throw new Error('프로필 이미지를 다시 선택해 주세요.')

    const image = new Image()

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
      image.src = previewUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const context = canvas.getContext('2d')
    const ratio = outputSize / cropStageSize
    const aspectRatio = imageSize.width / imageSize.height
    const baseWidth = aspectRatio >= 1 ? outputSize * aspectRatio : outputSize
    const baseHeight = aspectRatio >= 1 ? outputSize : outputSize / aspectRatio
    const drawWidth = baseWidth * avatarScale
    const drawHeight = baseHeight * avatarScale
    const drawX = (outputSize - drawWidth) / 2 + avatarOffset.x * ratio
    const drawY = (outputSize - drawHeight) / 2 + avatarOffset.y * ratio

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, outputSize, outputSize)
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('프로필 이미지를 편집하지 못했습니다.'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.88)
    })
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!imageFile) return

    setSaving(true)
    setError('')
    try {
      const avatarBlob = await createCroppedAvatarBlob()
      await updateProfileAvatar({
        memberId: profile.id,
        imageFile,
        avatarBlob,
        currentAvatarPath: profile.avatar_path,
      })
      await onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal((
    <div className="avatar-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-title" onSubmit={handleSave} onMouseDown={(event) => event.stopPropagation()}>
        <div className="avatar-modal-head">
          <div>
            <p className="eyebrow">PROFILE</p>
            <h2 id="avatar-title">프로필 사진</h2>
          </div>
          <button type="button" className="inquiry-close-button" onClick={onClose} aria-label="프로필 사진 설정 닫기">×</button>
        </div>

        <div className="avatar-preview">
          {previewUrl ? (
            <>
              <div
                className="avatar-crop-stage"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerEnd}
                onPointerCancel={handleCropPointerEnd}
              >
                <img
                  src={previewUrl}
                  alt=""
                  draggable="false"
                  style={{
                    width: `${getCoverSize().width}px`,
                    height: `${getCoverSize().height}px`,
                    transform: `translate(-50%, -50%) translate(${avatarOffset.x}px, ${avatarOffset.y}px)`,
                  }}
                />
              </div>
              <div className="avatar-editor-controls">
                <span>크기</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={avatarScale}
                  onChange={handleScaleChange}
                  aria-label="프로필 사진 확대 축소"
                />
              </div>
              <p>드래그해서 위치를 맞추고 크기를 조정해 주세요.</p>
            </>
          ) : (
            <>
              <MemberAvatar name={profile?.name} imageUrl={profile?.avatar_url} size="preview" />
              <p>사진을 선택하면 원형 미리보기에서 편집할 수 있어요.</p>
            </>
          )}
        </div>

        <label className="avatar-file-field">
          <span>이미지 선택</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <em>{imageFile ? imageFile.name : '앨범에서 프로필 사진을 선택해 주세요.'}</em>
        </label>

        {error && <p className="inquiry-alert error">{error}</p>}

        <button className="primary-button avatar-save-button" type="submit" disabled={saving || !imageFile}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  ), document.body)
}

function InquiryModal({ highlightedInquiryId = '', initialTab = 'write', profile, onClose }) {
  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})

  const loadInquiries = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError('')
    try {
      const items = isAdmin ? await getAdminInquiries() : await getMyInquiries(profile.id)
      setInquiries(items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, isAdmin])

  useEffect(() => {
    loadInquiries()
  }, [loadInquiries])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!highlightedInquiryId || activeTab !== 'inbox' || loading || inquiries.length === 0) return undefined

    const timer = window.setTimeout(() => {
      const target = document.querySelector(`[data-inquiry-id="${highlightedInquiryId}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)

    return () => window.clearTimeout(timer)
  }, [activeTab, highlightedInquiryId, inquiries.length, loading])

  useEffect(() => {
    if (!success) return undefined

    const timer = window.setTimeout(() => {
      setSuccess('')
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return undefined
    }

    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await createInquiry({ memberId: profile.id, message, imageFile })
      setMessage('')
      setImageFile(null)
      setSuccess('관리자에게 전달되었습니다.')
      setActiveTab('inbox')
      await loadInquiries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (inquiryId) => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await replyToInquiry({
        inquiryId,
        senderMemberId: profile.id,
        senderRole: isAdmin ? 'admin' : 'member',
        message: replyDrafts[inquiryId] || '',
      })
      setReplyDrafts((current) => ({ ...current, [inquiryId]: '' }))
      setSuccess(isAdmin ? '답변을 남겼습니다.' : '댓글을 남겼습니다.')
      await loadInquiries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteInquiry = async (inquiry) => {
    if (!window.confirm('문의와 연결된 답변을 모두 삭제할까요?')) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await deleteInquiry(inquiry)
      setSuccess('문의가 삭제되었습니다.')
      await loadInquiries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('이 내용을 삭제할까요?')) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await deleteInquiryReply(replyId)
      setSuccess('삭제되었습니다.')
      await loadInquiries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal((
    <div className="inquiry-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="inquiry-modal-head">
          <div>
            <p className="eyebrow">SUPPORT</p>
            <h2 id="inquiry-title">문의하기</h2>
          </div>
          <button type="button" className="inquiry-close-button" onClick={onClose} aria-label="문의창 닫기">×</button>
        </div>

        <div className="inquiry-tabs" role="tablist" aria-label="문의 메뉴">
          <button type="button" className={activeTab === 'write' ? 'active' : ''} onClick={() => setActiveTab('write')}>문의하기</button>
          <button type="button" className={activeTab === 'inbox' ? 'active' : ''} onClick={() => setActiveTab('inbox')}>
            답변함
            {inquiries.length > 0 && <span>{inquiries.length}</span>}
          </button>
        </div>

        {error && <p className="inquiry-alert error">{error}</p>}
        {success && <p className="inquiry-alert success">{success}</p>}

        {activeTab === 'write' ? (
          <form className="inquiry-form" onSubmit={handleSubmit}>
            <label>
              <span>문의 내용</span>
              <textarea value={message} maxLength={1000} placeholder="관리자에게 전달할 내용을 입력해 주세요." onChange={(event) => setMessage(event.target.value)} />
              <small>{message.length} / 1000</small>
            </label>

            <label className="inquiry-file-field">
              <span>이미지 첨부</span>
              <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
              <em>{imageFile ? imageFile.name : '화면 캡처나 사진을 선택해 주세요.'}</em>
            </label>

            {imagePreview && (
              <div className="inquiry-image-preview">
                <img src={imagePreview} alt="첨부 이미지 미리보기" />
                <button type="button" onClick={() => setImageFile(null)}>삭제</button>
              </div>
            )}

            <button className="primary-button inquiry-submit-button" type="submit" disabled={submitting}>
              {submitting ? '전송 중...' : '문의 보내기'}
            </button>
          </form>
        ) : (
          <div className="inquiry-inbox">
            {loading && <LoadingState message="문의 내역을 불러오는 중입니다." variant="inline" />}
            {!loading && inquiries.length === 0 && (
              <EmptyState
                compact
                title="아직 문의 내역이 없어요."
                description="문의를 보내면 답변 상태와 댓글이 여기에 쌓여요."
              />
            )}
            {inquiries.map((inquiry) => (
              <article
                className={`inquiry-thread ${inquiry.id === highlightedInquiryId ? 'highlighted' : ''}`}
                data-inquiry-id={inquiry.id}
                key={inquiry.id}
              >
                <div className="inquiry-thread-head">
                  <div>
                    {isAdmin && <strong>{inquiry.member?.display_name || inquiry.member?.username || '회원'}</strong>}
                    <time>{formatInquiryDate(inquiry.created_at)}</time>
                  </div>
                  <div className="inquiry-thread-actions">
                    <span className={inquiry.status === 'answered' ? 'answered' : ''}>{inquiry.status === 'answered' ? '답변 완료' : '대기 중'}</span>
                    {(isAdmin || inquiry.member_id === profile.id) && (
                      <button type="button" onClick={() => handleDeleteInquiry(inquiry)} disabled={submitting}>삭제</button>
                    )}
                  </div>
                </div>
                <p>{inquiry.message}</p>
                {inquiry.image_url && (
                  <a className="inquiry-attachment" href={inquiry.image_url} target="_blank" rel="noreferrer">
                    첨부 이미지 보기
                  </a>
                )}

                <div className="inquiry-replies">
                  {inquiry.replies?.map((reply) => (
                    <div className="inquiry-reply" key={reply.id}>
                      <div className="inquiry-reply-head">
                        <strong>{reply.sender_role === 'admin' ? '관리자 답변' : '문의자 댓글'}</strong>
                        {(isAdmin || reply.sender_member_id === profile.id) && (
                          <button type="button" onClick={() => handleDeleteReply(reply.id)} disabled={submitting}>삭제</button>
                        )}
                      </div>
                      <p>{reply.message}</p>
                      <time>{formatInquiryDate(reply.created_at)}</time>
                    </div>
                  ))}
                </div>

                <div className="inquiry-reply-form">
                  <textarea
                    value={replyDrafts[inquiry.id] || ''}
                    placeholder={isAdmin ? '답변을 입력해 주세요.' : '추가로 전달할 내용을 입력해 주세요.'}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [inquiry.id]: event.target.value }))}
                  />
                  <button type="button" onClick={() => handleReply(inquiry.id)} disabled={submitting}>
                    {isAdmin ? '답변 등록' : '댓글 등록'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  ), document.body)
}

function formatInquiryDate(dateText) {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

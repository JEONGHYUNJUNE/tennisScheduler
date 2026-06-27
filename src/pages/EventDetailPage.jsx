import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { addEventComment, addGuestAttendance, attendEvent, cancelAttendance, deleteEvent, deleteEventComment, getEvent, getEventLikeSummaries, getTodayDateText, isCancellationBlocked, removeGuestAttendance, toggleEventLike, updateEventComment } from '../services/eventService'

const emptyGuestForm = {
  guest_name: '',
  guest_memo: '',
}

const formatCommentTime = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(dateText))

const formatDetailDate = (dateText) => {
  if (!dateText) return '날짜 미정'

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(new Date(`${dateText}T00:00:00`))
}

const formatEventTime = (startTime, endTime) => {
  if (!startTime) return '시간 미정'

  return `${startTime.slice(0, 5)}${endTime ? ` ~ ${endTime.slice(0, 5)}` : ''}`
}

const getAttendanceLabel = (myAttendance, isFull) => {
  if (myAttendance?.status === 'waiting') return '대기 취소'
  if (myAttendance) return '참석 취소'
  if (isFull) return '대기 신청'
  return '참가하기'
}

export default function EventDetailPage() {
  const { eventId } = useParams()
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [guestForm, setGuestForm] = useState(emptyGuestForm)
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [likeSummary, setLikeSummary] = useState({ count: 0, likedByMe: false })
  const [commentMessage, setCommentMessage] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentMessage, setEditCommentMessage] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingCommentId, setSavingCommentId] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)

  useEffect(() => {
    getEvent(eventId)
      .then(async (data) => {
        setEvent(data)
        const summaries = await getEventLikeSummaries([data.id], profile.id)
        setLikeSummary(summaries[data.id] ?? { count: 0, likedByMe: false })
      })
      .catch((err) => setError(err.message))
  }, [eventId, profile.id])

  const reload = () => getEvent(eventId).then(setEvent).catch((err) => setError(err.message))

  if (error) return <p className="error">{error}</p>
  if (!event) return <LoadingState message="일정을 불러오는 중입니다." />

  const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
  const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
  const comments = event.comments || []
  const myAttendance = event.tennis_attendances?.find((item) => item.member_id === profile.id)
  const canManageEvent = isAdmin || event.created_by === profile.id
  const isPastEvent = event.event_date < getTodayDateText()
  const isFull = event.max_players && attending.length >= event.max_players
  const attendanceCountText = event.max_players ? `${attending.length} / ${event.max_players}명` : `${attending.length}명`

  const handleAttendance = async () => {
    if (myAttendance && isCancellationBlocked(event.event_date)) {
      alert('5일내 취소는 모집장에게 팀즈 해주시기 바랍니다')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (myAttendance) await cancelAttendance(myAttendance.id)
      else await attendEvent(event, profile.id)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuestSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    setGuestSubmitting(true)
    setError('')
    try {
      await addGuestAttendance(event, guestForm, profile.id)
      setGuestForm(emptyGuestForm)
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuestSubmitting(false)
    }
  }

  const handleGuestRemove = async (attendanceId) => {
    setError('')
    try {
      await removeGuestAttendance(attendanceId)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`${event.title} 일정을 삭제할까요?`)) return

    setError('')
    try {
      await deleteEvent(event.id)
      navigate('/events')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLike = async () => {
    const currentLike = likeSummary

    setLikeSummary({
      count: Math.max(currentLike.count + (currentLike.likedByMe ? -1 : 1), 0),
      likedByMe: !currentLike.likedByMe,
    })

    try {
      await toggleEventLike(event.id, profile.id, currentLike.likedByMe)
    } catch (err) {
      setError(`${err.message} SQL 015번을 실행했는지 확인해 주세요.`)
      const summaries = await getEventLikeSummaries([event.id], profile.id)
      setLikeSummary(summaries[event.id] ?? { count: 0, likedByMe: false })
    }
  }

  const handleCommentSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    const trimmedMessage = commentMessage.trim()
    if (!trimmedMessage) return

    setSubmittingComment(true)
    setError('')

    try {
      await addEventComment(event.id, profile.id, trimmedMessage)
      setCommentMessage('')
      await reload()
    } catch (err) {
      setError(`${err.message} SQL 023번을 실행했는지 확인해 주세요.`)
    } finally {
      setSubmittingComment(false)
    }
  }

  const startCommentEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditCommentMessage(comment.message)
    setError('')
  }

  const cancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditCommentMessage('')
  }

  const handleCommentUpdate = async (submitEvent, comment) => {
    submitEvent.preventDefault()
    const trimmedMessage = editCommentMessage.trim()
    if (!trimmedMessage) return

    setSavingCommentId(comment.id)
    setError('')

    try {
      await updateEventComment(comment.id, trimmedMessage)
      cancelCommentEdit()
      await reload()
    } catch (err) {
      setError(`${err.message} SQL 023번을 실행했는지 확인해 주세요.`)
    } finally {
      setSavingCommentId(null)
    }
  }

  const handleCommentDelete = async (comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return

    setDeletingCommentId(comment.id)
    setError('')

    try {
      await deleteEventComment(comment.id)
      if (editingCommentId === comment.id) cancelCommentEdit()
      await reload()
    } catch (err) {
      setError(`${err.message} SQL 023번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <div className="event-detail-shell">
      <section className="event-detail-hero">
        <div className="event-detail-topbar">
          <button className="event-detail-round-button" type="button" onClick={() => navigate(-1)} aria-label="뒤로">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </button>
          <p className="eyebrow">MATCH DETAIL</p>
          <button
            className={`event-detail-round-button event-detail-like ${likeSummary.likedByMe ? 'liked' : ''}`}
            type="button"
            onClick={handleLike}
            aria-label={likeSummary.likedByMe ? '좋아요 취소' : '좋아요'}
          >
            <span>♥</span>
            <strong>{likeSummary.count}</strong>
          </button>
        </div>

        <div className="event-detail-hero-copy">
          <span className="event-status-pill">{isPastEvent ? '지난 일정' : '정기 모임'}</span>
          <h3>{event.title}</h3>
        </div>

        {canManageEvent && !isPastEvent && (
          <div className="event-detail-actions">
            <Link className="event-detail-action edit" to={`/events/${event.id}/edit`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.8 5.2 18.8 10.2" />
                <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                <path d="M4 20h16" />
              </svg>
              <span>일정 수정</span>
            </Link>
            <button className="event-detail-action delete" type="button" onClick={handleDelete}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 7h12" />
                <path d="M9 7V5h6v2" />
                <path d="M8 10v8M12 10v8M16 10v8" />
                <path d="M7 7l1 14h8l1-14" />
              </svg>
              <span>삭제</span>
            </button>
          </div>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      <section className="detail-card event-info-card">
        <div className="event-card-title">
          <span className="event-card-title-icon calendar-icon" />
          <h2>일정 정보</h2>
        </div>
        <dl className="event-info-list">
          <div><dt><span className="detail-mini-icon calendar-icon" /></dt><dd><strong>날짜</strong><span>{formatDetailDate(event.event_date)}</span></dd></div>
          <div><dt><span className="detail-mini-icon clock-icon" /></dt><dd><strong>시간</strong><span>{formatEventTime(event.start_time, event.end_time)}</span></dd></div>
          <div><dt><span className="detail-mini-icon pin-icon" /></dt><dd><strong>장소</strong><span>{event.location || '장소 미정'}</span></dd></div>
          <div>
            <dt>
              <span className="detail-mini-icon detail-member-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path d="M3.5 19c.6-3.2 2.4-5 5-5s4.4 1.8 5 5" />
                  <path d="M13.5 14.5c2.7.2 4.5 1.8 5 4.5" />
                </svg>
              </span>
            </dt>
            <dd><strong>정원</strong><span>{attendanceCountText}</span></dd>
          </div>
        </dl>
      </section>

      {event.memo && (
        <section className="detail-card event-memo-card">
          <div className="event-card-title">
            <span className="event-card-title-icon memo-icon" />
            <h2>메모</h2>
          </div>
          <p>{event.memo}</p>
        </section>
      )}

      {isAdmin && event.supports_guest_attendance && !isPastEvent && (
        <section className="detail-card guest-card">
          <div className="guest-card-head">
            <div>
              <p className="eyebrow">GUEST</p>
              <h2>게스트 참석 추가</h2>
            </div>
            <p>게스트 등록</p>
          </div>
          <form className="guest-form" onSubmit={handleGuestSubmit}>
            <div className="form-row">
              <label>게스트 이름<input required value={guestForm.guest_name} onChange={(submitEvent) => setGuestForm({ ...guestForm, guest_name: submitEvent.target.value })} placeholder="예: 김민수" /></label>
              <label>메모<input value={guestForm.guest_memo} onChange={(submitEvent) => setGuestForm({ ...guestForm, guest_memo: submitEvent.target.value })} placeholder="지인, 체험 참석 등" /></label>
            </div>
            <button className="secondary-button" disabled={guestSubmitting}>
              {guestSubmitting ? '추가 중...' : '게스트 추가'}
            </button>
          </form>
        </section>
      )}

      <section className="detail-card attendee-section event-member-card">
        <div className="event-card-title">
          <span className="event-card-title-icon event-member-title-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M3.5 19c.6-3.2 2.4-5 5-5s4.4 1.8 5 5" />
              <path d="M13.5 14.5c2.7.2 4.5 1.8 5 4.5" />
            </svg>
          </span>
          <h2>참가 멤버</h2>
          <em>{attendanceCountText}</em>
        </div>
        <ul className="attendee-list">
          {attending.length === 0 && <li><strong>아직 없습니다.</strong><span /></li>}
          {attending.map((item) => (
            <li key={item.id}>
              <div className="attendee-copy">
                <strong>{item.display_name}</strong>
                <span>{item.is_guest ? item.guest_memo || '게스트' : item.identifier}</span>
              </div>
              {isAdmin && item.is_guest && !isPastEvent && <button className="text-button attendee-remove" onClick={() => handleGuestRemove(item.id)}>삭제</button>}
            </li>
          ))}
        </ul>

        {isPastEvent ? (
          <p className="past-event-notice">지난 일정은 조회만 가능합니다.</p>
        ) : (
          <button className={myAttendance ? 'danger-button event-attendance-button' : 'primary-button event-attendance-button'} disabled={submitting} onClick={handleAttendance}>
            {submitting ? '처리 중...' : getAttendanceLabel(myAttendance, isFull)}
          </button>
        )}
      </section>

      <section className="detail-card attendee-section event-member-card waiting-card">
        <div className="event-card-title">
          <span className="event-card-title-icon waiting-icon" />
          <h2>대기자</h2>
          <em>{waiting.length}명</em>
        </div>
        <ul className="attendee-list">
          {waiting.length === 0 && <li><strong>아직 없습니다.</strong><span /></li>}
          {waiting.map((item, index) => (
            <li key={item.id}>
              <div className="attendee-copy">
                <strong>{index + 1}. {item.display_name}</strong>
                <span>{item.is_guest ? item.guest_memo || '게스트' : item.identifier}</span>
              </div>
              {isAdmin && item.is_guest && !isPastEvent && <button className="text-button attendee-remove" onClick={() => handleGuestRemove(item.id)}>삭제</button>}
            </li>
          ))}
        </ul>
      </section>
      <section className="detail-card event-comments-card">
        <div className="opinion-comments-head">
          <strong>댓글 {comments.length}</strong>
        </div>

        {comments.length > 0 ? (
          <div className="opinion-comment-list">
            {comments.map((comment) => {
              const canManageComment = isAdmin || comment.member_id === profile.id
              const isCommentEditing = editingCommentId === comment.id

              return (
                <article className={`opinion-comment ${canManageComment && !isCommentEditing ? 'manageable' : ''}`} key={comment.id}>
                  <div className="opinion-comment-meta">
                    <strong>{comment.member_name}</strong>
                    <time>{formatCommentTime(comment.created_at)}</time>
                  </div>

                  {isCommentEditing ? (
                    <form className="opinion-comment-edit-form" onSubmit={(submitEvent) => handleCommentUpdate(submitEvent, comment)}>
                      <textarea
                        maxLength={300}
                        rows="2"
                        value={editCommentMessage}
                        onChange={(changeEvent) => setEditCommentMessage(changeEvent.target.value)}
                      />
                      <div className="opinion-edit-actions">
                        <span>{editCommentMessage.length} / 300</span>
                        <button className="secondary-button" type="button" onClick={cancelCommentEdit}>
                          취소
                        </button>
                        <button className="primary-button" disabled={savingCommentId === comment.id || !editCommentMessage.trim()}>
                          {savingCommentId === comment.id ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p>{comment.message}</p>
                  )}

                  {canManageComment && !isCommentEditing && (
                    <div className="opinion-comment-actions">
                      <button
                        className="opinion-icon-button edit"
                        type="button"
                        onClick={() => startCommentEdit(comment)}
                        aria-label="댓글 수정"
                        title="수정"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M13.8 5.2 18.8 10.2" />
                          <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                          <path d="M4 20h16" />
                        </svg>
                      </button>
                      <button
                        className="opinion-icon-button delete"
                        type="button"
                        onClick={() => handleCommentDelete(comment)}
                        disabled={deletingCommentId === comment.id}
                        aria-label="댓글 삭제"
                        title="삭제"
                      >
                        <span aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="widget-empty">아직 댓글이 없습니다.</p>
        )}

        <form className="opinion-comment-form event-comment-form" onSubmit={handleCommentSubmit}>
          <input
            maxLength={300}
            placeholder="댓글을 입력하세요."
            value={commentMessage}
            onChange={(changeEvent) => setCommentMessage(changeEvent.target.value)}
          />
          <button className="secondary-button" disabled={submittingComment || !commentMessage.trim()}>
            {submittingComment ? '등록 중...' : '저장'}
          </button>
        </form>
      </section>
    </div>
  )
}

import AppIcon from '../components/AppIcon'
import { recurrenceLabel } from '../services/eventRecurrence'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ImageLightbox from '../components/ImageLightbox'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import MentionText from '../components/MentionText'
import MentionTextarea from '../components/MentionTextarea'
import { useAuth } from '../contexts/AuthContext'
import { addEventComment, addGuestAttendance, attendEvent, cancelAttendance, deleteEvent, deleteEventComment, getEvent, getEventCommentLikeSummaries, getEventLikeSummaries, getTodayDateText, isCancellationBlocked, removeGuestAttendance, toggleEventCommentLike, toggleEventLike, updateEventComment } from '../services/eventService'
import { getMembers } from '../services/memberService'
import { createGroupChat } from '../services/groupChatService'

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
  const [searchParams] = useSearchParams()
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creatingGroupChat, setCreatingGroupChat] = useState(false)
  const [groupChatError, setGroupChatError] = useState('')
  const [guestForm, setGuestForm] = useState(emptyGuestForm)
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [likeSummary, setLikeSummary] = useState({ count: 0, likedByMe: false })
  const [commentLikes, setCommentLikes] = useState({})
  const [commentMessage, setCommentMessage] = useState('')
  const [commentMentions, setCommentMentions] = useState([])
  const [mentionCandidates, setMentionCandidates] = useState([])
  const [replyingCommentId, setReplyingCommentId] = useState(null)
  const [replyInputs, setReplyInputs] = useState({})
  const [replyMentions, setReplyMentions] = useState({})
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentMessage, setEditCommentMessage] = useState('')
  const [editCommentMentions, setEditCommentMentions] = useState([])
  const [submittingComment, setSubmittingComment] = useState(false)
  const [submittingReplyCommentId, setSubmittingReplyCommentId] = useState(null)
  const [savingCommentId, setSavingCommentId] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const linkedCommentId = searchParams.get('comment')

  useEffect(() => {
    getEvent(eventId)
      .then(async (data) => {
        setEvent(data)
        const summaries = await getEventLikeSummaries([data.id], profile.id)
        setLikeSummary(summaries[data.id] ?? { count: 0, likedByMe: false })
        setCommentLikes(await getEventCommentLikeSummaries((data.flat_comments || data.comments || []).map((comment) => comment.id), profile.id))
      })
      .catch((err) => setError(err.message))
  }, [eventId, profile.id])

  useEffect(() => {
    getMembers()
      .then((members) => setMentionCandidates(members.filter((member) => member.is_active !== false && member.id !== profile.id)))
      .catch(() => setMentionCandidates([]))
  }, [profile.id])

  const reload = async () => {
    try {
      const nextEvent = await getEvent(eventId)
      setEvent(nextEvent)
      setCommentLikes(await getEventCommentLikeSummaries((nextEvent.flat_comments || nextEvent.comments || []).map((comment) => comment.id), profile.id))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!event || !linkedCommentId) return undefined

    const timer = window.setTimeout(() => {
      document.getElementById(`event-comment-${linkedCommentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 160)

    return () => window.clearTimeout(timer)
  }, [event, linkedCommentId])

  if (error) return <p className="error">{error}</p>
  if (!event) return <LoadingState message="일정을 불러오는 중입니다." />

  const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
  const invitedAttendeeIds = [...new Set(attending.filter((item) => item.member_id && !item.is_guest && item.member_id !== profile.id).map((item) => item.member_id))]
  const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
  const comments = event.comments || []
  const totalCommentCount = (event.flat_comments || comments).length
  const myAttendance = event.tennis_attendances?.find((item) => item.member_id === profile.id)
  const canManageEvent = isAdmin || event.created_by === profile.id
  const isPastEvent = event.event_date < getTodayDateText() || (Boolean(event.repeat_monthly_day) && !event.has_upcoming_occurrence)
  const isFull = event.max_players && attending.length >= event.max_players
  const attendanceCountText = event.max_players ? `${attending.length} / ${event.max_players}명` : `${attending.length}명`

  const handleAttendance = async () => {
    if (event.repeat_monthly_day && !confirm(myAttendance ? '반복 참석을 취소할까요? 이후 매월 알림도 중단됩니다.' : '이 반복 일정에 참석할까요? 참석 확정 시 매월 알림을 받습니다.')) return
    if (myAttendance && !event.repeat_monthly_day && isCancellationBlocked(event.event_date)) {
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

  const handleCreateAttendeeGroupChat = async () => {
    if (creatingGroupChat) return
    setCreatingGroupChat(true)
    setGroupChatError('')
    try {
      // Refresh attendance at click time so recent cancellations/waiting changes are respected.
      const currentEvent = await getEvent(event.id)
      if (!currentEvent) throw new Error('삭제된 일정입니다.')
      const memberIds = [...new Set((currentEvent.tennis_attendances || [])
        .filter((item) => item.status === 'attending' && item.member_id && !item.is_guest && item.member_id !== profile.id)
        .map((item) => item.member_id))]
      if (!memberIds.length) throw new Error('함께 초대할 참석 회원이 없습니다. 게스트와 대기자는 초대되지 않습니다.')
      const roomName = Array.from(`${currentEvent.event_date} ${currentEvent.title}`).slice(0, 40).join('')
      const room = await createGroupChat(roomName, memberIds)
      if (!room?.id) throw new Error('단체톡방을 만들지 못했습니다. 다시 시도해 주세요.')
      window.dispatchEvent(new CustomEvent('ons-tennis-chat-unread-changed'))
      navigate(`/group-chats/${room.id}`)
    } catch (err) {
      setGroupChatError(err.message || '단체톡방을 만들지 못했습니다.')
    } finally {
      setCreatingGroupChat(false)
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
    if (!confirm(`${event.title} 일정을 삭제할까요?${event.repeat_monthly_day ? " 이후 매월 반복 알림도 모두 중단됩니다." : ""}`)) return

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

  const handleCommentLike = async (comment) => {
    const currentLike = commentLikes[comment.id] ?? { count: 0, likedByMe: false }

    setCommentLikes((current) => ({
      ...current,
      [comment.id]: {
        count: Math.max((current[comment.id]?.count || 0) + (currentLike.likedByMe ? -1 : 1), 0),
        likedByMe: !currentLike.likedByMe,
      },
    }))

    try {
      await toggleEventCommentLike(comment.id, profile.id, currentLike.likedByMe)
    } catch (err) {
      setError(`${err.message} SQL 027번을 실행했는지 확인해 주세요.`)
      await reload()
    }
  }

  const handleCommentSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    const trimmedMessage = commentMessage.trim()
    if (!trimmedMessage) return

    setSubmittingComment(true)
    setError('')

    try {
      await addEventComment(event.id, profile.id, trimmedMessage, null, commentMentions)
      setCommentMessage('')
      setCommentMentions([])
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
    setEditCommentMentions([])
    setError('')
  }

  const cancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditCommentMessage('')
    setEditCommentMentions([])
  }

  const handleCommentUpdate = async (submitEvent, comment) => {
    submitEvent.preventDefault()
    const trimmedMessage = editCommentMessage.trim()
    if (!trimmedMessage) return

    setSavingCommentId(comment.id)
    setError('')

    try {
      await updateEventComment(comment.id, trimmedMessage, profile.id, editCommentMentions)
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
      if (replyingCommentId === comment.id) setReplyingCommentId(null)
      await reload()
    } catch (err) {
      setError(`${err.message} SQL 023번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleReplySubmit = async (submitEvent, parentComment) => {
    submitEvent.preventDefault()
    const trimmedMessage = (replyInputs[parentComment.id] || '').trim()
    if (!trimmedMessage) return

    setSubmittingReplyCommentId(parentComment.id)
    setError('')

    try {
      await addEventComment(event.id, profile.id, trimmedMessage, parentComment.id, replyMentions[parentComment.id] || [])
      setReplyInputs((current) => ({ ...current, [parentComment.id]: '' }))
      setReplyMentions((current) => ({ ...current, [parentComment.id]: [] }))
      setReplyingCommentId(null)
      await reload()
    } catch (err) {
      setError(`${err.message} SQL 041번을 실행했는지 확인해 주세요.`)
    } finally {
      setSubmittingReplyCommentId(null)
    }
  }

  const renderComment = (comment, isReply = false) => {
    const canManageComment = isAdmin || comment.member_id === profile.id
    const isCommentEditing = editingCommentId === comment.id

    return (
      <article
        className={`opinion-comment ${isReply ? 'opinion-reply' : ''} ${canManageComment && !isCommentEditing ? 'manageable' : ''} ${linkedCommentId === comment.id ? 'linked-opinion-comment' : ''}`}
        id={`event-comment-${comment.id}`}
        key={comment.id}
      >
        <div className="opinion-comment-meta">
          <div className="opinion-comment-author">
            <MemberAvatar name={comment.member_name} imageUrl={comment.member_avatar_url} size="sm" previewable />
            <strong>{comment.member_name}</strong>
          </div>
          <time>{formatCommentTime(comment.created_at)}</time>
        </div>

        {isCommentEditing ? (
          <form className="opinion-comment-edit-form" onSubmit={(submitEvent) => handleCommentUpdate(submitEvent, comment)}>
            <MentionTextarea
              candidates={mentionCandidates}
              maxLength={300}
              rows="2"
              value={editCommentMessage}
              onChange={setEditCommentMessage}
              onMentionsChange={setEditCommentMentions}
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
          <p><MentionText text={comment.message} /></p>
        )}

        <div className="opinion-comment-quick-actions">
          <button
            className={`comment-heart-button ${commentLikes[comment.id]?.likedByMe ? 'liked' : ''}`}
            type="button"
            onClick={() => handleCommentLike(comment)}
            aria-label={commentLikes[comment.id]?.likedByMe ? '댓글 하트 취소' : '댓글 하트'}
          >
            <span>♥</span>
            <strong>{commentLikes[comment.id]?.count || 0}</strong>
          </button>
          {!isReply && !isCommentEditing && (
            <button
              className="comment-reply-toggle"
              type="button"
              onClick={() => setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id)}
            >
              답글
            </button>
          )}
        </div>

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

        {comment.replies?.length > 0 && (
          <div className="opinion-reply-list">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {replyingCommentId === comment.id && (
          <form className="opinion-reply-form" onSubmit={(submitEvent) => handleReplySubmit(submitEvent, comment)}>
            <MentionTextarea
              autoFocus
              candidates={mentionCandidates}
              maxLength={300}
              multiline={false}
              placeholder={`${comment.member_name}님에게 답글 남기기`}
              value={replyInputs[comment.id] || ''}
              onChange={(value) => setReplyInputs((current) => ({ ...current, [comment.id]: value }))}
              onMentionsChange={(updater) => setReplyMentions((current) => ({
                ...current,
                [comment.id]: typeof updater === 'function' ? updater(current[comment.id] || []) : updater,
              }))}
            />
            <button className="secondary-button" disabled={submittingReplyCommentId === comment.id || !(replyInputs[comment.id] || '').trim()}>
              {submittingReplyCommentId === comment.id ? '등록 중...' : '등록'}
            </button>
          </form>
        )}
      </article>
    )
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
          <span className="event-status-pill">{event.repeat_monthly_day ? '반복 일정' : isPastEvent ? '지난 일정' : '정기 모임'}</span>
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
          <AppIcon type="events" className="event-card-title-icon" />
          <h2>일정 정보</h2>
        </div>
        <dl className="event-info-list">
          <div><dt><AppIcon type="events" className="detail-mini-icon" /></dt><dd><strong>날짜</strong><span>{formatDetailDate(event.event_date)}{event.repeat_monthly_day ? ` · ${recurrenceLabel(event)}` : ''}</span></dd></div>
          <div><dt><AppIcon type="clock" className="detail-mini-icon" /></dt><dd><strong>시간</strong><span>{formatEventTime(event.start_time, event.end_time)}</span></dd></div>
          <div><dt><AppIcon type="pin" className="detail-mini-icon" /></dt><dd><strong>장소</strong><span>{event.location || '장소 미정'}</span></dd></div>
          <div>
            <dt>
              <AppIcon type="mypage" className="detail-mini-icon" />
            </dt>
            <dd>
              <strong>작성자</strong>
              <span className="event-author-inline">
                {event.creator_name ? (
                  <>
                    <MemberAvatar name={event.creator_name} imageUrl={event.creator_avatar_url} size="xs" previewable />
                    <b>{event.creator_name}</b>
                  </>
                ) : (
                  <b>작성자 정보 없음</b>
                )}
              </span>
            </dd>
          </div>
          <div>
            <dt>
              <AppIcon type="members" className="detail-mini-icon" />
            </dt>
            <dd><strong>정원</strong><span>{attendanceCountText}</span></dd>
          </div>
        </dl>
      </section>

      {(event.memo || event.memo_image_url) && (
        <section className="detail-card event-memo-card">
          <div className="event-card-title">
            <AppIcon type="diary" className="event-card-title-icon" />
            <h2>메모</h2>
          </div>
          {event.memo && <p>{event.memo}</p>}
          {event.memo_image_url && (
            <ImageLightbox
              src={event.memo_image_url}
              alt={event.memo_image_name || '일정 메모 첨부 이미지'}
              className="post-image-display"
            />
          )}
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
          <AppIcon type="members" className="event-card-title-icon" />
          <h2>참가 멤버</h2>
          <em>{attendanceCountText}</em>
        </div>
        <div className="event-attendee-chat-actions">
          <button className="secondary-button event-attendee-chat-button" type="button" onClick={handleCreateAttendeeGroupChat} disabled={creatingGroupChat || !invitedAttendeeIds.length}>
            {creatingGroupChat ? '단체방 만드는 중...' : '이 멤버로 단체방 만들기'}
          </button>
          <p>참석 확정 회원을 초대합니다. 방을 만든 회원도 함께 참여하며, 게스트·대기자는 제외됩니다.</p>
          {groupChatError && <p className="error" role="alert">{groupChatError}</p>}
        </div>
        <ul className="attendee-list">
          {attending.length === 0 && <li><strong>아직 없습니다.</strong><span /></li>}
          {attending.map((item) => (
            <li key={item.id}>
              <MemberAvatar name={item.display_name} imageUrl={item.otmember?.avatar_url} previewable />
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
          <AppIcon type="clock" className="event-card-title-icon" />
          <h2>대기자</h2>
          <em>{waiting.length}명</em>
        </div>
        <ul className="attendee-list">
          {waiting.length === 0 && <li><strong>아직 없습니다.</strong><span /></li>}
          {waiting.map((item, index) => (
            <li key={item.id}>
              <MemberAvatar name={item.display_name} imageUrl={item.otmember?.avatar_url} previewable />
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
          <strong>댓글 {totalCommentCount}</strong>
        </div>

        {comments.length > 0 ? (
          <div className="opinion-comment-list">
            {comments.map((comment) => renderComment(comment))}
          </div>
        ) : (
          <EmptyState
            compact
            title="아직 댓글이 없어요."
            description="궁금한 점이나 참석 메모를 남겨보세요."
          />
        )}

        <form className="opinion-comment-form event-comment-form" onSubmit={handleCommentSubmit}>
          <MentionTextarea
            candidates={mentionCandidates}
            maxLength={300}
            multiline={false}
            placeholder="댓글을 입력하세요."
            value={commentMessage}
            onChange={setCommentMessage}
            onMentionsChange={setCommentMentions}
          />
          <button className="secondary-button" disabled={submittingComment || !commentMessage.trim()}>
            {submittingComment ? '등록 중...' : '저장'}
          </button>
        </form>
      </section>
    </div>
  )
}

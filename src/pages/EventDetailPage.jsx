import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addGuestAttendance, attendEvent, cancelAttendance, deleteEvent, getEvent, getEventLikeSummaries, getTodayDateText, isCancellationBlocked, removeGuestAttendance, toggleEventLike } from '../services/eventService'

const emptyGuestForm = {
  guest_name: '',
  guest_memo: '',
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
  if (!event) return <p>일정을 불러오는 중입니다.</p>

  const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
  const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
  const myAttendance = event.tennis_attendances?.find((item) => item.member_id === profile.id)
  const canManageEvent = isAdmin || event.created_by === profile.id
  const isPastEvent = event.event_date < getTodayDateText()
  const isFull = event.max_players && attending.length >= event.max_players

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

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">MATCH DETAIL</p><h1>{event.title}</h1></div>
        {canManageEvent && !isPastEvent && (
          <div className="detail-heading-actions">
            <Link className="secondary-button" to={`/events/${event.id}/edit`}>일정 수정</Link>
            <button className="danger-button" type="button" onClick={handleDelete}>삭제</button>
          </div>
        )}
      </div>
      <section className="detail-card">
        <dl>
          <div><dt>날짜</dt><dd>{event.event_date}</dd></div>
          <div><dt>시간</dt><dd>{event.start_time?.slice(0, 5)}{event.end_time && ` - ${event.end_time.slice(0, 5)}`}</dd></div>
          <div><dt>장소</dt><dd>{event.location}</dd></div>
          <div><dt>정원</dt><dd>{event.max_players ? `${attending.length} / ${event.max_players}명` : `${attending.length}명`}</dd></div>
          {event.memo && <div><dt>메모</dt><dd>{event.memo}</dd></div>}
        </dl>
        <button
          className={`heart-button detail-heart ${likeSummary.likedByMe ? 'liked' : ''}`}
          type="button"
          onClick={handleLike}
          aria-label={likeSummary.likedByMe ? '좋아요 취소' : '좋아요'}
        >
          <span>♥</span>
          <strong>{likeSummary.count}</strong>
        </button>
        {error && <p className="error">{error}</p>}
        {isPastEvent ? (
          <p className="past-event-notice">지난 일정은 조회만 가능합니다.</p>
        ) : (
          <button className={myAttendance ? 'danger-button' : 'primary-button'} disabled={submitting} onClick={handleAttendance}>
            {submitting
              ? '처리 중...'
              : myAttendance
                ? myAttendance.status === 'waiting' ? '대기 취소' : '참석 취소'
                : isFull ? '대기 신청' : '참석 신청'}
          </button>
        )}
      </section>
      {isAdmin && event.supports_guest_attendance && !isPastEvent && (
        <section className="detail-card guest-card">
          <div className="guest-card-head">
            <div>
              <p className="eyebrow">GUEST</p>
              <h2>게스트 참석 추가</h2>
            </div>
            <p>비회원 참석자를 바로 등록할 수 있습니다.</p>
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
      <section className="attendee-section">
        <h2>참석자 <span>{attending.length}</span></h2>
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
      </section>
      <section className="attendee-section">
        <h2>대기자 <span>{waiting.length}</span></h2>
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
    </>
  )
}

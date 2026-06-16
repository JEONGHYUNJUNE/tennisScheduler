import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { attendEvent, cancelAttendance, getEvent, isCancellationBlocked } from '../services/eventService'

export default function EventDetailPage() {
  const { eventId } = useParams()
  const { profile, isAdmin } = useAuth()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getEvent(eventId).then(setEvent).catch((err) => setError(err.message))
  }, [eventId])

  const reload = () => getEvent(eventId).then(setEvent).catch((err) => setError(err.message))

  if (error) return <p className="error">{error}</p>
  if (!event) return <p>일정을 불러오는 중입니다.</p>

  const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
  const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
  const myAttendance = event.tennis_attendances?.find((item) => item.member_id === profile.id)
  const canManageEvent = isAdmin || event.created_by === profile.id
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

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">MATCH DETAIL</p><h1>{event.title}</h1></div>
        {canManageEvent && <Link className="secondary-button" to={`/events/${event.id}/edit`}>일정 수정</Link>}
      </div>
      <section className="detail-card">
        <dl>
          <div><dt>날짜</dt><dd>{event.event_date}</dd></div>
          <div><dt>시간</dt><dd>{event.start_time?.slice(0, 5)}{event.end_time && ` - ${event.end_time.slice(0, 5)}`}</dd></div>
          <div><dt>장소</dt><dd>{event.location}</dd></div>
          <div><dt>정원</dt><dd>{event.max_players ? `${attending.length} / ${event.max_players}명` : `${attending.length}명`}</dd></div>
          {event.memo && <div><dt>메모</dt><dd>{event.memo}</dd></div>}
        </dl>
        {error && <p className="error">{error}</p>}
        <button className={myAttendance ? 'danger-button' : 'primary-button'} disabled={submitting} onClick={handleAttendance}>
          {submitting
            ? '처리 중...'
            : myAttendance
              ? myAttendance.status === 'waiting' ? '대기 취소' : '참석 취소'
              : isFull ? '대기 신청' : '참석 신청'}
        </button>
      </section>
      <section className="attendee-section">
        <h2>참석자 <span>{attending.length}</span></h2>
        <ul className="attendee-list">
          {attending.map((item) => <li key={item.id}><strong>{item.otmember?.name}</strong><span>{item.otmember?.user_id}</span></li>)}
        </ul>
      </section>
      <section className="attendee-section">
        <h2>대기자 <span>{waiting.length}</span></h2>
        <ul className="attendee-list">
          {waiting.length === 0 && <li><strong>아직 없습니다.</strong><span /></li>}
          {waiting.map((item, index) => <li key={item.id}><strong>{index + 1}. {item.otmember?.name}</strong><span>{item.otmember?.user_id}</span></li>)}
        </ul>
      </section>
    </>
  )
}

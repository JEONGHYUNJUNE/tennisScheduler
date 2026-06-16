import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { attendEvent, cancelAttendance, deleteEvent, getUpcomingEvents, isCancellationBlocked } from '../services/eventService'

const formatDate = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'short',
}).format(new Date(`${dateText}T00:00:00`))

const formatTime = (start, end) => end
  ? `${start?.slice(0, 5)} - ${end.slice(0, 5)}`
  : start?.slice(0, 5) || '시간 미정'

export default function EventsPage() {
  const { profile, isAdmin } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => getUpcomingEvents().then(setEvents).catch((err) => setError(err.message)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleAttendance = async (eventItem, mine) => {
    if (mine && isCancellationBlocked(eventItem.event_date)) {
      alert('5일내 취소는 모집장에게 팀즈 해주시기 바랍니다')
      return
    }
    setError('')
    try {
      if (mine) await cancelAttendance(mine.id)
      else await attendEvent(eventItem, profile.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (eventItem) => {
    if (!confirm(`${eventItem.title} 일정을 삭제할까요?`)) return
    try {
      await deleteEvent(eventItem.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="page-heading main-heading">
        <div><p className="eyebrow">ONS TENNIS</p><h1>다가오는 일정</h1><p className="heading-copy">참석할 일정을 확인하고 신청해 주세요.</p></div>
        <Link className="primary-button" to="/events/new">새 일정 등록</Link>
      </div>
      {loading && <p>일정을 불러오는 중입니다.</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !events.length && <div className="empty-state">예정된 일정이 없습니다.</div>}
      <div className="event-list">
        {events.map((event) => {
          const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
          const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
          const mine = event.tennis_attendances?.find((item) => item.member_id === profile.id)
          const canManageEvent = isAdmin || event.created_by === profile.id
          const isFull = event.max_players && attending.length >= event.max_players
          const nextActionLabel = mine
            ? mine.status === 'waiting' ? '대기 취소' : '참석 취소'
            : isFull ? '대기 신청' : '참석하기'
          return (
            <article className="event-card" key={event.id}>
              <div className="event-main">
                <time>{formatDate(event.event_date)}</time>
                <Link to={`/events/${event.id}`}><h2>{event.title}</h2></Link>
                <p>{formatTime(event.start_time, event.end_time)}</p>
                <p>{event.location || '장소 미정'}</p>
                {event.memo && <p className="event-memo">{event.memo}</p>}
              </div>
              <div className="event-side">
                <div className="capacity"><strong>{attending.length}{event.max_players ? ` / ${event.max_players}` : ''}</strong><span>참석</span></div>
                <button className={mine ? 'secondary-button' : 'primary-button'} onClick={() => handleAttendance(event, mine)}>
                  {nextActionLabel}
                </button>
                {canManageEvent && <div className="admin-card-actions"><Link className="secondary-button" to={`/events/${event.id}/edit`}>수정</Link><button className="danger-button" onClick={() => handleDelete(event)}>삭제</button></div>}
              </div>
              <div className="card-attendees">
                <strong>참석자</strong>
                <p>{attending.length ? attending.map((item) => item.otmember?.name || item.otmember?.user_id).join(', ') : '아직 없습니다.'}</p>
                {waiting.length > 0 && <p className="waiting-list">대기: {waiting.map((item, index) => `${index + 1}. ${item.otmember?.name || item.otmember?.user_id}`).join(', ')}</p>}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

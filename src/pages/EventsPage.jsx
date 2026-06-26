import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { attendEvent, cancelAttendance, deleteEvent, getEventLikeSummaries, getUpcomingEvents, isCancellationBlocked, toggleEventLike } from '../services/eventService'

const formatDate = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'short',
}).format(new Date(`${dateText}T00:00:00`))

const formatTime = (start, end) => end
  ? `${start?.slice(0, 5)} - ${end.slice(0, 5)}`
  : start?.slice(0, 5) || '시간 미정'

export default function EventsPage() {
  const { profile, isAdmin } = useAuth()
  const [events, setEvents] = useState([])
  const [eventLikes, setEventLikes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const nextEvents = await getUpcomingEvents()
      setEvents(nextEvents)
      setEventLikes(await getEventLikeSummaries(nextEvents.map((event) => event.id), profile.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id])

  useEffect(() => { load() }, [load])

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

  const handleLike = async (eventItem) => {
    const currentLike = eventLikes[eventItem.id] ?? { count: 0, likedByMe: false }

    setEventLikes((current) => ({
      ...current,
      [eventItem.id]: {
        count: Math.max((current[eventItem.id]?.count || 0) + (currentLike.likedByMe ? -1 : 1), 0),
        likedByMe: !currentLike.likedByMe,
      },
    }))

    try {
      await toggleEventLike(eventItem.id, profile.id, currentLike.likedByMe)
    } catch (err) {
      setError(`${err.message} SQL 015번을 실행했는지 확인해 주세요.`)
      await load()
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
          const likeSummary = eventLikes[event.id] ?? { count: 0, likedByMe: false }
          const nextActionLabel = mine
            ? mine.status === 'waiting' ? '대기 취소' : '참석 취소'
            : isFull ? '대기 신청' : '참석하기'
          return (
            <article className="event-card" key={event.id}>
              <Link className="event-main" to={`/events/${event.id}`}>
                <time>{formatDate(event.event_date)}</time>
                <h2>{event.title}</h2>
                <p>{formatTime(event.start_time, event.end_time)}</p>
                <p>{event.location || '장소 미정'}</p>
                {event.memo && <p className="event-memo">{event.memo}</p>}
              </Link>
              <div className="event-side">
                <button
                  className={`heart-button ${likeSummary.likedByMe ? 'liked' : ''}`}
                  type="button"
                  onClick={() => handleLike(event)}
                  aria-label={likeSummary.likedByMe ? '좋아요 취소' : '좋아요'}
                >
                  <span>♥</span>
                  <strong>{likeSummary.count}</strong>
                </button>
                <div className="capacity"><strong>{attending.length}{event.max_players ? ` / ${event.max_players}` : ''}</strong><span>참석</span></div>
                <button className={mine ? 'secondary-button' : 'primary-button'} onClick={() => handleAttendance(event, mine)}>
                  {nextActionLabel}
                </button>
                {canManageEvent && <div className="admin-card-actions"><Link className="secondary-button" to={`/events/${event.id}/edit`}>수정</Link><button className="danger-button" onClick={() => handleDelete(event)}>삭제</button></div>}
              </div>
              <div className="card-attendees">
                <strong>참석자</strong>
                <p>{attending.length ? attending.map((item) => item.is_guest ? `${item.display_name} (게스트)` : item.display_name || item.identifier).join(', ') : '아직 없습니다.'}</p>
                {waiting.length > 0 && <p className="waiting-list">대기: {waiting.map((item, index) => `${index + 1}. ${item.is_guest ? `${item.display_name} (게스트)` : item.display_name || item.identifier}`).join(', ')}</p>}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

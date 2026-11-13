import { recurrenceLabel } from '../services/eventRecurrence'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { attendEvent, cancelAttendance, deleteEvent, getAllEvents, getTodayDateText, getEventLikeSummaries, getUpcomingEvents, isCancellationBlocked, toggleEventLike } from '../services/eventService'

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
  const loadVersion = useRef(0)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('upcoming')
  const [eventType, setEventType] = useState('all')

  const load = useCallback(async () => {
    const version = ++loadVersion.current
    try {
      setLoading(true)
      setError('')
      const nextEvents = await (scope === 'all' ? getAllEvents() : getUpcomingEvents())
      const likes = {}
      for (let offset = 0; offset < nextEvents.length; offset += 100) {
        if (version !== loadVersion.current) return
        Object.assign(likes, await getEventLikeSummaries(nextEvents.slice(offset, offset + 100).map((event) => event.id), profile.id))
      }
      if (version !== loadVersion.current) return
      setEvents(nextEvents)
      setEventLikes(likes)
    } catch (err) {
      if (version === loadVersion.current) setError(err.message)
    } finally {
      if (version === loadVersion.current) setLoading(false)
    }
  }, [profile.id, scope])

  useEffect(() => { load() }, [load])

  const visibleEvents = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase('ko-KR').split(/\s+/).filter(Boolean)
    return events.filter((event) => {
      if (eventType === 'recurring' && !event.repeat_monthly_day) return false
      if (eventType === 'regular' && event.repeat_monthly_day) return false
      const text = [event.title, event.location, event.memo, event.event_date, event.original_event_date,
        ...(event.tennis_attendances || []).map((item) => item.display_name || item.identifier)]
        .filter(Boolean).join(' ').toLocaleLowerCase('ko-KR')
      return terms.every((term) => text.includes(term))
    })
  }, [events, query, eventType])

  const handleAttendance = async (eventItem, mine) => {
    if (eventItem.repeat_monthly_day && !confirm(mine ? '반복 참석을 취소할까요? 이후 매월 알림도 중단됩니다.' : '이 반복 일정에 참석할까요? 참석 확정 시 매월 알림을 받습니다.')) return
    if (mine && !eventItem.repeat_monthly_day && isCancellationBlocked(eventItem.event_date)) {
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
    if (!confirm(`${eventItem.title} 일정을 삭제할까요?${eventItem.repeat_monthly_day ? " 이후 매월 반복 알림도 모두 중단됩니다." : ""}`)) return
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
      <div className="page-heading main-heading events-heading">
        <div><p className="eyebrow">ONS TENNIS</p><h1>다가오는 일정</h1><p className="heading-copy">참석할 일정을 확인하고 신청해 주세요.</p></div>
        <Link className="primary-button event-create-button" to="/events/new">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>새 일정 등록</span>
        </Link>
      </div>
      <section className="event-search-panel" aria-label="일정 검색 및 필터">
        <label className="event-search-field">
          <span>전체 일정 검색</span>
          <input type="search" value={query} placeholder="일정명, 장소, 메모, 참석자 검색"
            onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim()) setScope('all') }} />
        </label>
        <label><span>조회 범위</span><select aria-label="조회 범위" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="upcoming">다가오는 2주</option><option value="all">전체 일정 · 과거 포함</option>
        </select></label>
        <label><span>일정 종류</span><select aria-label="일정 종류" value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="all">전체</option><option value="recurring">반복 일정</option><option value="regular">일반 일정</option>
        </select></label>
        <p className="event-search-summary" role="status">{loading ? '검색 중…' : `${visibleEvents.length}개 일정`}
          {scope === 'all' ? ' · 과거 및 2주 이후 일정 포함' : ' · 2주 이내 일정'}
        </p>
      </section>
      {loading && <LoadingState message="일정을 불러오는 중입니다." />}
      {error && <p className="error">{error}</p>}
      {!loading && !error && !visibleEvents.length && (
        <EmptyState
          title={query || eventType !== 'all' ? '검색 조건에 맞는 일정이 없어요.' : '조회할 일정이 없어요.'}
          description="검색어나 조회 범위, 일정 종류를 변경해 보세요."
          actionLabel="새 일정 등록"
          actionTo="/events/new"
        />
      )}
      <div className="event-list">
        {!loading && !error && visibleEvents.map((event) => {
          const attending = event.tennis_attendances?.filter((item) => item.status === 'attending') || []
          const waiting = event.tennis_attendances?.filter((item) => item.status === 'waiting') || []
          const mine = event.tennis_attendances?.find((item) => item.member_id === profile.id)
          const canManageEvent = isAdmin || event.created_by === profile.id
          const isPast = event.event_date < getTodayDateText() || (event.repeat_monthly_day && !event.has_upcoming_occurrence)
          const isFull = event.max_players && attending.length >= event.max_players
          const likeSummary = eventLikes[event.id] ?? { count: 0, likedByMe: false }
          const nextActionLabel = mine
            ? mine.status === 'waiting' ? '대기 취소' : '참석 취소'
            : isFull ? '대기 신청' : '참석하기'
          return (
            <article className="event-card" key={event.id}>
              <Link className="event-main" to={`/events/${event.id}`}>
                <time>{formatDate(event.event_date)}{event.repeat_monthly_day ? ` · ${recurrenceLabel(event)}` : ''}</time>
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
                <button className={`event-card-action attendance ${mine ? 'active' : ''}`} disabled={Boolean(isPast)} onClick={() => handleAttendance(event, mine)}>
                  {mine ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 12h12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                  <span>{isPast ? '종료된 일정' : nextActionLabel}</span>
                </button>
                {canManageEvent && (
                  <div className="admin-card-actions">
                    <Link className="event-card-action edit" to={`/events/${event.id}/edit`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M13.8 5.2 18.8 10.2" />
                        <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                        <path d="M4 20h16" />
                      </svg>
                      <span>수정</span>
                    </Link>
                    <button className="event-card-action delete" onClick={() => handleDelete(event)}>
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

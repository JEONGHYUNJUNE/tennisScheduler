import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import { getMyUpcomingEvents } from '../services/eventService'

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
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [myEvents, setMyEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [eventError, setEventError] = useState('')

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

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <section className="my-page-shell">
      <div className="my-page-card">
        <div className="my-page-profile">
          <div className="my-page-avatar" aria-hidden="true">{profile?.name?.slice(0, 1) || '?'}</div>
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
          {loadingEvents && <p className="notification-empty">참석 일정을 불러오는 중입니다.</p>}
          {eventError && <p className="notification-empty">{eventError}</p>}
          {!loadingEvents && !eventError && myEvents.length === 0 && <p className="notification-empty">참석 예정 일정이 없습니다.</p>}
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
    </section>
  )
}

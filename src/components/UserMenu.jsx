import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingState from './LoadingState'
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

export default function UserMenu({ profile, onLogout }) {
  const menuRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activePanel, setActivePanel] = useState('profile')
  const [myEvents, setMyEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')

  const openPanel = async (panelName) => {
    setActivePanel(panelName)
    setIsOpen(true)
    setError('')

    if (panelName !== 'events' || myEvents.length > 0) return

    setLoadingEvents(true)
    try {
      setMyEvents(await getMyUpcomingEvents(profile.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await onLogout?.()
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="user-menu-wrap" ref={menuRef}>
      <button className="user-menu-button" onClick={() => setIsOpen((open) => !open)}>
        {profile?.name || '회원'}님
      </button>

      {isOpen && (
        <div className="user-menu-panel">
          <div className="user-menu-tabs">
            <button className={activePanel === 'profile' ? 'active' : ''} onClick={() => openPanel('profile')}>내 정보</button>
            <button className={activePanel === 'events' ? 'active' : ''} onClick={() => openPanel('events')}>참석 예정 일정</button>
          </div>

          {activePanel === 'profile' && (
            <dl className="profile-list">
              <div><dt>이름</dt><dd>{profile.name || '-'}</dd></div>
              <div><dt>아이디</dt><dd>{profile.user_id || '-'}</dd></div>
              <div><dt>권한</dt><dd>{profile.role || 'member'}</dd></div>
              <div><dt>테니스 시작일</dt><dd>{profile.tennis_start_date || '-'}</dd></div>
              <div><dt>구력</dt><dd>{formatTennisExperience(profile.tennis_start_date)}</dd></div>
            </dl>
          )}

          {activePanel === 'events' && (
            <div className="my-event-list">
              {loadingEvents && <LoadingState message="참석 일정을 불러오는 중입니다." variant="inline" />}
              {error && <p className="notification-empty">{error}</p>}
              {!loadingEvents && !error && myEvents.length === 0 && <p className="notification-empty">참석 예정 일정이 없습니다.</p>}
              {myEvents.map((event) => {
                const mine = event.tennis_attendances?.find((attendance) => attendance.member_id === profile.id)
                return (
                  <Link key={event.id} to={`/events/${event.id}`} onClick={() => setIsOpen(false)}>
                    <strong>{event.title}</strong>
                    <span>{formatDate(event.event_date)} {event.start_time?.slice(0, 5)}</span>
                    <em>{mine?.status === 'waiting' ? '대기' : '참석'}</em>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="user-menu-footer">
            <button type="button" onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../services/notificationService'

const formatNotificationTime = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

export default function NotificationMenu({ profile }) {
  const menuRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  const load = useCallback(async () => {
    try {
      setError('')
      const nextNotifications = await getNotifications(profile.id)
      setNotifications(nextNotifications)
      return nextNotifications
    } catch (err) {
      setError(err.message)
      return []
    }
  }, [profile.id])

  useEffect(() => {
    if (!profile?.id) return
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [profile?.id, load])

  const handleToggle = async () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)
    if (!nextOpen) return

    const nextNotifications = await load()
    const unreadIds = nextNotifications.filter((notification) => !notification.is_read).map((notification) => notification.id)
    if (unreadIds.length) {
      await markNotificationsRead(unreadIds)
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
    }
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
    <div className="notification-wrap" ref={menuRef}>
      <button className="notification-button" onClick={handleToggle} aria-label="알림">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 9.4c0-3.1-2-5.5-5-6.1V2a1 1 0 0 0-2 0v1.3c-3 .6-5 3-5 6.1v3.2l-1.7 2.8A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9.4Z" />
          <path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" />
        </svg>
        {unreadCount > 0 && <span>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-head">
            <strong>알림</strong>
            <button className="text-button" onClick={() => setIsOpen(false)}>닫기</button>
          </div>

          {error && <p className="notification-empty">{error}</p>}
          {!error && notifications.length === 0 && <p className="notification-empty">새 알림이 없습니다.</p>}

          <ul className="notification-list">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link to={notification.event_id ? `/events/${notification.event_id}` : '/events'} onClick={() => setIsOpen(false)}>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <time>{formatNotificationTime(notification.created_at)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

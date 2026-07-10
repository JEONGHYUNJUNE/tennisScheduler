import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from './EmptyState'
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

const getNotificationLink = (notification) => {
  if (notification.event_id) {
    const params = new URLSearchParams()
    if (notification.tennis_event_comment_id) params.set('comment', notification.tennis_event_comment_id)
    const query = params.toString()
    return query ? `/events/${notification.event_id}?${query}` : `/events/${notification.event_id}`
  }
  if (
    notification.type === 'free_opinion_created' ||
    notification.type === 'free_opinion_comment_created' ||
    notification.type === 'free_opinion_comment_reply_created' ||
    notification.type === 'free_opinion_comment_liked' ||
    notification.type === 'free_opinion_mention' ||
    notification.type === 'free_opinion_comment_mention'
  ) {
    const params = new URLSearchParams()
    if (notification.free_opinion_id) params.set('opinion', notification.free_opinion_id)
    if (notification.free_opinion_comment_id) params.set('comment', notification.free_opinion_comment_id)
    const query = params.toString()
    return query ? `/free-opinions?${query}` : '/free-opinions'
  }
  if (
    notification.type === 'member_inquiry_created' ||
    notification.type === 'member_inquiry_replied' ||
    notification.type === 'member_inquiry_followed_up'
  ) {
    const params = new URLSearchParams({ inquiryTab: 'inbox' })
    if (notification.inquiry_id) params.set('inquiry', notification.inquiry_id)
    return `/mypage?${params.toString()}`
  }
  if (
    notification.type === 'tennis_diary_comment_created' ||
    notification.type === 'tennis_diary_comment_reply_created' ||
    notification.type === 'tennis_diary_liked' ||
    notification.type === 'tennis_diary_comment_liked' ||
    notification.type === 'tennis_diary_entry_mention' ||
    notification.type === 'tennis_diary_comment_mention'
  ) {
    const params = new URLSearchParams()
    if (notification.tennis_diary_entry_id) params.set('entry', notification.tennis_diary_entry_id)
    if (notification.tennis_diary_comment_id) params.set('comment', notification.tennis_diary_comment_id)
    const query = params.toString()
    return query ? `/diary?${query}` : '/diary'
  }
  if (notification.type === 'tennis_diary_group_invited') {
    const params = new URLSearchParams({ diaryTab: 'invites' })
    if (notification.tennis_diary_group_id) params.set('diaryGroup', notification.tennis_diary_group_id)
    return `/mypage?${params.toString()}`
  }
  if (
    notification.type === 'chat_requested' ||
    notification.type === 'chat_message_created' ||
    notification.type === 'chat_message_reaction_created'
  ) {
    return notification.chat_room_id ? `/chats/${notification.chat_room_id}` : '/chats'
  }
  return '/events'
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
      window.dispatchEvent(new CustomEvent('ons-tennis-notification-unread-changed'))
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
            <div>
              <strong>알림</strong>
            </div>
            <button className="text-button" onClick={() => setIsOpen(false)}>닫기</button>
          </div>

          {error && <p className="notification-empty">{error}</p>}
          {!error && notifications.length === 0 && (
            <EmptyState
              compact
              title="새 알림이 없어요."
              description="일정, 댓글, 문의 답변이 오면 여기에 모아둘게요."
            />
          )}

          <ul className="notification-list">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link to={getNotificationLink(notification)} onClick={() => setIsOpen(false)}>
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

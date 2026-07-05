import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { getChatRooms, getRoomUnreadCount, subscribeToChatUpdates } from '../services/chatService'

const formatChatTime = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

function getRoomPreview(room) {
  if (room.status === 'requested') return '채팅 요청 대기 중'
  if (!room.last_message) return '대화가 시작되었습니다.'
  if (room.last_message.message_type === 'image') {
    return room.last_message.image_path?.startsWith('chat-stickers/') ? '이모티콘' : '사진'
  }
  return room.last_message.body
}

export default function ChatListPage() {
  const { profile } = useAuth()
  const refreshTimerRef = useRef(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setRooms(await getChatRooms(profile.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id])

  useEffect(() => {
    load()
    const scheduleLoad = () => {
      if (refreshTimerRef.current) return
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null
        load()
      }, 1500)
    }
    const timer = window.setInterval(load, 60000)
    const unsubscribe = subscribeToChatUpdates(scheduleLoad)
    const handleFocus = () => load()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') load()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      unsubscribe()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [load])

  return (
    <>
      <div className="page-heading main-heading chat-heading">
        <div>
          <p className="eyebrow">CHAT</p>
          <h1>채팅</h1>
          <p className="heading-copy">멤버들과 채팅방에서 대화합니다.</p>
        </div>
      </div>

      {loading && <LoadingState message="채팅방을 불러오는 중입니다." />}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="chat-room-list">
          {rooms.length === 0 && (
            <EmptyState compact title="대화 중인 채팅이 없어요." description="멤버 화면에서 채팅을 요청해보세요." />
          )}
          {rooms.map((room) => {
            const unreadCount = getRoomUnreadCount(room, profile.id)
            const hasRequestBadge = room.status === 'requested' && room.recipient_member_id === profile.id

            return (
              <Link className="chat-room-card" to={`/chats/${room.id}`} key={room.id}>
                <MemberAvatar name={room.other_member.name} imageUrl={room.other_member.avatar_url} />
                <div>
                  <strong>{room.other_member.name}</strong>
                  <p>{getRoomPreview(room)}</p>
                </div>
                <time>{formatChatTime(room.updated_at || room.requested_at)}</time>
                {hasRequestBadge && <em className="chat-room-request-badge">요청</em>}
                {!hasRequestBadge && unreadCount > 0 && (
                  <em className="chat-room-unread-badge" aria-label={`안 읽은 메시지 ${unreadCount}개`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </em>
                )}
              </Link>
            )
          })}
        </section>
      )}
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { getChatRooms, getRoomUnreadCount, isReusableChatStickerPath, parseSearchShare, subscribeToChatUpdates } from '../services/chatService'
import { createGroupChat, getGroupChatRooms, getGroupRoomUnreadCount, isGroupChatStickerPath, subscribeToGroupChatUpdates } from '../services/groupChatService'
import { getMembers } from '../services/memberService'

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
  if (room.last_message.message_type === 'video') return '동영상'
  if (room.last_message.message_type === 'image') {
    return room.last_message.image_path?.startsWith('chat-stickers/') || isReusableChatStickerPath(room.last_message.image_path) ? '이모티콘' : '사진'
  }
  const searchShare = parseSearchShare(room.last_message.body || '')
  if (searchShare) return `#검색공유 ${searchShare.title}`
  return room.last_message.body
}

function getGroupRoomPreview(room) {
  if (!room.last_message) return '단체톡방이 만들어졌습니다.'
  if (room.last_message.message_type === 'system') return room.last_message.body
  if (room.last_message.message_type === 'video') return `${room.last_message.sender_name}: 동영상`
  if (room.last_message.message_type === 'image') {
    const label = isGroupChatStickerPath(room.last_message.image_path) ? '이모티콘' : '사진'
    return `${room.last_message.sender_name}: ${label}`
  }
  return `${room.last_message.sender_name}: ${room.last_message.body}`
}

export default function ChatListPage() {
  const { profile } = useAuth()
  const refreshTimerRef = useRef(null)
  const groupRefreshTimerRef = useRef(null)
  const [rooms, setRooms] = useState([])
  const [groupRooms, setGroupRooms] = useState([])
  const [members, setMembers] = useState([])
  const [activeTab, setActiveTab] = useState('direct')
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [groupLoading, setGroupLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupError, setGroupError] = useState('')

  const selectableMembers = useMemo(
    () => members.filter((member) => member.is_active !== false && member.id !== profile.id),
    [members, profile.id],
  )

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

  const loadGroups = useCallback(async () => {
    setGroupError('')
    try {
      setGroupRooms(await getGroupChatRooms(profile.id))
    } catch (err) {
      setGroupError(err.message)
    } finally {
      setGroupLoading(false)
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

  useEffect(() => {
    loadGroups()
    getMembers()
      .then((nextMembers) => setMembers(nextMembers))
      .catch(() => setMembers([]))

    const scheduleLoad = () => {
      if (groupRefreshTimerRef.current) return
      groupRefreshTimerRef.current = window.setTimeout(() => {
        groupRefreshTimerRef.current = null
        loadGroups()
      }, 1500)
    }
    const timer = window.setInterval(loadGroups, 60000)
    const unsubscribe = subscribeToGroupChatUpdates(scheduleLoad)
    const handleFocus = () => loadGroups()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadGroups()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timer)
      if (groupRefreshTimerRef.current) {
        window.clearTimeout(groupRefreshTimerRef.current)
        groupRefreshTimerRef.current = null
      }
      unsubscribe()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadGroups])

  useEffect(() => {
    if (!groupModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setGroupModalOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [groupModalOpen])

  const handleMemberToggle = (memberId) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ))
  }

  const handleCreateGroup = async (event) => {
    event.preventDefault()
    const trimmedName = groupName.trim()
    if (!trimmedName) return

    setCreatingGroup(true)
    setGroupError('')
    try {
      await createGroupChat(trimmedName, selectedMemberIds)
      setGroupName('')
      setSelectedMemberIds([])
      setGroupModalOpen(false)
      setActiveTab('group')
      await loadGroups()
    } catch (err) {
      setGroupError(err.message || '단체톡을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setCreatingGroup(false)
    }
  }

  return (
    <>
      <div className="page-heading main-heading chat-heading">
        <div>
          <p className="eyebrow">CHAT</p>
          <h1>채팅</h1>
          <p className="heading-copy">멤버들과 채팅방에서 대화합니다.</p>
        </div>
        <button className="event-create-button group-chat-create-button" type="button" onClick={() => setGroupModalOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>단체톡 만들기</span>
        </button>
      </div>

      <div className="chat-list-tabs" role="tablist" aria-label="채팅 종류">
        <button role="tab" aria-selected={activeTab === 'direct'} className={activeTab === 'direct' ? 'active' : ''} type="button" onClick={() => setActiveTab('direct')}>1:1 채팅</button>
        <button role="tab" aria-selected={activeTab === 'group'} className={activeTab === 'group' ? 'active' : ''} type="button" onClick={() => setActiveTab('group')}>단체톡</button>
      </div>

      {activeTab === 'direct' && loading && <LoadingState message="채팅방을 불러오는 중입니다." />}
      {activeTab === 'direct' && error && <p className="error">{error}</p>}

      {activeTab === 'direct' && !loading && !error && (
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

      {activeTab === 'group' && groupLoading && <LoadingState message="단체톡을 불러오는 중입니다." />}
      {activeTab === 'group' && groupError && <p className="error">{groupError}</p>}

      {activeTab === 'group' && !groupLoading && !groupError && (
        <section className="chat-room-list">
          {groupRooms.length === 0 && (
            <EmptyState compact title="참여 중인 단체톡이 없어요." description="단체톡을 만들어 여러 멤버와 함께 대화해보세요." />
          )}
          {groupRooms.map((room) => {
            const unreadCount = getGroupRoomUnreadCount(room, profile.id)
            const preview = getGroupRoomPreview(room)

            return (
              <Link className="chat-room-card group-chat-room-card" to={`/group-chats/${room.id}`} key={room.id}>
                <div className="group-chat-avatar-stack" aria-hidden="true">
                  {room.members.slice(0, 3).map((member) => (
                    <MemberAvatar name={member.name} imageUrl={member.avatar_url} size="sm" key={member.member_id} />
                  ))}
                </div>
                <div>
                  <strong>{room.name}</strong>
                  <p>{preview}</p>
                </div>
                <time>{formatChatTime(room.updated_at || room.created_at)}</time>
                <span className="group-chat-member-count">{room.member_count}명</span>
                {unreadCount > 0 && (
                  <em className="chat-room-unread-badge" aria-label={`안 읽은 메시지 ${unreadCount}개`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </em>
                )}
              </Link>
            )
          })}
        </section>
      )}

      {groupModalOpen && createPortal(
        <div className="inquiry-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setGroupModalOpen(false)
        }}>
          <form className="inquiry-modal group-chat-modal" role="dialog" aria-modal="true" aria-labelledby="group-chat-modal-title" onSubmit={handleCreateGroup}>
            <div className="inquiry-modal-head">
              <div>
                <p className="eyebrow">GROUP CHAT</p>
                <h2 id="group-chat-modal-title">단체톡 만들기</h2>
              </div>
              <button className="icon-close-button" type="button" onClick={() => setGroupModalOpen(false)} aria-label="닫기">×</button>
            </div>
            <label className="diary-member-picker">
              <strong>방 이름</strong>
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="예: 금요 야간반" maxLength={40} />
            </label>
            <div className="diary-member-picker">
              <strong>초대할 멤버</strong>
              <div>
                {selectableMembers.map((member) => (
                  <label key={member.id}>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                    />
                    <MemberAvatar name={member.name} imageUrl={member.avatar_url} size="sm" />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {groupError && <p className="error" role="alert">{groupError}</p>}
            <button className="primary-button" disabled={creatingGroup || !groupName.trim()}>
              {creatingGroup ? '만드는 중...' : '단체톡 만들기'}
            </button>
          </form>
        </div>,
        document.body,
      )}
    </>
  )
}

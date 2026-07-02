import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { acceptChatRoom, chatStickerOptions, endChatRoom, enterChatRoom, getChatMessages, getChatRoom, sendChatImage, sendChatMessage, subscribeToChatRoom } from '../services/chatService'

const formatMessageTime = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

export default function ChatRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const listRef = useRef(null)
  const fileInputRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [stickerOpen, setStickerOpen] = useState(false)

  const isActive = room?.status === 'active'
  const isRequested = room?.status === 'requested'

  const otherMember = useMemo(() => room?.other_member || { name: '회원' }, [room])

  const load = useCallback(async () => {
    setError('')
    try {
      const nextRoom = await getChatRoom(roomId, profile.id)
      if (!nextRoom) {
        setRoom(null)
        setMessages([])
        return
      }
      setRoom(nextRoom)
      setMessages(await getChatMessages(roomId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id, roomId])

  useEffect(() => {
    let ignore = false

    const enterAndLoad = async () => {
      setLoading(true)
      setError('')
      try {
        const nextRoom = await getChatRoom(roomId, profile.id)
        if (!nextRoom) {
          if (!ignore) {
            setRoom(null)
            setMessages([])
          }
          return
        }

        if (
          nextRoom.status === 'requested' &&
          [nextRoom.requester_member_id, nextRoom.recipient_member_id].includes(profile.id)
        ) {
          const acceptedRoom = await acceptChatRoom(roomId)
          if (acceptedRoom?.status === 'requested' && nextRoom.recipient_member_id === profile.id) {
            throw new Error('채팅 요청 수락이 처리되지 않았습니다. SQL 044 적용 여부를 확인해 주세요.')
          }
        } else {
          await enterChatRoom(roomId)
        }
      } catch (err) {
        if (!ignore) setError(err.message)
      }
      if (!ignore) await load()
    }

    enterAndLoad()
    return () => {
      ignore = true
    }
  }, [load, profile.id, roomId])

  useEffect(() => {
    if (!roomId) return undefined
    return subscribeToChatRoom(roomId, {
      onMessage: () => getChatMessages(roomId).then(setMessages).catch((err) => setError(err.message)),
      onRoomChanged: () => load(),
    })
  }, [load, roomId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || !isActive) return

    setSending(true)
    setError('')
    try {
      await sendChatMessage(roomId, trimmed)
      setMessage('')
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleSticker = async (sticker) => {
    if (!isActive) return
    setSending(true)
    setError('')
    try {
      await sendChatMessage(roomId, sticker.value, 'sticker')
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file || !isActive) return

    setSending(true)
    setError('')
    try {
      await sendChatImage(roomId, profile.id, file)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleEnd = async () => {
    const confirmed = window.confirm('채팅을 종료하시겠습니까?\n대화내용이 사라집니다.')
    if (!confirmed) return

    setSending(true)
    setError('')
    try {
      await endChatRoom(roomId)
      navigate('/chats')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <LoadingState message="채팅방을 준비하는 중입니다." />

  if (!room && !error) {
    return (
      <section className="chat-room-shell">
        <p className="error">채팅방을 찾을 수 없습니다.</p>
        <Link className="secondary-button" to="/chats">채팅 목록으로</Link>
      </section>
    )
  }

  return (
    <section className="chat-room-shell">
      <div className="chat-room-head">
        <Link className="chat-back-button" to="/chats" aria-label="채팅 목록으로">‹</Link>
        <MemberAvatar name={otherMember.name} imageUrl={otherMember.avatar_url} size="sm" previewable />
        <div>
          <strong>{otherMember.name}</strong>
          <span>{isActive ? '실시간 채팅 중' : isRequested ? '채팅 요청 중' : '종료됨'}</span>
        </div>
        {room?.status !== 'ended' && (
          <button type="button" className="chat-end-button" onClick={handleEnd} disabled={sending}>종료</button>
        )}
      </div>

      <div className="chat-message-list" ref={listRef}>
        {error && <p className="error chat-inline-error">{error}</p>}
        {messages.map((item) => {
          const mine = item.sender_member_id === profile.id
          if (item.message_type === 'system') {
            return <p className="chat-system-message" key={item.id}>{item.body}</p>
          }

          return (
            <article className={`chat-message ${mine ? 'mine' : 'theirs'} ${item.message_type === 'sticker' ? 'sticker' : ''}`} key={item.id}>
              {!mine && <MemberAvatar name={item.sender_name} imageUrl={item.sender_avatar_url} size="sm" previewable />}
              <div>
                {item.message_type === 'image' && item.image_url ? (
                  <a href={item.image_url} target="_blank" rel="noreferrer">
                    <img src={item.image_url} alt={item.image_name || '채팅 이미지'} />
                  </a>
                ) : (
                  <p>{item.body}</p>
                )}
                <time>{formatMessageTime(item.created_at)}</time>
              </div>
            </article>
          )
        })}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
        <button type="button" className="chat-tool-button" onClick={() => fileInputRef.current?.click()} disabled={!isActive || sending} aria-label="사진 보내기">+</button>
        <input
          value={message}
          placeholder={isActive ? '메시지를 입력하세요.' : '상대가 입장하면 대화할 수 있어요.'}
          onChange={(event) => setMessage(event.target.value)}
          disabled={!isActive || sending}
        />
        <div className="chat-sticker-wrap">
          <button type="button" className="chat-sticker-button" onClick={() => setStickerOpen((current) => !current)} disabled={!isActive || sending} aria-label="이모티콘">☺</button>
          {stickerOpen && (
            <div className="chat-sticker-panel">
              {chatStickerOptions.map((sticker) => (
                <button type="button" key={sticker.label} onClick={() => handleSticker(sticker)} aria-label={sticker.label}>
                  {sticker.value}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="chat-send-button" disabled={!isActive || sending || !message.trim()}>전송</button>
      </form>
    </section>
  )
}

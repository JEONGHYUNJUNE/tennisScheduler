import useChatViewportScroll from '../hooks/useChatViewportScroll'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ImageLightbox from '../components/ImageLightbox'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import chatStickerFaceIcon from '../assets/chat-sticker-face.png'
import { useAuth } from '../contexts/AuthContext'
import { chatStickerOptions, getCustomChatStickers } from '../services/chatService'
import {
  getGroupChatMessage,
  getGroupChatMessages,
  getGroupChatRoom,
  groupChatMessagePageSize,
  isGroupChatStickerPath,
  leaveGroupChat,
  markGroupChatRead,
  sendGroupChatImage,
  sendGroupChatMessage,
  sendGroupChatStickerReference,
  sendGroupChatVideo,
  subscribeToGroupChatRoom,
} from '../services/groupChatService'

const formatMessageTime = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

const formatDateDivider = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateText))
}

function shouldShowDateDivider(previous, current) {
  if (!current?.created_at) return false
  if (!previous?.created_at) return true
  return new Date(previous.created_at).toDateString() !== new Date(current.created_at).toDateString()
}

function getGroupMessageUnreadCount(message, room) {
  if (!message?.created_at || !message.sender_member_id || message.message_type === 'system' || message.deleted_at) return 0

  const messageTime = new Date(message.created_at).getTime()
  return (room?.members || []).filter((member) => {
    if (!member?.member_id || member.member_id === message.sender_member_id) return false
    if (member.left_at) return false
    if (member.joined_at && new Date(member.joined_at).getTime() > messageTime) return false
    if (!member.last_read_at) return true
    return new Date(member.last_read_at).getTime() < messageTime
  }).length
}

function isMobileSoftKeyboardDevice() {
  if (typeof window === 'undefined') return false
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches
  const touchPoints = window.navigator.maxTouchPoints || 0
  return Boolean(coarsePointer || touchPoints > 1)
}

function getStickerImageSrc(sticker) {
  return sticker?.dataUrl || sticker?.image_url || ''
}

export default function GroupChatRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const listRef = useRef(null)
  const readTimerRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [room, setRoom] = useState(null)
  useChatViewportScroll(listRef, room?.id)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [customStickers, setCustomStickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      const list = listRef.current
      if (!list) return
      list.scrollTo({ top: list.scrollHeight, behavior })
    })
  }, [])

  const scheduleMarkRead = useCallback(() => {
    if (readTimerRef.current) window.clearTimeout(readTimerRef.current)
    readTimerRef.current = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return
      markGroupChatRead(roomId)
        .then(() => window.dispatchEvent(new CustomEvent('ons-tennis-chat-unread-changed')))
        .catch(() => {})
    }, 500)
  }, [roomId])

  const loadInitial = useCallback(async () => {
    setError('')
    try {
      const [nextRoom, nextMessages] = await Promise.all([
        getGroupChatRoom(roomId, profile.id),
        getGroupChatMessages(roomId),
      ])
      setRoom(nextRoom)
      setMessages(nextMessages)
      setHasMore(nextMessages.length >= groupChatMessagePageSize)
      scheduleMarkRead()
      scrollToBottom('auto')
      window.setTimeout(() => scrollToBottom('auto'), 120)
    } catch (err) {
      setError(err.message || '단체톡방을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [profile.id, roomId, scheduleMarkRead, scrollToBottom])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    let cancelled = false
    getCustomChatStickers({ memberId: profile.id, roomId: null })
      .then((stickerGroups) => {
        if (cancelled) return
        setCustomStickers((stickerGroups.personal || []).slice(0, 24))
      })
      .catch(() => {
        if (!cancelled) setCustomStickers([])
      })

    return () => {
      cancelled = true
    }
  }, [profile.id])

  useEffect(() => {
    const unsubscribe = subscribeToGroupChatRoom(roomId, {
      onMessage: async (row) => {
        try {
          const nextMessage = await getGroupChatMessage(row.id)
          if (!nextMessage) return
          setMessages((current) => {
            if (current.some((item) => item.id === nextMessage.id)) return current
            return [...current, nextMessage]
          })
          scheduleMarkRead()
          scrollToBottom()
        } catch (err) {
          setError(err.message || '새 메시지를 불러오지 못했습니다.')
        }
      },
      onRoomChanged: (row) => {
        setRoom((current) => current ? { ...current, ...row } : current)
      },
      onMemberChanged: () => {
        getGroupChatRoom(roomId, profile.id)
          .then((nextRoom) => {
            setRoom(nextRoom)
          })
          .catch(() => {})
      },
    })

    return () => {
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current)
      unsubscribe()
    }
  }, [profile.id, roomId, scheduleMarkRead, scrollToBottom])

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') loadInitial()
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [loadInitial])

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return
    const list = listRef.current
    const previousHeight = list?.scrollHeight || 0
    setLoadingMore(true)
    setError('')
    try {
      const olderMessages = await getGroupChatMessages(roomId, { before: messages[0].created_at })
      setMessages((current) => {
        const currentIds = new Set(current.map((item) => item.id))
        return [...olderMessages.filter((item) => !currentIds.has(item.id)), ...current]
      })
      setHasMore(olderMessages.length >= groupChatMessagePageSize)
      window.requestAnimationFrame(() => {
        if (!list) return
        list.scrollTop = list.scrollHeight - previousHeight
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const sendTextMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError('')
    try {
      const sentMessage = await sendGroupChatMessage(roomId, trimmed)
      setMessages((current) => current.some((item) => item.id === sentMessage.id) ? current : [...current, sentMessage])
      setMessage('')
      scheduleMarkRead()
      scrollToBottom()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const appendSentMessage = useCallback((sentMessage) => {
    setMessages((current) => current.some((item) => item.id === sentMessage.id) ? current : [...current, sentMessage])
    scheduleMarkRead()
    scrollToBottom()
  }, [scheduleMarkRead, scrollToBottom])

  const handleSubmit = (event) => {
    event.preventDefault()
    sendTextMessage()
  }

  const handleMessageKeyDown = (event) => {
    if (event.key !== 'Enter' || event.nativeEvent?.isComposing) return
    const isMobile = isMobileSoftKeyboardDevice()
    const shouldSend = isMobile ? event.shiftKey : !event.shiftKey
    if (!shouldSend) return

    event.preventDefault()
    sendTextMessage()
  }

  const keepComposerFocus = (event) => {
    event.preventDefault()
  }

  const toggleStickerPanel = () => {
    setAttachmentSheetOpen(false)
    setStickerOpen((current) => !current)
  }

  const handleSticker = async (sticker) => {
    if (sending || !room) return
    setSending(true)
    setError('')
    try {
      const sentMessage = await sendGroupChatMessage(roomId, sticker.value)
      appendSentMessage(sentMessage)
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleCustomSticker = async (sticker) => {
    if (sending || !room) return
    setSending(true)
    setError('')
    try {
      const sentMessage = await sendGroupChatStickerReference(roomId, sticker)
      appendSentMessage(sentMessage)
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleMediaChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || sending || !room) return

    setAttachmentSheetOpen(false)
    setStickerOpen(false)
    setSending(true)
    setError('')
    try {
      const isVideo = event.currentTarget.accept?.includes('video') || file.type?.startsWith('video/')
      const sentMessage = isVideo
        ? await sendGroupChatVideo(roomId, profile.id, file)
        : await sendGroupChatImage(roomId, profile.id, file)
      appendSentMessage(sentMessage)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('단체톡방을 나갈까요?')) return
    setError('')
    try {
      await leaveGroupChat(roomId)
      window.dispatchEvent(new CustomEvent('ons-tennis-chat-unread-changed'))
      navigate('/chats')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <LoadingState message="단체톡방을 불러오는 중입니다." />

  if (!room && !error) {
    return (
      <div className="chat-room-shell">
        <EmptyState
          compact
          title="단체톡방을 찾을 수 없어요."
          description="이미 나갔거나 삭제된 단체톡방입니다."
          actionLabel="채팅 목록으로"
          actionTo="/chats"
        />
      </div>
    )
  }

  return (
    <section className="chat-room-shell group-chat-room-shell">
      <header className="chat-room-head group-chat-room-head">
        <button className="chat-back-button" type="button" onClick={() => navigate('/chats')} aria-label="뒤로">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>
        <div className="group-chat-avatar-stack" aria-hidden="true">
          {room?.members?.slice(0, 3).map((member) => (
            <MemberAvatar name={member.name} imageUrl={member.avatar_url} size="sm" key={member.member_id} />
          ))}
        </div>
        <div>
          <strong>{room?.name || '단체톡'}</strong>
          <span>{room?.member_count || 0}명 참여 중</span>
        </div>
        <button className="chat-menu-button group-chat-leave-button" type="button" onClick={handleLeave}>나가기</button>
      </header>

      <div className="chat-message-list" ref={listRef}>
        {hasMore && (
          <button className="secondary-button group-chat-load-more" type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? '불러오는 중...' : '이전 대화 보기'}
          </button>
        )}

        {messages.map((item, index) => {
          const mine = item.sender_member_id === profile.id
          const isSystem = item.message_type === 'system'
          const isImageMessage = item.message_type === 'image'
          const isStickerImage = isImageMessage && isGroupChatStickerPath(item.image_path)
          const isEmojiSticker = chatStickerOptions.some((sticker) => sticker.value === item.body?.trim())
          const previous = messages[index - 1]
          const unreadCount = mine ? getGroupMessageUnreadCount(item, room) : 0

          return (
            <div className="chat-message-row" key={item.id}>
              {shouldShowDateDivider(previous, item) && (
                <div className="chat-date-divider">{formatDateDivider(item.created_at)}</div>
              )}
              {isSystem ? (
                <p className="chat-system-message">{item.body}</p>
              ) : (
                <article className={`chat-message ${mine ? 'mine' : 'theirs'} ${isStickerImage ? 'sticker-image' : ''}`}>
                  {!mine && <MemberAvatar name={item.sender_name} imageUrl={item.sender_avatar_url} size="sm" previewable />}
                  <div>
                    {!mine && <span className="group-chat-sender-name">{item.sender_name}</span>}
                    <div className="chat-message-content">
                      {item.deleted_at ? (
                        <p className="chat-message-text deleted">이 메시지는 삭제되었습니다.</p>
                      ) : item.message_type === 'video' && item.image_url ? (
                        <video
                          className="chat-message-video"
                          src={item.image_url}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : isImageMessage && item.image_url ? (
                        isStickerImage ? (
                          <img src={item.image_url} alt={item.image_name || '이모티콘'} />
                        ) : (
                          <ImageLightbox
                            src={item.image_url}
                            alt={item.image_name || '첨부 사진'}
                            className="chat-image-lightbox-trigger"
                          />
                        )
                      ) : (
                        <p className={`chat-message-text ${isEmojiSticker ? 'emoji-only' : ''}`}>{item.body}</p>
                      )}
                    </div>
                    <div className="chat-message-meta">
                      {unreadCount > 0 && <em>{unreadCount}</em>}
                      <time>{formatMessageTime(item.created_at)}</time>
                    </div>
                  </div>
                </article>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="error group-chat-error">{error}</p>}

      <form className="chat-composer group-chat-composer" onSubmit={handleSubmit}>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handleMediaChange} hidden />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleMediaChange} hidden />
        <button
          type="button"
          className="chat-tool-button"
          onMouseDown={keepComposerFocus}
          onTouchStart={keepComposerFocus}
          onPointerDown={keepComposerFocus}
          onClick={() => {
            setStickerOpen(false)
            setAttachmentSheetOpen((current) => !current)
          }}
          disabled={!room || sending}
          aria-label="사진 또는 동영상 보내기"
        >
          +
        </button>
        <textarea
          value={message}
          rows="1"
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder="메시지를 입력하세요."
          disabled={!room || sending}
        />
        <div className="chat-sticker-wrap">
          <button
            type="button"
            className="chat-sticker-button"
            onMouseDown={keepComposerFocus}
            onTouchStart={keepComposerFocus}
            onPointerDown={keepComposerFocus}
            onClick={toggleStickerPanel}
            disabled={!room || sending}
            aria-label="이모티콘"
          >
            <img className="chat-sticker-face-icon" src={chatStickerFaceIcon} alt="" aria-hidden="true" />
          </button>
          {stickerOpen && (
            <div className="chat-sticker-panel">
              {chatStickerOptions.map((sticker) => (
                <button
                  type="button"
                  key={sticker.label}
                  onMouseDown={keepComposerFocus}
                  onTouchStart={keepComposerFocus}
                  onPointerDown={keepComposerFocus}
                  onClick={() => handleSticker(sticker)}
                  aria-label={sticker.label}
                >
                  {sticker.value}
                </button>
              ))}
              {customStickers.length > 0 && <div className="chat-sticker-section-label">내 이모티콘</div>}
              {customStickers.map((sticker) => (
                <span className="chat-custom-sticker-slot" key={sticker.id}>
                  <button
                    type="button"
                    onMouseDown={keepComposerFocus}
                    onTouchStart={keepComposerFocus}
                    onPointerDown={keepComposerFocus}
                    onClick={() => handleCustomSticker(sticker)}
                    aria-label="커스텀 이모티콘 보내기"
                  >
                    <img src={getStickerImageSrc(sticker)} alt="" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="chat-send-button" disabled={!message.trim() || sending || !room}>
          전송
        </button>
      </form>

      {attachmentSheetOpen && (
        <div className="chat-attachment-overlay" onClick={() => setAttachmentSheetOpen(false)}>
          <section className="chat-attachment-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="chat-attachment-head">
              <div>
                <p className="eyebrow">ATTACH</p>
                <h2>단체톡에 보내기</h2>
              </div>
              <button type="button" onClick={() => setAttachmentSheetOpen(false)} aria-label="닫기">×</button>
            </div>
            <div className="chat-attachment-grid">
              <button type="button" onClick={() => photoInputRef.current?.click()}>
                <span>이미지</span>
                <strong>사진 선택</strong>
              </button>
              <button type="button" onClick={() => videoInputRef.current?.click()}>
                <span>영상</span>
                <strong>동영상 선택</strong>
              </button>
            </div>
            <p>동영상은 50MB 이하만 보낼 수 있어요.</p>
          </section>
        </div>
      )}
    </section>
  )
}

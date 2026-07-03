import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { acceptChatRoom, chatStickerOptions, endChatRoom, enterChatRoom, getChatMessages, getChatRoom, sendChatImage, sendChatMessage, sendChatStickerImage, subscribeToChatRoom } from '../services/chatService'

const maxCustomStickers = 6
const customStickerSize = 256

const getCustomStickerStorageKey = (memberId) => `ons-tennis-custom-chat-stickers:${memberId}`

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function createImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 편집하지 못했습니다.'))
    image.src = dataUrl
  })
}

function dataUrlToFile(dataUrl, fileName, mimeType) {
  const [meta, content] = dataUrl.split(',')
  const detectedMime = mimeType || meta.match(/data:(.*?);/)?.[1] || 'image/png'
  const binary = window.atob(content)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], fileName, { type: detectedMime })
}

async function createEditedStickerDataUrl(editor) {
  if (editor.isGif) return editor.dataUrl
  if (!editor.dataUrl) throw new Error('이모티콘으로 만들 이미지를 선택해 주세요.')

  const image = await createImage(editor.dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = customStickerSize
  canvas.height = customStickerSize
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, customStickerSize, customStickerSize)

  const baseScale = Math.max(customStickerSize / image.naturalWidth, customStickerSize / image.naturalHeight)
  const scale = baseScale * editor.scale
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  const x = (customStickerSize - width) / 2 + editor.offsetX
  const y = (customStickerSize - height) / 2 + editor.offsetY

  context.drawImage(image, x, y, width, height)
  return canvas.toDataURL('image/png')
}

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
  const stickerFileInputRef = useRef(null)
  const messageInputRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [stickerOpen, setStickerOpen] = useState(false)
  const [customStickers, setCustomStickers] = useState([])
  const [stickerEditor, setStickerEditor] = useState(null)

  const isActive = room?.status === 'active'
  const isRequested = room?.status === 'requested'

  const otherMember = useMemo(() => room?.other_member || { name: '회원' }, [room])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(getCustomStickerStorageKey(profile.id))
      setCustomStickers(saved ? JSON.parse(saved) : [])
    } catch {
      setCustomStickers([])
    }
  }, [profile.id])

  const saveCustomStickers = useCallback((nextStickers) => {
    const limited = nextStickers.slice(0, maxCustomStickers)
    setCustomStickers(limited)
    window.localStorage.setItem(getCustomStickerStorageKey(profile.id), JSON.stringify(limited))
  }, [profile.id])

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
    await sendTextMessage()
  }

  const resizeMessageInput = (element = messageInputRef.current) => {
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 96)}px`
  }

  const handleMessageChange = (event) => {
    setMessage(event.target.value)
    resizeMessageInput(event.target)
  }

  const sendTextMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || !isActive) return

    setSending(true)
    setError('')
    try {
      await sendChatMessage(roomId, trimmed)
      setMessage('')
      setStickerOpen(false)
      if (messageInputRef.current) messageInputRef.current.style.height = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
    }
  }

  const dismissKeyboard = (event) => {
    if (event.target.closest('a, button, input, textarea, select')) return
    document.activeElement?.blur?.()
    setStickerOpen(false)
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

  const handleCustomSticker = async (sticker) => {
    if (!isActive) return
    setSending(true)
    setError('')
    try {
      const stickerFile = dataUrlToFile(sticker.dataUrl, sticker.name || 'custom-sticker.png', sticker.mime || 'image/png')
      await sendChatStickerImage(roomId, profile.id, stickerFile)
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleStickerFileChange = async (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 이모티콘으로 만들 수 있습니다.')
      return
    }
    if (file.type === 'image/gif' && file.size > 1.5 * 1024 * 1024) {
      setError('움직이는 이모티콘은 1.5MB 이하만 가능합니다.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setStickerEditor((current) => ({
        ...(current || {}),
        dataUrl,
        name: file.name || 'custom-sticker',
        mime: file.type,
        isGif: file.type === 'image/gif',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSaveCustomSticker = async () => {
    if (!stickerEditor) return

    try {
      const dataUrl = await createEditedStickerDataUrl(stickerEditor)
      const stickerFile = dataUrlToFile(
        dataUrl,
        stickerEditor.isGif ? stickerEditor.name : `${stickerEditor.name.replace(/\.[^.]+$/, '') || 'custom-sticker'}.png`,
        stickerEditor.isGif ? stickerEditor.mime : 'image/png',
      )
      if (stickerFile.size > 2 * 1024 * 1024) {
        setError('이모티콘은 2MB 이하로 저장할 수 있습니다.')
        return
      }

      saveCustomStickers([
        ...customStickers,
        {
          id: `${Date.now()}`,
          name: stickerFile.name,
          mime: stickerFile.type,
          dataUrl,
        },
      ])
      setStickerEditor(null)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveCustomSticker = (stickerId) => {
    saveCustomStickers(customStickers.filter((sticker) => sticker.id !== stickerId))
  }

  const openStickerEditor = () => {
    setStickerOpen(false)
    setStickerEditor({
      dataUrl: '',
      name: '',
      mime: '',
      isGif: false,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    })
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

      <div className="chat-message-list" ref={listRef} onPointerDown={dismissKeyboard}>
        {error && <p className="error chat-inline-error">{error}</p>}
        {messages.map((item) => {
          const mine = item.sender_member_id === profile.id
          if (item.message_type === 'system') {
            return <p className="chat-system-message" key={item.id}>{item.body}</p>
          }
          const isCustomStickerImage = item.message_type === 'image' && item.image_path?.startsWith('chat-stickers/')
          const isImageMessage = item.message_type === 'image'

          return (
            <article className={`chat-message ${mine ? 'mine' : 'theirs'} ${item.message_type === 'sticker' ? 'sticker' : ''} ${isCustomStickerImage ? 'sticker-image' : ''}`} key={item.id}>
              {!mine && <MemberAvatar name={item.sender_name} imageUrl={item.sender_avatar_url} size="sm" previewable />}
              <div>
                {isImageMessage && item.image_url ? (
                  isCustomStickerImage ? (
                    <img src={item.image_url} alt={item.image_name || '커스텀 이모티콘'} />
                  ) : (
                    <a href={item.image_url} target="_blank" rel="noreferrer">
                      <img src={item.image_url} alt={item.image_name || '채팅 이미지'} />
                    </a>
                  )
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
        <input ref={stickerFileInputRef} type="file" accept="image/*" onChange={handleStickerFileChange} hidden />
        <button type="button" className="chat-tool-button" onClick={() => fileInputRef.current?.click()} disabled={!isActive || sending} aria-label="사진 보내기">+</button>
        <textarea
          ref={messageInputRef}
          value={message}
          placeholder={isActive ? '메시지를 입력하세요.' : '상대가 입장하면 대화할 수 있어요.'}
          onChange={handleMessageChange}
          disabled={!isActive || sending}
          rows={1}
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
              {customStickers.map((sticker) => (
                <span className="chat-custom-sticker-slot" key={sticker.id}>
                  <button type="button" onClick={() => handleCustomSticker(sticker)} aria-label="커스텀 이모티콘 보내기">
                    <img src={sticker.dataUrl} alt="" />
                  </button>
                  <button type="button" className="chat-custom-sticker-remove" onClick={() => handleRemoveCustomSticker(sticker.id)} aria-label="커스텀 이모티콘 삭제">×</button>
                </span>
              ))}
              {customStickers.length < maxCustomStickers && (
                <button type="button" className="chat-sticker-add-button" onClick={openStickerEditor} aria-label="이모티콘 만들기">
                  +
                </button>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="chat-send-button"
          disabled={!isActive || sending || !message.trim()}
          onPointerDown={(event) => event.preventDefault()}
          onClick={sendTextMessage}
        >
          전송
        </button>
      </form>
      {stickerEditor && (
        <div className="chat-sticker-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-sticker-editor-title">
          <section className="chat-sticker-editor-modal">
            <div className="chat-sticker-editor-head">
              <div>
                <p className="eyebrow">STICKER</p>
                <h2 id="chat-sticker-editor-title">이모티콘 만들기</h2>
              </div>
              <button type="button" onClick={() => setStickerEditor(null)} aria-label="이모티콘 만들기 닫기">×</button>
            </div>
            <button type="button" className="chat-sticker-select-button" onClick={() => stickerFileInputRef.current?.click()}>
              {stickerEditor.dataUrl ? '다른 사진 선택' : '사진 또는 GIF 선택'}
            </button>
            <div className={`chat-sticker-preview ${!stickerEditor.dataUrl ? 'empty' : ''}`}>
              {stickerEditor.dataUrl ? (
                <img
                  src={stickerEditor.dataUrl}
                  alt="커스텀 이모티콘 미리보기"
                  style={stickerEditor.isGif ? undefined : {
                    transform: `translate(${stickerEditor.offsetX}px, ${stickerEditor.offsetY}px) scale(${stickerEditor.scale})`,
                  }}
                />
              ) : (
                <span>이미지를 선택해 주세요</span>
              )}
            </div>
            {stickerEditor.dataUrl && !stickerEditor.isGif && (
              <div className="chat-sticker-controls">
                <label>
                  크기
                  <input type="range" min="1" max="2.6" step="0.05" value={stickerEditor.scale} onChange={(event) => setStickerEditor((current) => ({ ...current, scale: Number(event.target.value) }))} />
                </label>
                <label>
                  좌우
                  <input type="range" min="-80" max="80" step="1" value={stickerEditor.offsetX} onChange={(event) => setStickerEditor((current) => ({ ...current, offsetX: Number(event.target.value) }))} />
                </label>
                <label>
                  상하
                  <input type="range" min="-80" max="80" step="1" value={stickerEditor.offsetY} onChange={(event) => setStickerEditor((current) => ({ ...current, offsetY: Number(event.target.value) }))} />
                </label>
              </div>
            )}
            {stickerEditor.isGif && <p className="chat-sticker-editor-note">GIF는 움직임 유지를 위해 원본 비율로 저장돼요.</p>}
            <div className="chat-sticker-editor-actions">
              <button type="button" onClick={() => setStickerEditor(null)}>취소</button>
              <button type="button" onClick={handleSaveCustomSticker} disabled={!stickerEditor.dataUrl}>저장</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

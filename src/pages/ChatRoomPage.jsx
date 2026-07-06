import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageLightbox from '../components/ImageLightbox'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import chatStickerFaceIcon from '../assets/chat-sticker-face.png'
import { useAuth } from '../contexts/AuthContext'
import { acceptChatRoom, chatMessagePageSize, chatStickerOptions, deleteCustomChatSticker, endChatRoom, enterChatRoom, getChatMessage, getChatMessages, getChatMessagesAround, getChatRoom, getCustomChatStickers, isReusableChatStickerPath, markChatRoomInactive, markChatRoomRead, parseSearchShare, saveCustomChatStickerRecord, searchChatMessages, sendChatImage, sendChatMessage, sendChatStickerReference, sendChatVideo, serializeSearchShare, uploadReusableChatSticker, setChatRoomNotice, subscribeToChatRoom } from '../services/chatService'
import { searchNaver } from '../services/naverSearchService'

const maxCustomStickers = 24
const maxRoomStickers = 24
const maxChatVideoSize = 50 * 1024 * 1024
const maxChatVideoDuration = 60
const videoFileExtensionPattern = /\.(mp4|mov|m4v|webm|3gp|3gpp|3g2|3gpp2)$/i
const stickerPanelSlotCount = 15
const firstCustomStickerPageSize = Math.max(1, stickerPanelSlotCount - chatStickerOptions.length)
const customStickerPageSize = stickerPanelSlotCount
const customStickerSize = 256

const getCustomStickerStorageKey = (memberId) => `ons-tennis-custom-chat-stickers:${memberId}`
const getCustomStickerMigrationKey = (memberId) => `ons-tennis-custom-chat-stickers-migrated:${memberId}`
const getSearchShareDraftKey = (roomId) => `ons-tennis-chat-search-share:${roomId}`
const getCustomStickerPageCount = (stickerCount) => {
  if (stickerCount < firstCustomStickerPageSize) return 1
  const remainingCustomStickers = Math.max(0, stickerCount - firstCustomStickerPageSize)
  const addButtonSlot = stickerCount < maxCustomStickers ? 1 : 0
  return 1 + Math.ceil((remainingCustomStickers + addButtonSlot) / customStickerPageSize)
}

const getStickerImageSrc = (sticker) => sticker.dataUrl || sticker.image_url || ''

function isMobileSoftKeyboardDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
}

function readSearchShareDraft(roomId) {
  try {
    const saved = window.sessionStorage.getItem(getSearchShareDraftKey(roomId))
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function writeSearchShareDraft(roomId, draft) {
  try {
    if (draft) {
      window.sessionStorage.setItem(getSearchShareDraftKey(roomId), JSON.stringify(draft))
    } else {
      window.sessionStorage.removeItem(getSearchShareDraftKey(roomId))
    }
  } catch {
    // Losing this draft is non-critical; the chat itself is unaffected.
  }
}

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

const formatSearchResultTime = (dateText) => {
  if (!dateText) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateText))
}

const getMessagePreview = (item) => {
  if (!item) return ''
  const searchShare = parseSearchShare(item.body || '')
  if (searchShare) return `#검색공유 ${searchShare.title}`
  if (item.message_type === 'sticker') return item.body || '이모티콘'
  if (item.message_type === 'video') return '동영상'
  if (item.message_type === 'image') {
    return isChatStickerImagePath(item.image_path) ? '이모티콘' : '사진'
  }
  return item.body || '메시지'
}

const getMessageCopyText = (item) => {
  if (!item) return ''
  const searchShare = parseSearchShare(item.body || '')
  if (searchShare) return `${searchShare.title}\n${searchShare.snippet}\n${searchShare.link}`
  if (item.message_type === 'video') return item.image_name || item.body || '동영상'
  if (item.message_type === 'image') {
    return isChatStickerImagePath(item.image_path) ? '이모티콘' : (item.image_name || item.body || '사진')
  }
  return item.body || ''
}

const isChatStickerImagePath = (imagePath = '') => (
  imagePath.startsWith('chat-stickers/') || isReusableChatStickerPath(imagePath)
)

const isVideoFile = (file) => file?.type?.startsWith('video/') || videoFileExtensionPattern.test(file?.name || '')

const getVideoDuration = (file) => new Promise((resolve, reject) => {
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  const cleanup = () => {
    window.clearTimeout(timer)
    URL.revokeObjectURL(url)
  }
  const timer = window.setTimeout(() => {
    cleanup()
    resolve(0)
  }, 4000)
  video.preload = 'metadata'
  video.onloadedmetadata = () => {
    cleanup()
    resolve(video.duration || 0)
  }
  video.onerror = () => {
    cleanup()
    reject(new Error('동영상 정보를 확인하지 못했습니다.'))
  }
  video.src = url
})

const createImageElement = (src) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('사진을 불러오지 못했습니다.'))
  image.src = src
})

const canvasToImageFile = (canvas, name) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('편집한 사진을 만들지 못했습니다.'))
      return
    }
    const safeName = name.replace(/\.[^.]+$/, '') || 'chat-photo'
    resolve(new File([blob], `${safeName}-edited.jpg`, { type: 'image/jpeg' }))
  }, 'image/jpeg', 0.88)
})

const getMessageAuthor = (item, profileId) => {
  if (!item) return '회원'
  if (item.sender_member_id === profileId) return '나'
  return item.sender_name || '회원'
}

function mergeRoomPresence(room, updates, profileId) {
  if (!room || !updates) return room
  const nextRoom = { ...room, ...updates }
  const isRequester = nextRoom.requester_member_id === profileId

  return {
    ...nextRoom,
    own_last_read_at: isRequester ? nextRoom.requester_last_read_at : nextRoom.recipient_last_read_at,
    other_last_read_at: isRequester ? nextRoom.recipient_last_read_at : nextRoom.requester_last_read_at,
    own_last_seen_at: isRequester ? nextRoom.requester_last_seen_at : nextRoom.recipient_last_seen_at,
    other_last_seen_at: isRequester ? nextRoom.recipient_last_seen_at : nextRoom.requester_last_seen_at,
  }
}

function mergeMessages(messages, nextMessages) {
  const messageMap = new Map()
  ;[...messages, ...nextMessages].forEach((item) => {
    if (!item?.id) return
    const previous = messageMap.get(item.id)
    messageMap.set(item.id, {
      ...previous,
      ...item,
      reply_to: item.reply_to || previous?.reply_to || null,
      reply_to_message_id: item.reply_to_message_id || previous?.reply_to_message_id || null,
    })
  })

  return [...messageMap.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export default function ChatRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const listRef = useRef(null)
  const photoInputRef = useRef(null)
  const photoCameraInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const videoCameraInputRef = useRef(null)
  const stickerFileInputRef = useRef(null)
  const imageEditorCanvasRef = useRef(null)
  const messageInputRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const shouldScrollToBottomRef = useRef(true)
  const scrollCorrectionTimersRef = useRef([])
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [stickerOpen, setStickerOpen] = useState(false)
  const [customStickers, setCustomStickers] = useState([])
  const [roomStickers, setRoomStickers] = useState([])
  const [customStickerPage, setCustomStickerPage] = useState(0)
  const [stickerEditor, setStickerEditor] = useState(null)
  const [stickerSaveScope, setStickerSaveScope] = useState('personal')
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false)
  const [imageEditor, setImageEditor] = useState(null)
  const [imageEditorLoaded, setImageEditorLoaded] = useState(false)
  const [imageEditorPointer, setImageEditorPointer] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [replyTarget, setReplyTarget] = useState(null)
  const [searchShareOpen, setSearchShareOpen] = useState(false)
  const [searchShareQuery, setSearchShareQuery] = useState('')
  const [searchShareResults, setSearchShareResults] = useState([])
  const [searchShareLoading, setSearchShareLoading] = useState(false)
  const [searchShareError, setSearchShareError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [viewingSearchContext, setViewingSearchContext] = useState(false)

  const isActive = room?.status === 'active'
  const isRequested = room?.status === 'requested'
  const pendingHashQuery = useMemo(() => {
    const trimmed = message.trim()
    if (!trimmed.startsWith('#')) return ''
    return trimmed.replace(/^#+\s*/, '').trim()
  }, [message])
  const showHashSearchPrompt = isActive && pendingHashQuery.length > 0 && !searchShareOpen

  const redrawImageEditor = useCallback(async (editor = imageEditor) => {
    const canvas = imageEditorCanvasRef.current
    if (!canvas || !editor?.url) return

    const image = await createImageElement(editor.url)
    const maxSide = 1100
    const scaleToFit = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvasWidth = Math.max(1, Math.round(image.naturalWidth * scaleToFit))
    const canvasHeight = Math.max(1, Math.round(image.naturalHeight * scaleToFit))
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvasWidth, canvasHeight)

    const editorScale = editor.scale || 1
    const drawWidth = canvasWidth * editorScale
    const drawHeight = canvasHeight * editorScale
    const drawX = (canvasWidth - drawWidth) / 2 + (editor.offsetX || 0) * canvasWidth
    const drawY = (canvasHeight - drawHeight) / 2 + (editor.offsetY || 0) * canvasHeight
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight)

    ;(editor.strokes || []).forEach((stroke) => {
      if (!stroke.points?.length) return
      context.strokeStyle = stroke.color || '#e33d2f'
      context.lineWidth = stroke.size || 7
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      stroke.points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x * canvasWidth, point.y * canvasHeight)
        else context.lineTo(point.x * canvasWidth, point.y * canvasHeight)
      })
      context.stroke()
    })

    setImageEditorLoaded(true)
  }, [imageEditor])

  useEffect(() => {
    if (!imageEditor) return
    let cancelled = false
    setImageEditorLoaded(false)
    redrawImageEditor(imageEditor).catch((err) => {
      if (!cancelled) setError(err.message)
    })
    return () => {
      cancelled = true
    }
  }, [imageEditor, redrawImageEditor])

  const otherMember = useMemo(() => room?.other_member || { name: '회원' }, [room])
  const personalStickerPageCount = useMemo(() => getCustomStickerPageCount(customStickers.length), [customStickers.length])
  const customStickerPageCount = personalStickerPageCount + 1
  const isRoomStickerPage = customStickerPage >= personalStickerPageCount
  const visibleCustomStickers = useMemo(() => {
    if (isRoomStickerPage) return roomStickers
    if (customStickerPage === 0) {
      return customStickers.slice(0, firstCustomStickerPageSize)
    }
    const pageStart = firstCustomStickerPageSize + ((customStickerPage - 1) * customStickerPageSize)
    return customStickers.slice(pageStart, pageStart + customStickerPageSize)
  }, [customStickerPage, customStickers, isRoomStickerPage, roomStickers])

  useEffect(() => {
    const draft = readSearchShareDraft(roomId)
    if (!draft?.open) return

    setSearchShareOpen(true)
    setSearchShareQuery(draft.query || '')
    setSearchShareResults(Array.isArray(draft.results) ? draft.results : [])
    setSearchShareError('')
  }, [roomId])

  useEffect(() => {
    if (!searchShareOpen) return
    writeSearchShareDraft(roomId, {
      open: true,
      query: searchShareQuery,
      results: searchShareResults,
    })
  }, [roomId, searchShareOpen, searchShareQuery, searchShareResults])

  useEffect(() => {
    let ignore = false

    const readLocalStickers = () => {
      try {
        const saved = window.localStorage.getItem(getCustomStickerStorageKey(profile.id))
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }

    const migrateLocalStickers = async (localStickers) => {
      if (!localStickers.length) return []
      if (window.localStorage.getItem(getCustomStickerMigrationKey(profile.id)) === 'db-v1') return []

      const migrated = []
      for (const sticker of localStickers) {
        try {
          let stickerPayload = sticker
          if (!stickerPayload.image_path && stickerPayload.dataUrl) {
            const stickerFile = dataUrlToFile(stickerPayload.dataUrl, stickerPayload.name || 'custom-sticker.png', stickerPayload.mime || 'image/png')
            const uploadedSticker = await uploadReusableChatSticker(profile.id, stickerFile)
            stickerPayload = { ...stickerPayload, ...uploadedSticker }
          }
          if (stickerPayload.image_path) {
            migrated.push(await saveCustomChatStickerRecord({ memberId: profile.id, sticker: stickerPayload }))
          }
        } catch {
          // Keep loading the rest; localStorage remains as a fallback if one item fails.
        }
      }

      window.localStorage.setItem(getCustomStickerMigrationKey(profile.id), 'db-v1')
      return migrated
    }

    const loadStickers = async () => {
      const localStickers = readLocalStickers()
      if (!ignore && localStickers.length) setCustomStickers(localStickers)

      try {
        const stickerGroups = await getCustomChatStickers({ memberId: profile.id, roomId })
        const migratedStickers = await migrateLocalStickers(localStickers)
        const personalByPath = new Map()
        ;[...stickerGroups.personal, ...migratedStickers].forEach((sticker) => {
          personalByPath.set(sticker.image_path || sticker.id, sticker)
        })

        const nextPersonal = [...personalByPath.values()].slice(0, maxCustomStickers)
        if (!ignore) {
          setCustomStickers(nextPersonal)
          setRoomStickers(stickerGroups.room.slice(0, maxRoomStickers))
          window.localStorage.setItem(getCustomStickerStorageKey(profile.id), JSON.stringify(nextPersonal))
        }
      } catch {
        if (!ignore) {
          setCustomStickers(localStickers)
          setRoomStickers([])
        }
      }
    }

    loadStickers()
    return () => {
      ignore = true
    }
  }, [profile.id, roomId])

  const saveLocalPersonalStickers = useCallback((nextStickers) => {
    try {
      window.localStorage.setItem(getCustomStickerStorageKey(profile.id), JSON.stringify(nextStickers))
    } catch {
      // localStorage can be unavailable or full; DB remains the source of truth.
    }
  }, [profile.id])

  const saveCustomStickers = useCallback((nextStickers) => {
    const limited = nextStickers.slice(0, maxCustomStickers)
    setCustomStickers(limited)
    saveLocalPersonalStickers(limited)
  }, [saveLocalPersonalStickers])

  useEffect(() => {
    setCustomStickerPage((current) => Math.min(current, customStickerPageCount - 1))
  }, [customStickerPageCount])

  const appendMessages = useCallback((nextMessages, { scrollToBottom = true } = {}) => {
    const list = Array.isArray(nextMessages) ? nextMessages : [nextMessages]
    if (list.length === 0) return
    shouldScrollToBottomRef.current = scrollToBottom
    setMessages((current) => mergeMessages(current, list))
  }, [])

  const isNearMessageBottom = useCallback(() => {
    const list = listRef.current
    if (!list) return true
    return list.scrollHeight - list.scrollTop - list.clientHeight < 96
  }, [])

  const scrollToMessageBottom = useCallback(({ behavior = 'smooth' } = {}) => {
    const list = listRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior })
    setShowScrollBottom(false)
  }, [])

  const scheduleScrollToBottom = useCallback(({ behavior = 'smooth' } = {}) => {
    scrollCorrectionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    scrollCorrectionTimersRef.current = []

    scrollToMessageBottom({ behavior })
    window.requestAnimationFrame(() => scrollToMessageBottom({ behavior: 'auto' }))

    ;[80, 240, 520].forEach((delay) => {
      const timerId = window.setTimeout(() => scrollToMessageBottom({ behavior: 'auto' }), delay)
      scrollCorrectionTimersRef.current.push(timerId)
    })
  }, [scrollToMessageBottom])

  const load = useCallback(async () => {
    setError('')
    try {
      const nextRoom = await getChatRoom(roomId, profile.id)
      if (!nextRoom) {
        setRoom(null)
        setMessages([])
        setHasMoreMessages(false)
        return
      }
      setRoom(nextRoom)
      const nextMessages = await getChatMessages(roomId)
      shouldScrollToBottomRef.current = true
      setMessages(nextMessages)
      setHasMoreMessages(nextMessages.length === chatMessagePageSize)
      setViewingSearchContext(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id, roomId])

  const markRead = useCallback(async () => {
    if (!roomId) return
    if (document.visibilityState !== 'visible') return

    try {
      const updates = await markChatRoomRead(roomId)
      if (updates) {
        setRoom((current) => mergeRoomPresence(current, updates, profile.id))
        window.dispatchEvent(new CustomEvent('ons-tennis-chat-unread-changed'))
      }
    } catch (err) {
      if (!/mark_one_to_one_chat_read/.test(err.message || '')) setError(err.message)
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
      onMessage: (nextMessage) => getChatMessage(nextMessage.id)
        .then((hydratedMessage) => {
          if (hydratedMessage && !viewingSearchContext) {
            appendMessages(hydratedMessage, { scrollToBottom: isNearMessageBottom() })
          } else if (hydratedMessage) {
            setShowScrollBottom(true)
          }
          markRead()
        })
        .catch((err) => setError(err.message)),
      onRoomChanged: (nextRoom) => {
        if (nextRoom.status === 'ended') {
          load()
          return
        }
        setRoom((current) => mergeRoomPresence(current, nextRoom, profile.id))
        if (nextRoom.notice_message_id) {
          getChatMessage(nextRoom.notice_message_id)
            .then((noticeMessage) => {
              setRoom((current) => current ? { ...current, notice_message: noticeMessage } : current)
            })
            .catch((err) => setError(err.message))
        } else {
          setRoom((current) => current ? { ...current, notice_message: null } : current)
        }
      },
    })
  }, [appendMessages, isNearMessageBottom, load, markRead, profile.id, roomId, viewingSearchContext])

  useEffect(() => {
    if (!isActive) return undefined

    markRead()
    const timerId = window.setInterval(markRead, 40000)
    const handleFocus = () => markRead()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markRead()
      } else {
        markChatRoomInactive(roomId).catch(() => {})
      }
    }
    const handlePageHide = () => {
      markChatRoomInactive(roomId).catch(() => {})
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      markChatRoomInactive(roomId).catch(() => {})
    }
  }, [isActive, markRead, roomId])

  useEffect(() => () => {
    scrollCorrectionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    window.clearTimeout(longPressTimerRef.current)
  }, [])

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = true
      return
    }
    scheduleScrollToBottom()
  }, [messages.length, scheduleScrollToBottom])

  const loadOlderMessages = useCallback(async () => {
    if (!hasMoreMessages || loadingOlder || messages.length === 0) return

    const list = listRef.current
    const previousHeight = list?.scrollHeight || 0
    const previousTop = list?.scrollTop || 0

    setLoadingOlder(true)
    setError('')
    try {
      const olderMessages = await getChatMessages(roomId, { before: messages[0].created_at })
      shouldScrollToBottomRef.current = false
      setMessages((current) => mergeMessages(olderMessages, current))
      setHasMoreMessages(olderMessages.length === chatMessagePageSize)
      window.requestAnimationFrame(() => {
        if (!listRef.current) return
        listRef.current.scrollTop = listRef.current.scrollHeight - previousHeight + previousTop
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingOlder(false)
    }
  }, [hasMoreMessages, loadingOlder, messages, roomId])

  const handleMessageScroll = () => {
    const list = listRef.current
    if (!list) return
    if (list.scrollTop <= 48) loadOlderMessages()
    setShowScrollBottom(!isNearMessageBottom())
  }

  const resizeMessageInput = (element = messageInputRef.current) => {
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 96)}px`
  }

  const clearLongPress = () => {
    window.clearTimeout(longPressTimerRef.current)
  }

  const openMessageActions = (item) => {
    if (!item || item.message_type === 'system') return
    setStickerOpen(false)
    setActionMessage(item)
    window.navigator?.vibrate?.(8)
  }

  const startLongPress = (event, item) => {
    const interactiveTarget = event.target.closest('a, button, input, textarea, select')
    if (interactiveTarget && !interactiveTarget.classList.contains('chat-image-lightbox-trigger')) return
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => openMessageActions(item), 520)
  }

  const handleMessageContextMenu = (event, item) => {
    event.preventDefault()
    openMessageActions(item)
  }

  const highlightMessage = (messageId) => {
    const element = listRef.current?.querySelector(`[data-message-id="${messageId}"]`)
    if (!element) return false
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    element.classList.add('highlight')
    window.setTimeout(() => element.classList.remove('highlight'), 900)
    return true
  }

  const scrollToMessage = (messageId) => {
    if (!highlightMessage(messageId)) {
      setError('이전 메시지를 위로 불러온 뒤 확인할 수 있어요.')
    }
  }

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    const keyword = searchQuery.trim()
    if (!keyword) return

    setSearching(true)
    setSearchError('')
    try {
      const results = await searchChatMessages(roomId, keyword)
      setSearchResults(results)
      if (results.length === 0) setSearchError('검색 결과가 없어요.')
    } catch (err) {
      setSearchError(err.message)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchResultClick = async (item) => {
    setSearchError('')
    setStickerOpen(false)
    if (highlightMessage(item.id)) return

    setLoadingOlder(true)
    try {
      const aroundMessages = await getChatMessagesAround(roomId, item.created_at)
      shouldScrollToBottomRef.current = false
      setMessages(aroundMessages)
      setHasMoreMessages(aroundMessages.length >= chatMessagePageSize)
      setViewingSearchContext(true)
      setShowScrollBottom(true)
      window.setTimeout(() => highlightMessage(item.id), 80)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setLoadingOlder(false)
    }
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
  }

  const handleScrollBottomClick = async () => {
    if (!viewingSearchContext) {
      scheduleScrollToBottom()
      return
    }

    setLoadingOlder(true)
    setError('')
    try {
      const latestMessages = await getChatMessages(roomId)
      shouldScrollToBottomRef.current = true
      setMessages(latestMessages)
      setHasMoreMessages(latestMessages.length === chatMessagePageSize)
      setViewingSearchContext(false)
      window.setTimeout(() => scheduleScrollToBottom({ behavior: 'auto' }), 80)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleReplyToMessage = () => {
    if (!actionMessage) return
    setReplyTarget(actionMessage)
    setActionMessage(null)
    window.requestAnimationFrame(() => messageInputRef.current?.focus())
  }

  const handleSetNotice = async () => {
    if (!actionMessage) return

    setSending(true)
    setError('')
    try {
      const updates = await setChatRoomNotice(roomId, actionMessage.id)
      setRoom((current) => ({
        ...mergeRoomPresence(current, updates, profile.id),
        notice_message: actionMessage,
      }))
      setActionMessage(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleCopyMessage = async () => {
    if (!actionMessage) return

    const text = getMessageCopyText(actionMessage)
    if (!text) {
      setActionMessage(null)
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setError('')
    } catch {
      setError('복사하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setActionMessage(null)
    }
  }

  const handleMessageChange = (event) => {
    setMessage(event.target.value)
    resizeMessageInput(event.target)
  }

  const handleMessageKeyDown = (event) => {
    if (event.key !== 'Enter' || event.nativeEvent?.isComposing) return
    const isMobile = isMobileSoftKeyboardDevice()
    const shouldSend = isMobile ? event.shiftKey : !event.shiftKey
    if (!shouldSend) return

    event.preventDefault()
    sendTextMessage()
  }

  const toggleStickerPanel = () => {
    setSearchShareOpen(false)
    setStickerOpen((current) => !current)
    window.requestAnimationFrame(() => messageInputRef.current?.focus())
  }

  const keepComposerFocus = (event) => {
    event.preventDefault()
  }

  const appendSentMessage = async (sentMessage) => {
    if (!viewingSearchContext) {
      appendMessages(sentMessage)
      return
    }

    const latestMessages = await getChatMessages(roomId)
    shouldScrollToBottomRef.current = true
    setMessages(mergeMessages(latestMessages, [sentMessage]))
    setHasMoreMessages(latestMessages.length === chatMessagePageSize)
    setViewingSearchContext(false)
    window.setTimeout(() => scheduleScrollToBottom({ behavior: 'auto' }), 80)
  }

  const runSearchShare = async (query = searchShareQuery) => {
    const keyword = query.trim()
    if (!keyword) return

    setSearchShareLoading(true)
    setSearchShareError('')
    try {
      setSearchShareResults(await searchNaver(keyword))
    } catch (err) {
      setSearchShareError(err.message)
      setSearchShareResults([])
    } finally {
      setSearchShareLoading(false)
    }
  }

  const openSearchShare = () => {
    if (!pendingHashQuery) return
    setStickerOpen(false)
    setSearchShareOpen(true)
    setSearchShareQuery(pendingHashQuery)
    setSearchShareResults([])
    setSearchShareError('')
    writeSearchShareDraft(roomId, {
      open: true,
      query: pendingHashQuery,
      results: [],
    })
    runSearchShare(pendingHashQuery)
  }

  const closeSearchShare = () => {
    setSearchShareOpen(false)
    setSearchShareLoading(false)
    setSearchShareError('')
    writeSearchShareDraft(roomId, null)
    window.requestAnimationFrame(() => messageInputRef.current?.focus())
  }

  const handleSearchShareSubmit = (event) => {
    event.preventDefault()
    runSearchShare()
  }

  const handleShareSearchResult = async (result) => {
    if (!isActive) return

    setSending(true)
    setError('')
    try {
      const currentReplyTarget = replyTarget
      const sentMessage = await sendChatMessage(roomId, serializeSearchShare(result), 'text', { replyToMessageId: replyTarget?.id || null })
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setMessage('')
      setReplyTarget(null)
      setSearchShareOpen(false)
      setSearchShareResults([])
      setSearchShareError('')
      writeSearchShareDraft(roomId, null)
      if (messageInputRef.current) messageInputRef.current.style.height = ''
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
    }
  }

  const sendTextMessage = async () => {
    const trimmed = message.trim()
    if (!trimmed || !isActive) return

    setSending(true)
    setError('')
    try {
      const currentReplyTarget = replyTarget
      const sentMessage = await sendChatMessage(roomId, trimmed, 'text', { replyToMessageId: replyTarget?.id || null })
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setMessage('')
      setReplyTarget(null)
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
    setSearchShareOpen(false)
  }

  const handleSticker = async (sticker) => {
    if (!isActive) return
    setSending(true)
    setError('')
    try {
      const currentReplyTarget = replyTarget
      const sentMessage = await sendChatMessage(roomId, sticker.value, 'sticker', { replyToMessageId: replyTarget?.id || null })
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setReplyTarget(null)
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
    }
  }

  const handleCustomSticker = async (sticker) => {
    if (!isActive) return
    setSending(true)
    setError('')
    try {
      const currentReplyTarget = replyTarget
      let stickerPayload = sticker

      if (!stickerPayload.image_path) {
        const stickerFile = dataUrlToFile(sticker.dataUrl, sticker.name || 'custom-sticker.png', sticker.mime || 'image/png')
        const uploadedSticker = await uploadReusableChatSticker(profile.id, stickerFile)
        stickerPayload = await saveCustomChatStickerRecord({ memberId: profile.id, roomId: sticker.room_id || null, sticker: { ...stickerPayload, ...uploadedSticker } })
        if (sticker.room_id) {
          setRoomStickers((current) => current.map((item) => (item.id === sticker.id ? stickerPayload : item)))
        } else {
          saveCustomStickers(customStickers.map((item) => (item.id === sticker.id ? stickerPayload : item)))
        }
      }

      const sentMessage = await sendChatStickerReference(roomId, stickerPayload, { replyToMessageId: replyTarget?.id || null })
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setReplyTarget(null)
      setStickerOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
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
      const uploadedSticker = await uploadReusableChatSticker(profile.id, stickerFile)
      const savedSticker = await saveCustomChatStickerRecord({
        memberId: profile.id,
        roomId: stickerSaveScope === 'room' ? roomId : null,
        sticker: {
          name: stickerFile.name,
          mime: stickerFile.type,
          dataUrl,
          ...uploadedSticker,
        },
      })

      if (stickerSaveScope === 'room') {
        setRoomStickers((current) => [...current, savedSticker].slice(0, maxRoomStickers))
        setCustomStickerPage(personalStickerPageCount)
      } else {
        const nextStickers = [...customStickers, savedSticker].slice(0, maxCustomStickers)
        saveCustomStickers(nextStickers)
        setCustomStickerPage(getCustomStickerPageCount(nextStickers.length) - 1)
      }
      setStickerEditor(null)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveCustomSticker = async (sticker) => {
    try {
      await deleteCustomChatSticker(sticker.id)
    } catch (err) {
      setError(err.message)
      return
    }

    if (sticker.room_id) {
      setRoomStickers((current) => current.filter((item) => item.id !== sticker.id))
    } else {
      saveCustomStickers(customStickers.filter((item) => item.id !== sticker.id))
    }
  }

  const openStickerEditor = () => {
    setStickerOpen(false)
    setStickerSaveScope(isRoomStickerPage ? 'room' : 'personal')
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

  const sendMediaFile = async (file, { edited = false } = {}) => {
    if (!file || !isActive) return
    setSending(true)
    setError('')
    try {
      const currentReplyTarget = replyTarget
      let sentMessage
      if (file.type.startsWith('image/')) {
        sentMessage = await sendChatImage(roomId, profile.id, file, { replyToMessageId: replyTarget?.id || null })
      } else if (isVideoFile(file)) {
        if (file.size > maxChatVideoSize) throw new Error('동영상은 50MB 이하만 보낼 수 있습니다.')
        const duration = await getVideoDuration(file)
        if (duration > maxChatVideoDuration + 0.5) throw new Error('동영상은 1분 이하만 보낼 수 있습니다.')
        sentMessage = await sendChatVideo(roomId, profile.id, file, { replyToMessageId: replyTarget?.id || null })
      } else {
        throw new Error('사진 또는 동영상 파일만 보낼 수 있습니다.')
      }
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setReplyTarget(null)
      if (edited) setImageEditor(null)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
    }
  }

  const openImageEditor = (file) => {
    const url = URL.createObjectURL(file)
    if (imageEditor?.url) URL.revokeObjectURL(imageEditor.url)
    setAttachmentSheetOpen(false)
    setStickerOpen(false)
    setImageEditor({
      file,
      url,
      name: file.name,
      editing: false,
      mode: 'move',
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      color: '#e33d2f',
      brushSize: 7,
      strokes: [],
    })
  }

  const handleMediaChange = async (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file || !isActive) return

    if (file.type.startsWith('image/')) {
      openImageEditor(file)
      return
    }

    setAttachmentSheetOpen(false)
    await sendMediaFile(file)
  }

  const closeImageEditor = () => {
    if (imageEditor?.url) URL.revokeObjectURL(imageEditor.url)
    setImageEditor(null)
    setImageEditorLoaded(false)
    setImageEditorPointer(null)
  }

  const getCanvasPoint = (event) => {
    const canvas = imageEditorCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX
    const clientY = event.clientY ?? event.touches?.[0]?.clientY
    if (clientX == null || clientY == null) return null
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    }
  }

  const startImageEditorPointer = (event) => {
    if (!imageEditorLoaded || !imageEditor?.editing) return
    event.preventDefault()
    const point = getCanvasPoint(event)
    if (!point) return

    if (imageEditor.mode === 'draw') {
      setImageEditorPointer({ mode: 'draw' })
      setImageEditor((current) => ({
        ...current,
        strokes: [
          ...(current?.strokes || []),
          { color: current?.color || '#e33d2f', size: current?.brushSize || 7, points: [point] },
        ],
      }))
      return
    }

    setImageEditorPointer({
      mode: 'move',
      startX: point.x,
      startY: point.y,
      offsetX: imageEditor.offsetX || 0,
      offsetY: imageEditor.offsetY || 0,
    })
  }

  const moveImageEditorPointer = (event) => {
    if (!imageEditorPointer) return
    event.preventDefault()
    const point = getCanvasPoint(event)
    if (!point) return

    if (imageEditorPointer.mode === 'move') {
      setImageEditor((current) => ({
        ...current,
        offsetX: imageEditorPointer.offsetX + point.x - imageEditorPointer.startX,
        offsetY: imageEditorPointer.offsetY + point.y - imageEditorPointer.startY,
      }))
      return
    }

    setImageEditor((current) => {
      const strokes = [...(current?.strokes || [])]
      const lastStroke = strokes.at(-1)
      if (!lastStroke) return current
      strokes[strokes.length - 1] = {
        ...lastStroke,
        points: [...lastStroke.points, point],
      }
      return { ...current, strokes }
    })
  }

  const undoImageStroke = () => {
    setImageEditor((current) => ({
      ...current,
      strokes: (current?.strokes || []).slice(0, -1),
    }))
  }

  const sendEditedImage = async () => {
    const canvas = imageEditorCanvasRef.current
    if (!canvas || !imageEditor) return
    const editedFile = await canvasToImageFile(canvas, imageEditor.name)
    const sent = await sendMediaFile(editedFile, { edited: true })
    if (sent && imageEditor.url) URL.revokeObjectURL(imageEditor.url)
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
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendTextMessage()
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

  const renderMessageBody = (item, isImageMessage, isCustomStickerImage) => {
    const searchShare = parseSearchShare(item.body || '')
    if (searchShare) {
      return (
        <a
          className="chat-search-share-card"
          href={searchShare.link}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <span>#검색공유</span>
          <strong>{searchShare.title}</strong>
          {searchShare.snippet && <em>{searchShare.snippet}</em>}
          <small>{searchShare.source || '검색 결과'} ↗</small>
        </a>
      )
    }

    if (item.message_type === 'video' && item.image_url) {
      return (
        <video
          className="chat-message-video"
          src={item.image_url}
          controls
          playsInline
          preload="metadata"
        />
      )
    }

    if (isImageMessage && item.image_url) {
      if (isCustomStickerImage) {
        return <img src={item.image_url} alt={item.image_name || '커스텀 이모티콘'} />
      }
      return (
        <ImageLightbox src={item.image_url} alt={item.image_name || '채팅 이미지'} className="chat-image-lightbox-trigger" />
      )
    }

    return <span className="chat-message-text">{item.body}</span>
  }

  return (
    <section className="chat-room-shell">
      <div className="chat-room-head">
        <Link className="chat-back-button" to="/chats" aria-label="채팅 목록으로">‹</Link>
        <MemberAvatar name={otherMember.name} imageUrl={otherMember.avatar_url} size="sm" previewable />
        <div>
          <strong>{otherMember.name}</strong>
          <span>{isActive ? '채팅 중' : isRequested ? '채팅 요청 중' : '종료됨'}</span>
        </div>
        <button
          type="button"
          className={`chat-search-toggle ${searchOpen ? 'active' : ''}`}
          onClick={() => setSearchOpen((current) => !current)}
          aria-label="채팅 검색"
        >
          ⌕
        </button>
        {room?.status !== 'ended' && (
          <button type="button" className="chat-end-button" onClick={handleEnd} disabled={sending}>종료</button>
        )}
      </div>
      <div className="chat-message-list" ref={listRef} onScroll={handleMessageScroll} onPointerDown={dismissKeyboard}>
        {searchOpen && (
          <section className="chat-search-panel">
            <form className="chat-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="채팅 내용 검색"
                autoFocus
              />
              <button type="submit" disabled={searching || !searchQuery.trim()}>
                {searching ? '검색 중' : '검색'}
              </button>
              <button type="button" onClick={closeSearch} aria-label="검색 닫기">×</button>
            </form>
            {searchError && <p>{searchError}</p>}
            {searchResults.length > 0 && (
              <div className="chat-search-results">
                {searchResults.map((result) => (
                  <button type="button" key={result.id} onClick={() => handleSearchResultClick(result)}>
                    <strong>{result.sender_name || '회원'}</strong>
                    <span>{getMessagePreview(result)}</span>
                    <time>{formatSearchResultTime(result.created_at)}</time>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        {room?.notice_message && (
          <button type="button" className="chat-notice-bar" onClick={() => scrollToMessage(room.notice_message.id)}>
            <span>공지</span>
            <strong>{getMessageAuthor(room.notice_message, profile.id)}</strong>
            <em>{getMessagePreview(room.notice_message)}</em>
          </button>
        )}
        {loadingOlder && <p className="chat-system-message">이전 대화를 불러오는 중입니다.</p>}
        {error && <p className="error chat-inline-error">{error}</p>}
        {messages.map((item) => {
          const mine = item.sender_member_id === profile.id
          if (item.message_type === 'system') {
            return <p className="chat-system-message" key={item.id}>{item.body}</p>
          }
          const isCustomStickerImage = item.message_type === 'image' && isChatStickerImagePath(item.image_path)
          const isImageMessage = item.message_type === 'image'
          const isReadByOther = mine &&
            room?.other_last_read_at &&
            new Date(room.other_last_read_at) >= new Date(item.created_at)

          return (
            <article
              className={`chat-message ${mine ? 'mine' : 'theirs'} ${item.message_type === 'sticker' ? 'sticker' : ''} ${isCustomStickerImage ? 'sticker-image' : ''}`}
              key={item.id}
              data-message-id={item.id}
              onContextMenu={(event) => handleMessageContextMenu(event, item)}
              onPointerDown={(event) => startLongPress(event, item)}
              onDragStart={(event) => event.preventDefault()}
              onSelectStart={(event) => event.preventDefault()}
              onPointerUp={clearLongPress}
              onPointerCancel={clearLongPress}
              onPointerLeave={clearLongPress}
            >
              {!mine && <MemberAvatar name={item.sender_name} imageUrl={item.sender_avatar_url} size="sm" previewable />}
              <div>
                {item.reply_to && (
                  <div className="chat-reply-bubble">
                    <button type="button" className="chat-message-reply-context" onClick={() => scrollToMessage(item.reply_to.id)}>
                      <strong>{getMessageAuthor(item.reply_to, profile.id)}에게 답장</strong>
                      <span>{getMessagePreview(item.reply_to)}</span>
                    </button>
                    {renderMessageBody(item, isImageMessage, isCustomStickerImage)}
                  </div>
                )}
                {!item.reply_to && renderMessageBody(item, isImageMessage, isCustomStickerImage)}
                <span className="chat-message-meta">
                  {isReadByOther && <em>읽음</em>}
                  <time>{formatMessageTime(item.created_at)}</time>
                </span>
              </div>
            </article>
          )
        })}
      </div>
      {showScrollBottom && (
        <button
          type="button"
          className="chat-scroll-bottom-button"
          onClick={handleScrollBottomClick}
          aria-label="최신 메시지로 이동"
        >
          ↓
        </button>
      )}

      <form className="chat-composer" onSubmit={handleSubmit}>
        {replyTarget && (
          <div className="chat-reply-composer">
            <div>
              <strong><em>답장 중</em>{getMessageAuthor(replyTarget, profile.id)}에게 답장</strong>
              <span>{getMessagePreview(replyTarget)}</span>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} aria-label="답장 취소">×</button>
          </div>
        )}
        {showHashSearchPrompt && (
          <button
            type="button"
            className="chat-hash-search-prompt"
            onMouseDown={keepComposerFocus}
            onTouchStart={keepComposerFocus}
            onPointerDown={keepComposerFocus}
            onClick={openSearchShare}
          >
            <span>#</span>
            <strong>네이버 검색으로 공유하기</strong>
            <em>{pendingHashQuery}</em>
          </button>
        )}
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handleMediaChange} hidden />
        <input ref={photoCameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleMediaChange} hidden />
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleMediaChange} hidden />
        <input ref={videoCameraInputRef} type="file" accept="video/*" capture="environment" onChange={handleMediaChange} hidden />
        <input ref={stickerFileInputRef} type="file" accept="image/*" onChange={handleStickerFileChange} hidden />
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
          disabled={!isActive || sending}
          aria-label="사진 또는 동영상 보내기"
        >
          +
        </button>
        <textarea
          ref={messageInputRef}
          value={message}
          placeholder={isActive ? '메시지를 입력하세요.' : '상대가 입장하면 대화할 수 있어요.'}
          onChange={handleMessageChange}
          onKeyDown={handleMessageKeyDown}
          disabled={!isActive}
          rows={1}
        />
        <div className="chat-sticker-wrap">
          <button
            type="button"
            className="chat-sticker-button"
            onMouseDown={keepComposerFocus}
            onTouchStart={keepComposerFocus}
            onPointerDown={keepComposerFocus}
            onClick={toggleStickerPanel}
            disabled={!isActive || sending}
            aria-label="이모티콘"
          >
            <img className="chat-sticker-face-icon" src={chatStickerFaceIcon} alt="" aria-hidden="true" />
          </button>
          {stickerOpen && (
            <div className="chat-sticker-panel">
              {isRoomStickerPage && <div className="chat-sticker-section-label">이 채팅방 공유</div>}
              {customStickerPage === 0 && chatStickerOptions.map((sticker) => (
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
              {visibleCustomStickers.map((sticker) => (
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
                  {(!sticker.room_id || sticker.owner_member_id === profile.id) && (
                    <button
                      type="button"
                      className="chat-custom-sticker-remove"
                      onMouseDown={keepComposerFocus}
                      onTouchStart={keepComposerFocus}
                      onPointerDown={keepComposerFocus}
                      onClick={() => handleRemoveCustomSticker(sticker)}
                      aria-label="커스텀 이모티콘 삭제"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!isRoomStickerPage && customStickerPage === personalStickerPageCount - 1 && customStickers.length < maxCustomStickers && (
                <button
                  type="button"
                  className="chat-sticker-add-button"
                  onMouseDown={keepComposerFocus}
                  onTouchStart={keepComposerFocus}
                  onPointerDown={keepComposerFocus}
                  onClick={openStickerEditor}
                  aria-label="개인 이모티콘 만들기"
                >
                  +
                </button>
              )}
              {isRoomStickerPage && roomStickers.length < maxRoomStickers && (
                <button
                  type="button"
                  className="chat-sticker-add-button"
                  onMouseDown={keepComposerFocus}
                  onTouchStart={keepComposerFocus}
                  onPointerDown={keepComposerFocus}
                  onClick={openStickerEditor}
                  aria-label="채팅방 공유 이모티콘 만들기"
                >
                  +
                </button>
              )}
              {customStickerPageCount > 1 && (
                <div className="chat-sticker-pager">
                  <button
                    type="button"
                    onMouseDown={keepComposerFocus}
                    onTouchStart={keepComposerFocus}
                    onPointerDown={keepComposerFocus}
                    onClick={() => setCustomStickerPage((current) => Math.max(0, current - 1))}
                    disabled={customStickerPage === 0}
                    aria-label="이전 이모티콘 페이지"
                  >
                    ‹
                  </button>
                  <span>{customStickerPage + 1} / {customStickerPageCount}</span>
                  <button
                    type="button"
                    onMouseDown={keepComposerFocus}
                    onTouchStart={keepComposerFocus}
                    onPointerDown={keepComposerFocus}
                    onClick={() => setCustomStickerPage((current) => Math.min(customStickerPageCount - 1, current + 1))}
                    disabled={customStickerPage >= customStickerPageCount - 1}
                    aria-label="다음 이모티콘 페이지"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="chat-send-button"
          disabled={!isActive || sending || !message.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onPointerDown={(event) => event.preventDefault()}
          onClick={sendTextMessage}
        >
          전송
        </button>
      </form>
      {attachmentSheetOpen && (
        <div className="chat-attachment-overlay" onClick={() => setAttachmentSheetOpen(false)}>
          <section className="chat-attachment-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="chat-attachment-head">
              <div>
                <p className="eyebrow">ATTACH</p>
                <h2>보낼 항목 선택</h2>
              </div>
              <button type="button" onClick={() => setAttachmentSheetOpen(false)} aria-label="첨부 닫기">×</button>
            </div>
            <div className="chat-attachment-grid">
              <button type="button" onClick={() => photoInputRef.current?.click()}>
                <span>사진</span>
                <strong>사진 선택</strong>
              </button>
              <button type="button" onClick={() => photoCameraInputRef.current?.click()}>
                <span>촬영</span>
                <strong>사진 찍기</strong>
              </button>
              <button type="button" onClick={() => videoInputRef.current?.click()}>
                <span>영상</span>
                <strong>동영상 선택</strong>
              </button>
              <button type="button" onClick={() => videoCameraInputRef.current?.click()}>
                <span>녹화</span>
                <strong>동영상 찍기</strong>
              </button>
            </div>
            <p></p>
          </section>
        </div>
      )}
      {imageEditor && (
        <div className="chat-photo-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-photo-editor-title">
          <section className="chat-photo-editor-modal">
            <div className="chat-photo-editor-head">
              <div>
                <p className="eyebrow">PHOTO</p>
                <h2 id="chat-photo-editor-title">사진 편집기</h2>
              </div>
              <button type="button" onClick={closeImageEditor} aria-label="사진 편집기 닫기">×</button>
            </div>
            <div className="chat-photo-editor-stage">
              {!imageEditorLoaded && <span>사진을 준비하는 중입니다.</span>}
              <canvas
                ref={imageEditorCanvasRef}
                className={imageEditor.editing ? 'editing' : ''}
                onPointerDown={startImageEditorPointer}
                onPointerMove={moveImageEditorPointer}
                onPointerUp={() => setImageEditorPointer(null)}
                onPointerCancel={() => setImageEditorPointer(null)}
                onPointerLeave={() => setImageEditorPointer(null)}
              />
            </div>
            {imageEditor.editing && (
              <div className="chat-photo-editor-tools">
                <div className="chat-photo-mode-toggle" role="group" aria-label="사진 편집 모드">
                  <button
                    type="button"
                    className={imageEditor.mode === 'move' ? 'active' : ''}
                    onClick={() => setImageEditor((current) => ({ ...current, mode: 'move' }))}
                  >
                    이동
                  </button>
                  <button
                    type="button"
                    className={imageEditor.mode === 'draw' ? 'active' : ''}
                    onClick={() => setImageEditor((current) => ({ ...current, mode: 'draw' }))}
                  >
                    펜
                  </button>
                </div>
                <label>
                  확대
                  <input
                    type="range"
                    min="1"
                    max="2.2"
                    step="0.05"
                    value={imageEditor.scale}
                    onChange={(event) => setImageEditor((current) => ({ ...current, scale: Number(event.target.value) }))}
                  />
                </label>
                {imageEditor.mode === 'draw' && (
                  <>
                    <label>
                      굵기
                      <input
                        type="range"
                        min="3"
                        max="18"
                        step="1"
                        value={imageEditor.brushSize}
                        onChange={(event) => setImageEditor((current) => ({ ...current, brushSize: Number(event.target.value) }))}
                      />
                    </label>
                    <div className="chat-photo-color-row" role="group" aria-label="펜 색상">
                      {['#e33d2f', '#27864f', '#1e67d8', '#f0b429', '#111111', '#ffffff'].map((color) => (
                        <button
                          type="button"
                          key={color}
                          className={imageEditor.color === color ? 'active' : ''}
                          style={{ backgroundColor: color }}
                          onClick={() => setImageEditor((current) => ({ ...current, color }))}
                          aria-label={`${color} 펜 색상`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="chat-photo-editor-actions">
              <button type="button" onClick={sendEditedImage} disabled={sending || !imageEditorLoaded}>
                {sending ? '전송 중' : '전송'}
              </button>
              <button type="button" onClick={() => setImageEditor((current) => ({ ...current, editing: !current.editing }))}>
                {imageEditor.editing ? '편집 닫기' : '편집'}
              </button>
              {imageEditor.editing && (
                <button type="button" onClick={undoImageStroke} disabled={!imageEditor.strokes.length}>되돌리기</button>
              )}
              <button type="button" onClick={closeImageEditor}>취소</button>
            </div>
          </section>
        </div>
      )}
      {searchShareOpen && (
        <div className="chat-search-share-overlay" onClick={closeSearchShare}>
          <section className="chat-search-share-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="chat-search-share-head">
              <div>
                <p className="eyebrow"># SEARCH</p>
                <h2># 검색</h2>
              </div>
              <button type="button" onClick={closeSearchShare} aria-label="검색 닫기">×</button>
            </div>
            <form className="chat-search-share-form" onSubmit={handleSearchShareSubmit}>
              <input
                value={searchShareQuery}
                onChange={(event) => setSearchShareQuery(event.target.value)}
                placeholder="검색어를 입력하세요"
                autoFocus
              />
              <button type="submit" disabled={searchShareLoading || !searchShareQuery.trim()}>
                {searchShareLoading ? '검색 중' : '검색'}
              </button>
            </form>
            <p className="chat-search-share-helper">검색 결과는 공유 전 미리보기만 표시돼요.</p>
            {searchShareError && <p className="chat-search-share-error">{searchShareError}</p>}
            <div className="chat-search-share-results">
              {searchShareLoading && [0, 1, 2].map((item) => (
                <div className="chat-search-share-skeleton" key={item} />
              ))}
              {!searchShareLoading && searchShareResults.map((result) => (
                <article className="chat-search-share-result" key={`${result.link}-${result.title}`}>
                  <div>
                    <strong>{result.title}</strong>
                    {result.snippet && <p>{result.snippet}</p>}
                    <span>{result.source || result.link}</span>
                  </div>
                  <div className="chat-search-share-result-actions">
                    <a href={result.link} target="_blank" rel="noreferrer">보기</a>
                    <button type="button" onClick={() => handleShareSearchResult(result)} disabled={sending}>
                      공유
                    </button>
                  </div>
                </article>
              ))}
              {!searchShareLoading && !searchShareError && searchShareResults.length === 0 && (
                <p className="chat-search-share-empty">검색 결과가 없습니다.</p>
              )}
            </div>
          </section>
        </div>
      )}
      {actionMessage && (
        <div className="chat-action-overlay" onClick={() => setActionMessage(null)}>
          <div className="chat-action-menu" onClick={(event) => event.stopPropagation()}>
            <p>
              <strong>{getMessageAuthor(actionMessage, profile.id)}</strong>
              <span>{getMessagePreview(actionMessage)}</span>
            </p>
            <button type="button" onClick={handleReplyToMessage}>답장</button>
            <button type="button" onClick={handleSetNotice} disabled={sending}>공지</button>
            <button type="button" onClick={handleCopyMessage}>복사</button>
          </div>
        </div>
      )}
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
            <div className="chat-sticker-scope-toggle" role="group" aria-label="이모티콘 저장 위치">
              <button
                type="button"
                className={stickerSaveScope === 'personal' ? 'active' : ''}
                onClick={() => setStickerSaveScope('personal')}
              >
                개인
              </button>
              <button
                type="button"
                className={stickerSaveScope === 'room' ? 'active' : ''}
                onClick={() => setStickerSaveScope('room')}
              >
                이 채팅방
              </button>
            </div>
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

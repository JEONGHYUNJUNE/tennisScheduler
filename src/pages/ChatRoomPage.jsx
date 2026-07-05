import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { acceptChatRoom, chatMessagePageSize, chatStickerOptions, endChatRoom, enterChatRoom, getChatMessage, getChatMessages, getChatMessagesAround, getChatRoom, isReusableChatStickerPath, markChatRoomRead, searchChatMessages, sendChatImage, sendChatMessage, sendChatStickerReference, uploadReusableChatSticker, setChatRoomNotice, subscribeToChatRoom } from '../services/chatService'

const maxCustomStickers = 24
const stickerPanelSlotCount = 15
const firstCustomStickerPageSize = Math.max(1, stickerPanelSlotCount - chatStickerOptions.length)
const customStickerPageSize = stickerPanelSlotCount
const customStickerSize = 256

const getCustomStickerStorageKey = (memberId) => `ons-tennis-custom-chat-stickers:${memberId}`
const getCustomStickerPageCount = (stickerCount) => {
  if (stickerCount < firstCustomStickerPageSize) return 1
  const remainingCustomStickers = Math.max(0, stickerCount - firstCustomStickerPageSize)
  const addButtonSlot = stickerCount < maxCustomStickers ? 1 : 0
  return 1 + Math.ceil((remainingCustomStickers + addButtonSlot) / customStickerPageSize)
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
  if (item.message_type === 'sticker') return item.body || '이모티콘'
  if (item.message_type === 'image') {
    return isChatStickerImagePath(item.image_path) ? '이모티콘' : '사진'
  }
  return item.body || '메시지'
}

const getMessageCopyText = (item) => {
  if (!item) return ''
  if (item.message_type === 'image') {
    return isChatStickerImagePath(item.image_path) ? '이모티콘' : (item.image_name || item.body || '사진')
  }
  return item.body || ''
}

const isChatStickerImagePath = (imagePath = '') => (
  imagePath.startsWith('chat-stickers/') || isReusableChatStickerPath(imagePath)
)

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
  const fileInputRef = useRef(null)
  const stickerFileInputRef = useRef(null)
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
  const [customStickerPage, setCustomStickerPage] = useState(0)
  const [stickerEditor, setStickerEditor] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [replyTarget, setReplyTarget] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [viewingSearchContext, setViewingSearchContext] = useState(false)

  const isActive = room?.status === 'active'
  const isRequested = room?.status === 'requested'

  const otherMember = useMemo(() => room?.other_member || { name: '회원' }, [room])
  const customStickerPageCount = useMemo(() => getCustomStickerPageCount(customStickers.length), [customStickers.length])
  const visibleCustomStickers = useMemo(() => {
    if (customStickerPage === 0) {
      return customStickers.slice(0, firstCustomStickerPageSize)
    }
    const pageStart = firstCustomStickerPageSize + ((customStickerPage - 1) * customStickerPageSize)
    return customStickers.slice(pageStart, pageStart + customStickerPageSize)
  }, [customStickerPage, customStickers])

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
    const timerId = window.setInterval(markRead, 25000)
    const handleFocus = () => markRead()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') markRead()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(timerId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isActive, markRead])

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
    if (event.target.closest('a, button')) return
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

  const toggleStickerPanel = () => {
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
        stickerPayload = { ...stickerPayload, ...uploadedSticker }
        saveCustomStickers(customStickers.map((item) => (item.id === sticker.id ? stickerPayload : item)))
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

      const nextStickers = [
        ...customStickers,
        {
          id: `${Date.now()}`,
          name: stickerFile.name,
          mime: stickerFile.type,
          dataUrl,
          ...uploadedSticker,
        },
      ]
      saveCustomStickers(nextStickers)
      setCustomStickerPage(getCustomStickerPageCount(nextStickers.length) - 1)
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
      const currentReplyTarget = replyTarget
      const sentMessage = await sendChatImage(roomId, profile.id, file, { replyToMessageId: replyTarget?.id || null })
      await appendSentMessage({ ...sentMessage, reply_to: sentMessage.reply_to || currentReplyTarget })
      setReplyTarget(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      window.requestAnimationFrame(() => messageInputRef.current?.focus())
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
    if (isImageMessage && item.image_url) {
      if (isCustomStickerImage) {
        return <img src={item.image_url} alt={item.image_name || '커스텀 이모티콘'} />
      }
      return (
        <a href={item.image_url} target="_blank" rel="noreferrer">
          <img src={item.image_url} alt={item.image_name || '채팅 이미지'} />
        </a>
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
          <span>{isActive ? '실시간 채팅 중' : isRequested ? '채팅 요청 중' : '종료됨'}</span>
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
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
        <input ref={stickerFileInputRef} type="file" accept="image/*" onChange={handleStickerFileChange} hidden />
        <button
          type="button"
          className="chat-tool-button"
          onMouseDown={keepComposerFocus}
          onTouchStart={keepComposerFocus}
          onPointerDown={keepComposerFocus}
          onClick={() => fileInputRef.current?.click()}
          disabled={!isActive || sending}
          aria-label="사진 보내기"
        >
          +
        </button>
        <textarea
          ref={messageInputRef}
          value={message}
          placeholder={isActive ? '메시지를 입력하세요.' : '상대가 입장하면 대화할 수 있어요.'}
          onChange={handleMessageChange}
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
            ☺
          </button>
          {stickerOpen && (
            <div className="chat-sticker-panel">
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
                    <img src={sticker.dataUrl} alt="" />
                  </button>
                  <button
                    type="button"
                    className="chat-custom-sticker-remove"
                    onMouseDown={keepComposerFocus}
                    onTouchStart={keepComposerFocus}
                    onPointerDown={keepComposerFocus}
                    onClick={() => handleRemoveCustomSticker(sticker.id)}
                    aria-label="커스텀 이모티콘 삭제"
                  >
                    ×
                  </button>
                </span>
              ))}
              {customStickerPage === customStickerPageCount - 1 && customStickers.length < maxCustomStickers && (
                <button
                  type="button"
                  className="chat-sticker-add-button"
                  onMouseDown={keepComposerFocus}
                  onTouchStart={keepComposerFocus}
                  onPointerDown={keepComposerFocus}
                  onClick={openStickerEditor}
                  aria-label="이모티콘 만들기"
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

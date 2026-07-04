import { supabase } from '../lib/supabase'
import { getPostImageUrl, postImageBucketName, removePostImage, uploadPostImage } from './imageAttachmentService'

export const chatMessagePageSize = 100

const baseRoomSelectColumns = `
  id,
  status,
  requester_member_id,
  recipient_member_id,
  requested_at,
  activated_at,
  ended_at,
  updated_at,
  requester_last_read_at,
  recipient_last_read_at,
  requester_last_seen_at,
  recipient_last_seen_at,
  requester:otmember!chat_rooms_requester_member_id_fkey(id, username, display_name, avatar_url),
  recipient:otmember!chat_rooms_recipient_member_id_fkey(id, username, display_name, avatar_url)
`

const roomSelectColumns = `
  id,
  status,
  requester_member_id,
  recipient_member_id,
  requested_at,
  activated_at,
  ended_at,
  updated_at,
  notice_message_id,
  notice_set_by_member_id,
  notice_set_at,
  requester_last_read_at,
  recipient_last_read_at,
  requester_last_seen_at,
  recipient_last_seen_at,
  requester:otmember!chat_rooms_requester_member_id_fkey(id, username, display_name, avatar_url),
  recipient:otmember!chat_rooms_recipient_member_id_fkey(id, username, display_name, avatar_url)
`

const baseMessageSelectColumns = `
  id,
  room_id,
  sender_member_id,
  message_type,
  body,
  image_path,
  image_name,
  image_mime,
  created_at,
  sender:otmember!chat_messages_sender_member_id_fkey(id, username, display_name, avatar_url)
`

const messageSelectColumns = `
  id,
  room_id,
  sender_member_id,
  message_type,
  body,
  image_path,
  image_name,
  image_mime,
  reply_to_message_id,
  created_at,
  sender:otmember!chat_messages_sender_member_id_fkey(id, username, display_name, avatar_url),
  reply_to:chat_messages!chat_messages_reply_to_message_id_fkey(
    id,
    room_id,
    sender_member_id,
    message_type,
    body,
    image_path,
    image_name,
    image_mime,
    created_at,
    sender:otmember!chat_messages_sender_member_id_fkey(id, username, display_name, avatar_url)
  )
`

export const chatStickerOptions = [
  { label: '박장대소', value: '🤣' },
  { label: '따봉', value: '👍' },
  { label: '하트웃음', value: '🥰' },
]

export async function getChatRooms(currentMemberId) {
  let { data, error } = await supabase
    .from('chat_rooms')
    .select(roomSelectColumns)
    .neq('status', 'ended')
    .order('updated_at', { ascending: false })

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_rooms')
      .select(baseRoomSelectColumns)
      .neq('status', 'ended')
      .order('updated_at', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (isMissingChatTableError(error)) return []
    throw error
  }

  const rooms = (data || []).map((room) => normalizeRoom(room, currentMemberId))
  return Promise.all(rooms.map((room) => hydrateRoomPreview(room, currentMemberId)))
}

export async function getChatRoom(roomId, currentMemberId) {
  let { data, error } = await supabase
    .from('chat_rooms')
    .select(roomSelectColumns)
    .eq('id', roomId)
    .maybeSingle()

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_rooms')
      .select(baseRoomSelectColumns)
      .eq('id', roomId)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (isMissingChatTableError(error)) return null
    throw error
  }
  if (!data) return null

  return hydrateRoomNotice(normalizeRoom(data, currentMemberId))
}

export async function getChatMessages(roomId, { before = null, limit = chatMessagePageSize } = {}) {
  let query = supabase
    .from('chat_messages')
    .select(messageSelectColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  let { data, error } = await query

  if (isMissingReplyNoticeSchemaError(error)) {
    query = supabase
      .from('chat_messages')
      .select(baseMessageSelectColumns)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) query = query.lt('created_at', before)

    const fallback = await query
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (isMissingChatTableError(error)) return []
    throw error
  }

  return (data || []).map(normalizeMessage).reverse()
}

export async function getChatMessage(messageId) {
  let { data, error } = await supabase
    .from('chat_messages')
    .select(messageSelectColumns)
    .eq('id', messageId)
    .maybeSingle()

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_messages')
      .select(baseMessageSelectColumns)
      .eq('id', messageId)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (isMissingChatTableError(error)) return null
    throw error
  }

  return data ? normalizeMessage(data) : null
}

export async function requestChat(recipientMemberId) {
  const { data, error } = await supabase
    .rpc('request_one_to_one_chat', { target_member_id: recipientMemberId })
    .single()

  if (error) throw error
  return data
}

export async function enterChatRoom(roomId) {
  const { data, error } = await supabase
    .rpc('enter_one_to_one_chat', { target_room_id: roomId })
    .single()

  if (error) throw error
  return data
}

export async function acceptChatRoom(roomId) {
  const { data, error } = await supabase
    .rpc('accept_one_to_one_chat', { target_room_id: roomId })
    .single()

  if (error?.code === '42883' || /accept_one_to_one_chat/.test(error?.message || '')) {
    return enterChatRoom(roomId)
  }
  if (error) throw error
  return data
}

export async function markChatRoomRead(roomId) {
  const { data, error } = await supabase
    .rpc('mark_one_to_one_chat_read', { target_room_id: roomId })
    .single()

  if (error?.code === '42883' || /mark_one_to_one_chat_read/.test(error?.message || '')) return null
  if (error) throw error
  return data
}

export async function sendChatMessage(roomId, body, messageType = 'text', { replyToMessageId = null } = {}) {
  const payload = {
    room_id: roomId,
    body: body.trim(),
    message_type: messageType,
  }
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId

  let { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select(messageSelectColumns)
    .single()

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        body: body.trim(),
        message_type: messageType,
      })
      .select(baseMessageSelectColumns)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return normalizeMessage(data)
}

export async function sendChatImage(roomId, memberId, imageFile, { replyToMessageId = null } = {}) {
  const imagePayload = await uploadPostImage({ file: imageFile, folder: `chats/${roomId}/${memberId}` })

  const payload = {
    room_id: roomId,
    message_type: 'image',
    body: imageFile.name,
    ...imagePayload,
  }
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId

  let { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select(messageSelectColumns)
    .single()

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        message_type: 'image',
        body: imageFile.name,
        ...imagePayload,
      })
      .select(baseMessageSelectColumns)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    await removePostImage(imagePayload.image_path)
    throw error
  }

  return normalizeMessage(data)
}

export async function sendChatStickerImage(roomId, memberId, stickerFile, { replyToMessageId = null } = {}) {
  if (!stickerFile?.type?.startsWith('image/')) throw new Error('이미지 파일만 이모티콘으로 보낼 수 있습니다.')
  if (stickerFile.size > 2 * 1024 * 1024) throw new Error('커스텀 이모티콘은 2MB 이하만 보낼 수 있습니다.')

  const extension = stickerFile.type === 'image/gif' ? 'gif' : 'png'
  const safeName = stickerFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'sticker'
  const imagePath = `chat-stickers/${roomId}/${memberId}/${Date.now()}-${safeName}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(postImageBucketName)
    .upload(imagePath, stickerFile, {
      cacheControl: '31536000',
      contentType: stickerFile.type || 'image/png',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const imagePayload = {
    image_path: imagePath,
    image_name: stickerFile.name,
    image_mime: stickerFile.type || 'image/png',
  }

  const payload = {
    room_id: roomId,
    message_type: 'image',
    body: stickerFile.name,
    ...imagePayload,
  }
  if (replyToMessageId) payload.reply_to_message_id = replyToMessageId

  let { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select(messageSelectColumns)
    .single()

  if (isMissingReplyNoticeSchemaError(error)) {
    const fallback = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        message_type: 'image',
        body: stickerFile.name,
        ...imagePayload,
      })
      .select(baseMessageSelectColumns)
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    await removePostImage(imagePath)
    throw error
  }

  return normalizeMessage(data)
}

export async function endChatRoom(roomId) {
  const { data: images, error: imageError } = await supabase
    .from('chat_messages')
    .select('image_path')
    .eq('room_id', roomId)
    .eq('message_type', 'image')

  if (imageError) throw imageError

  const { error } = await supabase
    .rpc('end_one_to_one_chat', { target_room_id: roomId })

  if (error) throw error

  await Promise.all((images || []).map((message) => removePostImage(message.image_path)))
}

export async function setChatRoomNotice(roomId, messageId) {
  const { data, error } = await supabase
    .rpc('set_one_to_one_chat_notice', {
      target_room_id: roomId,
      target_message_id: messageId,
    })
    .single()

  if (error) throw error
  return data
}

export function subscribeToChatRoom(roomId, { onMessage, onRoomChanged }) {
  const channel = supabase
    .channel(`chat-room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onMessage?.(payload.new),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
      (payload) => onRoomChanged?.(payload.new),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToChatUpdates(onChange) {
  const channelName = `chat-updates:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      () => onChange?.(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'chat_rooms' },
      () => onChange?.(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getUnreadChatCount(memberId) {
  const rooms = await getChatRooms(memberId)
  return rooms.filter((room) => {
    if (room.status === 'requested') return room.recipient_member_id === memberId
    return getRoomUnreadCount(room, memberId) > 0
  }).length
}

export function getRoomUnreadCount(room, memberId) {
  if (!room || room.status !== 'active') return 0
  if (typeof room.unread_count === 'number') return room.unread_count

  const ownLastReadAt = room.requester_member_id === memberId
    ? room.requester_last_read_at
    : room.recipient_last_read_at
  const ownLastReadTime = ownLastReadAt ? new Date(ownLastReadAt).getTime() : 0

  return (room.messages || []).filter((message) => {
    if (!message.sender_member_id || message.sender_member_id === memberId || message.message_type === 'system') return false
    if (!ownLastReadTime) return true
    return new Date(message.created_at).getTime() > ownLastReadTime
  }).length
}

async function hydrateRoomPreview(room, memberId) {
  const [latestMessage, unreadCount] = await Promise.all([
    getChatMessages(room.id, { limit: 1 }).then((messages) => messages.at(-1) || null),
    getUnreadMessageCount(room, memberId),
  ])

  return {
    ...room,
    messages: latestMessage ? [latestMessage] : [],
    last_message: latestMessage,
    unread_count: unreadCount,
  }
}

async function hydrateRoomNotice(room) {
  if (!room?.notice_message_id) return { ...room, notice_message: null }

  const noticeMessage = await getChatMessage(room.notice_message_id)
  return {
    ...room,
    notice_message: noticeMessage,
  }
}

async function getUnreadMessageCount(room, memberId) {
  if (!room || room.status !== 'active') return 0

  const ownLastReadAt = room.requester_member_id === memberId
    ? room.requester_last_read_at
    : room.recipient_last_read_at
  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .neq('sender_member_id', memberId)
    .neq('message_type', 'system')

  if (ownLastReadAt) query = query.gt('created_at', ownLastReadAt)

  const { count, error } = await query
  if (error) {
    if (isMissingChatTableError(error)) return 0
    throw error
  }

  return count || 0
}

function normalizeRoom(room, currentMemberId) {
  const otherMember = room.requester_member_id === currentMemberId ? room.recipient : room.requester
  const isRequester = room.requester_member_id === currentMemberId
  const messages = (room.chat_messages || []).map(normalizeMessage).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const lastMessage = messages.at(-1) || null

  return {
    ...room,
    own_last_read_at: isRequester ? room.requester_last_read_at : room.recipient_last_read_at,
    other_last_read_at: isRequester ? room.recipient_last_read_at : room.requester_last_read_at,
    own_last_seen_at: isRequester ? room.requester_last_seen_at : room.recipient_last_seen_at,
    other_last_seen_at: isRequester ? room.recipient_last_seen_at : room.requester_last_seen_at,
    notice_message: room.notice_message ? normalizeMessage(room.notice_message) : null,
    other_member: {
      id: otherMember?.id || '',
      name: otherMember?.display_name || otherMember?.username || '회원',
      user_id: otherMember?.username || '',
      avatar_url: otherMember?.avatar_url || '',
    },
    messages,
    last_message: lastMessage,
  }
}

function normalizeMessage(message) {
  return {
    ...message,
    sender_name: message.sender?.display_name || message.sender?.username || '회원',
    sender_avatar_url: message.sender?.avatar_url || '',
    image_path: message.image_path || '',
    image_name: message.image_name || '',
    image_url: getPostImageUrl(message.image_path),
    reply_to: message.reply_to ? normalizeMessage(message.reply_to) : null,
  }
}

function isMissingChatTableError(error) {
  return ['42P01', 'PGRST200', 'PGRST205'].includes(error.code) || /relation .*chat_.* does not exist/i.test(error.message || '')
}

function isMissingReplyNoticeSchemaError(error) {
  if (!error) return false
  return error.code === '42703' ||
    error.code === 'PGRST200' ||
    /reply_to_message_id|notice_message_id|notice_set_by_member_id|notice_set_at|chat_messages_reply_to_message_id_fkey/i.test(error.message || '')
}

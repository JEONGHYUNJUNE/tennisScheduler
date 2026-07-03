import { supabase } from '../lib/supabase'
import { getPostImageUrl, postImageBucketName, removePostImage, uploadPostImage } from './imageAttachmentService'

const roomSelectColumns = `
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
  recipient:otmember!chat_rooms_recipient_member_id_fkey(id, username, display_name, avatar_url),
  chat_messages(id, room_id, sender_member_id, message_type, body, image_path, created_at)
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
  created_at,
  sender:otmember!chat_messages_sender_member_id_fkey(id, username, display_name, avatar_url)
`

export const chatStickerOptions = [
  { label: '테니스공', value: '🎾' },
  { label: '좋아요', value: '👍' },
  { label: '하이파이브', value: '🙌' },
  { label: '웃음', value: '😄' },
  { label: '박수', value: '👏' },
  { label: '불꽃', value: '🔥' },
  { label: '최고', value: '💪' },
  { label: '축하', value: '🥳' },
  { label: '반짝', value: '✨' },
]

export async function getChatRooms(currentMemberId) {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select(roomSelectColumns)
    .neq('status', 'ended')
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingChatTableError(error)) return []
    throw error
  }

  return (data || []).map((room) => normalizeRoom(room, currentMemberId))
}

export async function getChatRoom(roomId, currentMemberId) {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select(roomSelectColumns)
    .eq('id', roomId)
    .maybeSingle()

  if (error) {
    if (isMissingChatTableError(error)) return null
    throw error
  }
  if (!data) return null

  return normalizeRoom(data, currentMemberId)
}

export async function getChatMessages(roomId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(messageSelectColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingChatTableError(error)) return []
    throw error
  }

  return (data || []).map(normalizeMessage)
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

export async function sendChatMessage(roomId, body, messageType = 'text') {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      body: body.trim(),
      message_type: messageType,
    })
    .select(messageSelectColumns)
    .single()

  if (error) throw error
  return normalizeMessage(data)
}

export async function sendChatImage(roomId, memberId, imageFile) {
  const imagePayload = await uploadPostImage({ file: imageFile, folder: `chats/${roomId}/${memberId}` })

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      message_type: 'image',
      body: imageFile.name,
      ...imagePayload,
    })
    .select(messageSelectColumns)
    .single()

  if (error) {
    await removePostImage(imagePayload.image_path)
    throw error
  }

  return normalizeMessage(data)
}

export async function sendChatStickerImage(roomId, memberId, stickerFile) {
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

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      message_type: 'image',
      body: stickerFile.name,
      ...imagePayload,
    })
    .select(messageSelectColumns)
    .single()

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

export async function getUnreadChatCount(memberId) {
  const rooms = await getChatRooms(memberId)
  return rooms.filter((room) => {
    if (room.status === 'requested') return room.recipient_member_id === memberId
    if (room.status !== 'active') return false

    const ownLastReadAt = room.requester_member_id === memberId
      ? room.requester_last_read_at
      : room.recipient_last_read_at
    const lastOtherMessage = [...room.messages].reverse().find((message) => message.sender_member_id !== memberId && message.message_type !== 'system')
    if (!lastOtherMessage) return false
    if (!ownLastReadAt) return true
    return new Date(lastOtherMessage.created_at) > new Date(ownLastReadAt)
  }).length
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
  }
}

function isMissingChatTableError(error) {
  return ['42P01', '42703', 'PGRST200', 'PGRST205'].includes(error.code) || /chat_/.test(error.message || '')
}

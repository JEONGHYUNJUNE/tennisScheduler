import { supabase } from '../lib/supabase'
import { getPostImageUrl, removePostImage, uploadPostImage } from './imageAttachmentService'

const roomSelectColumns = `
  id,
  status,
  requester_member_id,
  recipient_member_id,
  requested_at,
  activated_at,
  ended_at,
  updated_at,
  requester:otmember!chat_rooms_requester_member_id_fkey(id, username, display_name, avatar_url),
  recipient:otmember!chat_rooms_recipient_member_id_fkey(id, username, display_name, avatar_url),
  chat_messages(id, room_id, sender_member_id, message_type, body, created_at)
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
  return rooms.filter((room) => room.status === 'requested' && room.recipient_member_id === memberId).length
}

function normalizeRoom(room, currentMemberId) {
  const otherMember = room.requester_member_id === currentMemberId ? room.recipient : room.requester
  const messages = (room.chat_messages || []).map(normalizeMessage).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const lastMessage = messages.at(-1) || null

  return {
    ...room,
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

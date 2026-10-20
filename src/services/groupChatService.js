import { supabase } from '../lib/supabase'
import { getPostImageUrl, postImageBucketName, removePostImage, uploadPostImage } from './imageAttachmentService'

export const groupChatMessagePageSize = 100

const missingGroupChatCodes = new Set(['42P01', '42703', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205'])
const reusableStickerFolder = 'chat-custom-stickers'
const maxGroupChatVideoSize = 50 * 1024 * 1024
const videoFileExtensionPattern = /\.(mp4|mov|m4v|webm|3gp|3gpp|3g2|3gpp2)$/i

const roomSelectColumns = `
  id,
  name,
  status,
  created_by_member_id,
  created_at,
  updated_at,
  group_chat_members(
    room_id,
    member_id,
    role,
    joined_at,
    left_at,
    last_read_at,
    member:otmember!group_chat_members_member_id_fkey(id, username, display_name, avatar_url)
  )
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
  deleted_at,
  deleted_by_member_id,
  created_at,
  sender:otmember!group_chat_messages_sender_member_id_fkey(id, username, display_name, avatar_url)
`

export async function getGroupChatRooms(currentMemberId) {
  const { data, error } = await supabase
    .from('group_chat_rooms')
    .select(roomSelectColumns)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (error) {
    if (isMissingGroupChatError(error)) return []
    throw error
  }

  const rooms = (data || []).map((room) => normalizeRoom(room, currentMemberId))
  return Promise.all(rooms.map((room) => hydrateRoomPreview(room, currentMemberId)))
}

export async function getGroupChatRoom(roomId, currentMemberId) {
  const { data, error } = await supabase
    .from('group_chat_rooms')
    .select(roomSelectColumns)
    .eq('id', roomId)
    .maybeSingle()

  if (error) {
    if (isMissingGroupChatError(error)) return null
    throw error
  }
  if (!data) return null
  return normalizeRoom(data, currentMemberId)
}

export async function getGroupChatMessages(roomId, { before = null, limit = groupChatMessagePageSize } = {}) {
  let query = supabase
    .from('group_chat_messages')
    .select(messageSelectColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) {
    if (isMissingGroupChatError(error)) return []
    throw error
  }

  return (data || []).map(normalizeMessage).reverse()
}

export async function getGroupChatMessage(messageId) {
  const { data, error } = await supabase
    .from('group_chat_messages')
    .select(messageSelectColumns)
    .eq('id', messageId)
    .maybeSingle()

  if (error) {
    if (isMissingGroupChatError(error)) return null
    throw error
  }

  return data ? normalizeMessage(data) : null
}

export async function createGroupChat(name, memberIds) {
  const { data, error } = await supabase
    .rpc('create_group_chat', {
      room_name: name,
      invited_member_ids: memberIds,
    })
    .single()

  if (error) throw error
  return data
}

export async function markGroupChatRead(roomId) {
  const { data, error } = await supabase
    .rpc('mark_group_chat_read', { target_room_id: roomId })
    .maybeSingle()

  if (error) {
    if (isMissingGroupChatError(error)) return null
    throw error
  }
  return data
}

export async function leaveGroupChat(roomId) {
  const { error } = await supabase.rpc('leave_group_chat', { target_room_id: roomId })
  if (error) throw error
}

export async function sendGroupChatMessage(roomId, body) {
  if (!body.trim()) throw new Error('메시지를 입력해 주세요.')
  const { data, error } = await supabase
    .from('group_chat_messages')
    .insert({
      room_id: roomId,
      body: body.trim(),
      message_type: 'text',
    })
    .select(messageSelectColumns)
    .single()

  if (error) throw error
  return normalizeMessage(data)
}

export async function sendGroupChatImage(roomId, memberId, imageFile) {
  const imagePayload = await uploadPostImage({ file: imageFile, folder: `group-chats/${roomId}/${memberId}` })

  const { data, error } = await supabase
    .from('group_chat_messages')
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

export async function sendGroupChatVideo(roomId, memberId, videoFile) {
  const isVideoFile = videoFile?.type?.startsWith('video/') || videoFileExtensionPattern.test(videoFile?.name || '')
  if (!isVideoFile) throw new Error('동영상 파일만 첨부할 수 있습니다.')
  if (videoFile.size > maxGroupChatVideoSize) throw new Error('동영상은 50MB 이하만 보낼 수 있습니다.')

  const extension = videoFile.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'mp4'
  const safeName = videoFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'video'
  const fallbackMime = { mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm', '3gp': 'video/3gpp', '3gpp': 'video/3gpp', '3g2': 'video/3gpp2', '3gpp2': 'video/3gpp2' }[extension] || 'video/mp4'
  const videoMime = videoFile.type || fallbackMime
  const videoPath = `group-chats/${roomId}/${memberId}/${Date.now()}-${safeName}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(postImageBucketName)
    .upload(videoPath, videoFile, {
      cacheControl: '31536000',
      contentType: videoMime,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const videoPayload = {
    image_path: videoPath,
    image_name: videoFile.name,
    image_mime: videoMime,
  }

  const { data, error } = await supabase
    .from('group_chat_messages')
    .insert({
      room_id: roomId,
      message_type: 'video',
      body: videoFile.name,
      ...videoPayload,
    })
    .select(messageSelectColumns)
    .single()

  if (error) {
    await removePostImage(videoPayload.image_path)
    throw error
  }

  return normalizeMessage(data)
}

export async function sendGroupChatStickerReference(roomId, stickerPayload) {
  if (!stickerPayload?.image_path) throw new Error('이모티콘 이미지가 저장되지 않았습니다.')

  const { data, error } = await supabase
    .from('group_chat_messages')
    .insert({
      room_id: roomId,
      message_type: 'image',
      body: stickerPayload.image_name || '이모티콘',
      image_path: stickerPayload.image_path,
      image_name: stickerPayload.image_name || 'custom-sticker.png',
      image_mime: stickerPayload.image_mime || 'image/png',
    })
    .select(messageSelectColumns)
    .single()

  if (error) throw error
  return normalizeMessage(data)
}

export function subscribeToGroupChatRoom(roomId, { onMessage, onRoomChanged, onMemberChanged }) {
  const suffix = `${Date.now()}:${Math.random().toString(36).slice(2)}`
  const messageChannel = supabase
    .channel(`group-chat-room-messages:${roomId}:${suffix}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => onMessage?.(payload.new),
    )
    .subscribe()

  const roomChannel = supabase
    .channel(`group-chat-room-state:${roomId}:${suffix}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'group_chat_rooms', filter: `id=eq.${roomId}` },
      (payload) => onRoomChanged?.(payload.new),
    )
    .subscribe()

  const memberChannel = supabase
    .channel(`group-chat-room-members:${roomId}:${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'group_chat_members', filter: `room_id=eq.${roomId}` },
      (payload) => onMemberChanged?.(payload),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(messageChannel)
    supabase.removeChannel(roomChannel)
    supabase.removeChannel(memberChannel)
  }
}

export function subscribeToGroupChatUpdates(onChange) {
  const channelName = `group-chat-updates:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_chat_messages' },
      () => onChange?.(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'group_chat_rooms' },
      () => onChange?.(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function getGroupChatUnreadSummary(memberId) {
  const rooms = await getGroupChatRooms(memberId)
  return rooms.reduce((summary, room) => {
    const count = getGroupRoomUnreadCount(room, memberId)
    return { rooms: summary.rooms + (count > 0 ? 1 : 0), messages: summary.messages + count }
  }, { rooms: 0, messages: 0 })
}

export async function getUnreadGroupChatCount(memberId) {
  const rooms = await getGroupChatRooms(memberId)
  return rooms.filter((room) => getGroupRoomUnreadCount(room, memberId) > 0).length
}

export async function getUnreadGroupChatMessageCount(memberId) {
  const rooms = await getGroupChatRooms(memberId)
  return rooms.reduce((total, room) => total + getGroupRoomUnreadCount(room, memberId), 0)
}

export function getGroupRoomUnreadCount(room, memberId) {
  if (!room || room.status !== 'active') return 0
  if (typeof room.unread_count === 'number') return room.unread_count

  const ownMembership = room.members?.find((member) => member.member_id === memberId)
  const lastReadTime = ownMembership?.last_read_at ? new Date(ownMembership.last_read_at).getTime() : 0

  return (room.messages || []).filter((message) => {
    if (message.deleted_at) return false
    if (!message.sender_member_id || message.sender_member_id === memberId || message.message_type === 'system') return false
    if (!lastReadTime) return true
    return new Date(message.created_at).getTime() > lastReadTime
  }).length
}

async function hydrateRoomPreview(room, currentMemberId) {
  const [previewResult, unreadCount] = await Promise.all([
    supabase
      .from('group_chat_messages')
      .select(messageSelectColumns)
      .eq('room_id', room.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(25),
    countUnreadGroupMessages(room, currentMemberId),
  ])

  const { data, error } = previewResult

  if (error) {
    if (isMissingGroupChatError(error)) return room
    throw error
  }

  const messages = (data || []).map(normalizeMessage).reverse()
  return {
    ...room,
    messages,
    last_message: messages.at(-1) || null,
    unread_count: unreadCount,
  }
}

async function countUnreadGroupMessages(room, currentMemberId) {
  if (!room || !currentMemberId) return 0

  const ownMembership = room.members?.find((member) => member.member_id === currentMemberId)
  let query = supabase
    .from('group_chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .is('deleted_at', null)
    .neq('sender_member_id', currentMemberId)
    .neq('message_type', 'system')

  if (ownMembership?.last_read_at) {
    query = query.gt('created_at', ownMembership.last_read_at)
  }

  const { count, error } = await query
  if (error) {
    if (isMissingGroupChatError(error)) return 0
    throw error
  }

  return count || 0
}

function normalizeRoom(room, currentMemberId) {
  const members = (room.group_chat_members || [])
    .filter((member) => !member.left_at)
    .map((member) => ({
      room_id: member.room_id,
      member_id: member.member_id,
      role: member.role,
      joined_at: member.joined_at,
      left_at: member.left_at,
      last_read_at: member.last_read_at,
      name: member.member?.display_name || member.member?.username || '회원',
      user_id: member.member?.username || '',
      avatar_url: member.member?.avatar_url || '',
    }))

  return {
    id: room.id,
    name: room.name,
    status: room.status,
    created_by_member_id: room.created_by_member_id,
    created_at: room.created_at,
    updated_at: room.updated_at,
    members,
    member_count: members.length,
    my_membership: members.find((member) => member.member_id === currentMemberId) || null,
  }
}

export function normalizeMessage(message) {
  const sender = message.sender || {}
  return {
    id: message.id,
    room_id: message.room_id,
    sender_member_id: message.sender_member_id,
    message_type: message.message_type || 'text',
    body: message.body || '',
    image_path: message.image_path || '',
    image_url: getPostImageUrl(message.image_path || ''),
    image_name: message.image_name || '',
    image_mime: message.image_mime || '',
    deleted_at: message.deleted_at || null,
    deleted_by_member_id: message.deleted_by_member_id || null,
    created_at: message.created_at,
    sender_name: sender.display_name || sender.username || '회원',
    sender_user_id: sender.username || '',
    sender_avatar_url: sender.avatar_url || '',
  }
}

export function isGroupChatStickerPath(imagePath = '') {
  return imagePath.startsWith('chat-stickers/') || imagePath.startsWith(`${reusableStickerFolder}/`)
}

function isMissingGroupChatError(error) {
  return missingGroupChatCodes.has(error?.code)
}

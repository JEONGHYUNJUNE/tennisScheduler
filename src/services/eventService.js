import { supabase } from '../lib/supabase'
import { getPostImageUrl, removePostImage, uploadPostImage } from './imageAttachmentService'
import { filterMentionsInText, saveMentions } from './mentionService'

const missingGuestColumnCodes = new Set(['42703', 'PGRST204'])
const missingLikeTableCodes = new Set(['42P01', 'PGRST205'])
const missingCommentLikeTableCodes = new Set(['42P01', 'PGRST205'])
const missingCommentTableCodes = new Set(['42P01', 'PGRST200', 'PGRST205'])
const relationshipAmbiguousCodes = new Set(['PGRST201'])

const eventCommentSelectColumns = `
  id,
  event_id,
  member_id,
  parent_comment_id,
  message,
  created_at,
  updated_at,
  otmember!tennis_event_comments_member_id_fkey(id, username, display_name, avatar_url)
`

const localDate = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const formatLocalDate = (date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const getTodayDateText = localDate

export async function getUpcomingEvents() {
  const withGuestColumns = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, guest_name, guest_memo, created_by, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name, avatar_url))')
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')

  if (!withGuestColumns.error) return withGuestColumns.data.map((event) => normalizeEvent(event, true))
  if (!isRecoverableAttendanceEmbedError(withGuestColumns.error)) throw withGuestColumns.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name, avatar_url))')
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')
  if (error) throw error
  return data.map((event) => normalizeEvent(event, false))
}

export async function getMonthEvents(targetDate = new Date()) {
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  const nextMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)

  const withGuestColumns = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, guest_name, guest_memo, created_by, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name, avatar_url))')
    .gte('event_date', formatLocalDate(monthStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .order('event_date')
    .order('start_time')

  if (!withGuestColumns.error) return withGuestColumns.data.map((event) => normalizeEvent(event, true))
  if (!isRecoverableAttendanceEmbedError(withGuestColumns.error)) throw withGuestColumns.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name, avatar_url))')
    .gte('event_date', formatLocalDate(monthStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .order('event_date')
    .order('start_time')

  if (error) throw error
  return data.map((event) => normalizeEvent(event, false))
}

export async function getMyUpcomingEvents(memberId) {
  const { data, error } = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances!inner(id, member_id, status)')
    .eq('tennis_attendances.member_id', memberId)
    .in('tennis_attendances.status', ['attending', 'waiting'])
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')

  if (error) throw error
  return data.map(normalizeEvent)
}

export async function getMonthlyAttendanceRanking(targetDate = new Date()) {
  const rangeStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 2, 1)
  const nextMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)

  const withPosition = await supabase
    .from('tennis_events')
    .select(`
      id, title, event_date,
      tennis_attendances(
        id, member_id, status,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, club_position, is_active, avatar_url)
      )
    `)
    .gte('event_date', formatLocalDate(rangeStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .lt('event_date', localDate())
    .order('event_date', { ascending: false })

  if (!withPosition.error) return buildRanking(withPosition.data)
  if (!/club_position/.test(withPosition.error.message || '')) throw withPosition.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select(`
      id, title, event_date,
      tennis_attendances(
        id, member_id, status,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, is_active, avatar_url)
      )
    `)
    .gte('event_date', formatLocalDate(rangeStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .lt('event_date', localDate())
    .order('event_date', { ascending: false })

  if (error) throw error
  return buildRanking(data)
}

function buildRanking(events) {
  const rankingMap = new Map()

  for (const event of events || []) {
    for (const attendance of event.tennis_attendances || []) {
      if (attendance.status !== 'attending' || !attendance.member_id || attendance.otmember?.is_active === false) continue

      const member = normalizeMember(attendance.otmember)
      const current = rankingMap.get(attendance.member_id) || {
        member_id: attendance.member_id,
        name: member?.name || '-',
        user_id: member?.user_id || '',
        club_position: member?.club_position || '',
        avatar_url: member?.avatar_url || '',
        count: 0,
        events: [],
      }

      current.count += 1
      current.events.push({ id: event.id, title: event.title, event_date: event.event_date })
      rankingMap.set(attendance.member_id, current)
    }
  }

  return [...rankingMap.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko-KR'))
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export async function getEventLikeSummaries(eventIds, memberId) {
  if (!eventIds.length) return {}

  const { data, error } = await supabase
    .from('tennis_event_likes')
    .select('event_id, member_id')
    .in('event_id', eventIds)

  if (error) {
    if (isMissingLikeTableError(error)) return {}
    throw error
  }

  return data.reduce((summaries, like) => {
    const summary = summaries[like.event_id] ?? { count: 0, likedByMe: false }
    summary.count += 1
    summary.likedByMe = summary.likedByMe || like.member_id === memberId
    summaries[like.event_id] = summary
    return summaries
  }, {})
}

export async function toggleEventLike(eventId, memberId, likedByMe) {
  if (likedByMe) {
    const { error } = await supabase
      .from('tennis_event_likes')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', memberId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('tennis_event_likes')
    .insert({ event_id: eventId, member_id: memberId })

  if (error) throw error
}

export async function getEventCommentLikeSummaries(commentIds, memberId) {
  if (!commentIds.length) return {}

  const { data, error } = await supabase
    .from('tennis_event_comment_likes')
    .select('comment_id, member_id')
    .in('comment_id', commentIds)

  if (error) {
    if (isMissingCommentLikeTableError(error)) return {}
    throw error
  }

  return data.reduce((summaries, like) => {
    const summary = summaries[like.comment_id] ?? { count: 0, likedByMe: false }
    summary.count += 1
    summary.likedByMe = summary.likedByMe || like.member_id === memberId
    summaries[like.comment_id] = summary
    return summaries
  }, {})
}

export async function toggleEventCommentLike(commentId, memberId, likedByMe) {
  if (likedByMe) {
    const { error } = await supabase
      .from('tennis_event_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('member_id', memberId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('tennis_event_comment_likes')
    .insert({ comment_id: commentId, member_id: memberId })

  if (error) throw error
}

export async function getEvent(eventId) {
  const withComments = await supabase
    .from('tennis_events')
    .select(`
      *,
      creator:otmember!tennis_events_created_by_fkey(id, username, display_name, avatar_url),
      tennis_attendances(
        id, member_id, guest_name, guest_memo, created_by, status, created_at,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, avatar_url)
      ),
      tennis_event_comments(
        id,
        event_id,
        member_id,
        parent_comment_id,
        message,
        created_at,
        updated_at,
        otmember!tennis_event_comments_member_id_fkey(id, username, display_name, avatar_url)
      )
    `)
    .eq('id', eventId)
    .single()

  if (!withComments.error) return normalizeEvent(withComments.data, true)
  if (!isRecoverableAttendanceEmbedError(withComments.error) && !isMissingCommentTableError(withComments.error)) {
    if (!isRecoverableEventCreatorEmbedError(withComments.error)) throw withComments.error
  }

  const withGuestColumns = await supabase
    .from('tennis_events')
    .select(`
      *,
      creator:otmember!tennis_events_created_by_fkey(id, username, display_name, avatar_url),
      tennis_attendances(
        id, member_id, guest_name, guest_memo, created_by, status, created_at,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, avatar_url)
      )
    `)
    .eq('id', eventId)
    .single()

  if (!withGuestColumns.error) return normalizeEvent(withGuestColumns.data, true)
  if (!isRecoverableAttendanceEmbedError(withGuestColumns.error) && !isRecoverableEventCreatorEmbedError(withGuestColumns.error)) throw withGuestColumns.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select(`
      *,
      tennis_attendances(
        id, member_id, status, created_at,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, avatar_url)
      )
    `)
    .eq('id', eventId)
    .single()
  if (error) throw error
  return normalizeEvent(data, false)
}

export async function saveEvent(event, memberId) {
  if (event.event_date < localDate()) {
    throw new Error('오늘 이전 날짜로는 일정을 저장할 수 없습니다.')
  }

  const payload = {
    title: event.title.trim(),
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time || null,
    location: event.location.trim(),
    max_participants: event.max_players ? Number(event.max_players) : null,
    memo: event.memo.trim() || null,
  }

  if (event.remove_memo_image) {
    payload.memo_image_path = null
    payload.memo_image_name = null
    payload.memo_image_mime = null
  }

  if (event.memo_image_file) {
    const uploadedImage = await uploadPostImage({
      file: event.memo_image_file,
      folder: `events/${memberId}`,
    })
    payload.memo_image_path = uploadedImage.image_path
    payload.memo_image_name = uploadedImage.image_name
    payload.memo_image_mime = uploadedImage.image_mime
  }

  if (event.id) {
    const previousImagePath = event.memo_image_path || ''
    const { data, error } = await supabase
      .from('tennis_events')
      .update(payload)
      .eq('id', event.id)
      .select()
      .single()
    if (error) {
      if (payload.memo_image_path) await removePostImage(payload.memo_image_path)
      throw error
    }
    if ((event.remove_memo_image || event.memo_image_file) && previousImagePath && previousImagePath !== payload.memo_image_path) {
      await removePostImage(previousImagePath)
    }
    return data
  }

  const { data, error } = await supabase
    .from('tennis_events')
    .insert({ ...payload, created_by: memberId })
    .select()
    .single()
  if (error) {
    if (payload.memo_image_path) await removePostImage(payload.memo_image_path)
    throw error
  }
  return data
}

export async function attendEvent(event, memberId) {
  if (event.event_date < localDate()) {
    throw new Error('지난 일정은 참석 신청할 수 없습니다.')
  }

  const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0
  const isFull = event.max_players && attendingCount >= event.max_players
  const status = isFull ? 'waiting' : 'attending'

  const { data, error } = await supabase
    .from('tennis_attendances')
    .insert({ event_id: event.id, member_id: memberId, status })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addGuestAttendance(event, guest, actorId) {
  if (event.event_date < localDate()) {
    throw new Error('지난 일정에는 게스트를 추가할 수 없습니다.')
  }

  const guestName = guest.guest_name?.trim()
  const guestMemo = guest.guest_memo?.trim()

  if (!guestName) throw new Error('게스트 이름을 입력해 주세요.')

  const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0
  const isFull = event.max_players && attendingCount >= event.max_players
  const status = isFull ? 'waiting' : 'attending'

  const { data, error } = await supabase
    .from('tennis_attendances')
    .insert({
      event_id: event.id,
      member_id: null,
      guest_name: guestName,
      guest_memo: guestMemo || null,
      created_by: actorId,
      status,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelAttendance(attendanceId) {
  const { error } = await supabase.from('tennis_attendances').delete().eq('id', attendanceId)
  if (error) throw error
}

export async function removeGuestAttendance(attendanceId) {
  const { error } = await supabase.from('tennis_attendances').delete().eq('id', attendanceId)
  if (error) throw error
}

export async function deleteEvent(eventId) {
  const { data: event } = await supabase
    .from('tennis_events')
    .select('memo_image_path')
    .eq('id', eventId)
    .maybeSingle()

  const { error } = await supabase.from('tennis_events').delete().eq('id', eventId)
  if (error) throw error
  await removePostImage(event?.memo_image_path)
}

export async function addEventComment(eventId, memberId, message, parentCommentId = null, mentions = []) {
  const { data, error } = await supabase
    .from('tennis_event_comments')
    .insert({
      event_id: eventId,
      member_id: memberId,
      parent_comment_id: parentCommentId,
      message: message.trim(),
    })
    .select(eventCommentSelectColumns)
    .single()

  if (error) throw error
  await saveMentions({
    sourceType: 'tennis_event_comment',
    sourceId: data.id,
    actorMemberId: memberId,
    mentions: filterMentionsInText(message, mentions),
  })
  return normalizeEventComment(data)
}

export async function updateEventComment(commentId, message, memberId = '', mentions = []) {
  const { data, error } = await supabase
    .from('tennis_event_comments')
    .update({ message: message.trim() })
    .eq('id', commentId)
    .select(eventCommentSelectColumns)
    .single()

  if (error) throw error
  if (memberId) {
    await saveMentions({
      sourceType: 'tennis_event_comment',
      sourceId: commentId,
      actorMemberId: memberId,
      mentions: filterMentionsInText(message, mentions),
    })
  }
  return normalizeEventComment(data)
}

export async function deleteEventComment(commentId) {
  const { error } = await supabase
    .from('tennis_event_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

export function isCancellationBlocked(eventDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDay = new Date(`${eventDate}T00:00:00`)
  const daysUntilEvent = Math.ceil((eventDay - today) / 86400000)
  return daysUntilEvent <= 5
}

function normalizeMember(member) {
  if (!member) return member
  return {
    ...member,
    user_id: member.username,
    name: member.display_name,
    club_position: member.club_position || '',
    avatar_url: member.avatar_url || '',
  }
}

function normalizeEvent(event, supportsGuestAttendance = true) {
  const creator = normalizeMember(event.creator)
  const attendances = event.tennis_attendances?.map((attendance) => ({
    ...attendance,
    otmember: normalizeMember(attendance.otmember),
    display_name: attendance.guest_name || normalizeMember(attendance.otmember)?.name || '',
    identifier: attendance.guest_name ? '게스트' : normalizeMember(attendance.otmember)?.user_id || '',
    is_guest: Boolean(attendance.guest_name),
  })) || []

  return {
    ...event,
    max_players: event.max_participants,
    memo_image_path: event.memo_image_path || '',
    memo_image_name: event.memo_image_name || '',
    memo_image_url: getPostImageUrl(event.memo_image_path),
    creator,
    creator_name: creator?.name || creator?.user_id || '',
    creator_avatar_url: creator?.avatar_url || '',
    supports_guest_attendance: supportsGuestAttendance,
    tennis_attendances: attendances.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
    comments: nestEventComments((event.tennis_event_comments || [])
      .map(normalizeEventComment)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))),
    flat_comments: (event.tennis_event_comments || [])
      .map(normalizeEventComment)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }
}

function normalizeEventComment(comment) {
  return {
    ...comment,
    parent_comment_id: comment.parent_comment_id || null,
    replies: [],
    member_name: comment.otmember?.display_name || comment.otmember?.username || '회원',
    member_avatar_url: comment.otmember?.avatar_url || '',
  }
}

function nestEventComments(comments) {
  const byId = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] }]))
  const roots = []

  comments.forEach((comment) => {
    const current = byId.get(comment.id)
    const parent = comment.parent_comment_id ? byId.get(comment.parent_comment_id) : null
    if (parent) parent.replies.push(current)
    else roots.push(current)
  })

  return roots
}

function isMissingGuestColumnError(error) {
  return missingGuestColumnCodes.has(error.code) || /guest_name|guest_memo|created_by/.test(error.message || '')
}

function isRecoverableAttendanceEmbedError(error) {
  return isMissingGuestColumnError(error) || relationshipAmbiguousCodes.has(error.code)
}

function isRecoverableEventCreatorEmbedError(error) {
  return relationshipAmbiguousCodes.has(error.code) || /tennis_events_created_by_fkey|creator|relationship/i.test(error.message || '')
}

function isMissingLikeTableError(error) {
  return missingLikeTableCodes.has(error.code) || /tennis_event_likes/.test(error.message || '')
}

function isMissingCommentLikeTableError(error) {
  return missingCommentLikeTableCodes.has(error.code) || /tennis_event_comment_likes/.test(error.message || '')
}

function isMissingCommentTableError(error) {
  return missingCommentTableCodes.has(error.code) || /tennis_event_comments/.test(error.message || '')
}

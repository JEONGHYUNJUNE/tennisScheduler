import { supabase } from '../lib/supabase'
import { getPostImageUrl, removePostImage, uploadPostImage } from './imageAttachmentService'
import { filterMentionsInText, saveMentions } from './mentionService'

const missingDiaryTableCodes = new Set(['42P01', 'PGRST200', 'PGRST205'])

const entrySelectColumns = `
  id,
  member_id,
  diary_date,
  mood,
  activity_type,
  visibility,
  group_id,
  title,
  body,
  image_path,
  image_name,
  image_mime,
  created_at,
  updated_at,
    otmember!tennis_diary_entries_member_id_fkey(id, username, display_name, avatar_url)
`

const entrySelectColumnsWithComments = `
  ${entrySelectColumns},
  tennis_diary_comments(
    id,
    entry_id,
    member_id,
    parent_comment_id,
    message,
    created_at,
    updated_at,
    otmember!tennis_diary_comments_member_id_fkey(id, username, display_name, avatar_url)
  )
`

const commentSelectColumns = `
  id,
  entry_id,
  member_id,
  parent_comment_id,
  message,
  created_at,
  updated_at,
  otmember!tennis_diary_comments_member_id_fkey(id, username, display_name, avatar_url)
`

export const diaryMoodOptions = [
  { value: 'happy', label: '기쁨', icon: ':)' },
  { value: 'excited', label: '설레는', icon: ':D' },
  { value: 'calm', label: '평온한', icon: '^^' },
  { value: 'hard', label: '힘든', icon: ':/' },
  { value: 'tired', label: '피곤한', icon: '-_-' },
  { value: 'proud', label: '뿌듯한', icon: '!' },
]

export const diaryActivityOptions = [
  { value: 'lesson', label: '테니스레슨' },
  { value: 'meetup', label: '테니스모임' },
  { value: 'etc', label: '기타활동' },
]

export async function getDiaryMonthSummary(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('tennis_diary_entries')
    .select('id, diary_date, visibility')
    .gte('diary_date', startDate)
    .lte('diary_date', endDate)
    .order('diary_date', { ascending: true })

  if (error) {
    if (isMissingDiaryTableError(error)) return {}
    throw error
  }

  return (data || []).reduce((summary, entry) => {
    summary[entry.diary_date] = (summary[entry.diary_date] || 0) + 1
    return summary
  }, {})
}

export async function getDiaryEntriesByDate(dateText) {
  const { data, error } = await supabase
    .from('tennis_diary_entries')
    .select(entrySelectColumnsWithComments)
    .eq('diary_date', dateText)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingDiaryTableError(error)) return []
    throw error
  }

  return data.map(normalizeEntry)
}

export async function getDiaryEntryDate(entryId) {
  const { data, error } = await supabase
    .from('tennis_diary_entries')
    .select('diary_date')
    .eq('id', entryId)
    .maybeSingle()

  if (error) {
    if (isMissingDiaryTableError(error)) return ''
    throw error
  }

  return data?.diary_date || ''
}

export async function getMyDiaryGroups(memberId) {
  const { data, error } = await supabase
    .from('tennis_diary_group_members')
    .select(`
      group_id,
      role,
      status,
      tennis_diary_groups(id, name, owner_member_id, created_at)
    `)
    .eq('member_id', memberId)
    .eq('status', 'accepted')

  if (error) {
    if (isMissingDiaryTableError(error)) return []
    throw error
  }

  return (data || []).map((membership) => ({
    ...membership.tennis_diary_groups,
    role: membership.role,
    member_status: membership.status,
  })).filter(Boolean).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

export async function createDiaryGroup({ name, ownerMemberId, inviteeIds = [] }) {
  const { data: group, error } = await supabase
    .from('tennis_diary_groups')
    .insert({ name: name.trim(), owner_member_id: ownerMemberId })
    .select('id, name, owner_member_id, created_at')
    .single()

  if (error) throw error

  const memberRows = [
    { group_id: group.id, member_id: ownerMemberId, role: 'owner', status: 'accepted', invited_by_member_id: ownerMemberId, responded_at: new Date().toISOString() },
    ...inviteeIds
      .filter((memberId) => memberId !== ownerMemberId)
      .map((memberId) => ({ group_id: group.id, member_id: memberId, role: 'member', status: 'pending', invited_by_member_id: ownerMemberId })),
  ]

  const { error: memberError } = await supabase
    .from('tennis_diary_group_members')
    .upsert(memberRows, { onConflict: 'group_id,member_id' })

  if (memberError) throw memberError

  return group
}

export async function inviteDiaryGroupMembers({ groupId, inviterMemberId, inviteeIds = [] }) {
  if (!inviteeIds.length) return

  const { error } = await supabase
    .from('tennis_diary_group_members')
    .upsert(
      inviteeIds.map((memberId) => ({
        group_id: groupId,
        member_id: memberId,
        role: 'member',
        status: 'pending',
        invited_by_member_id: inviterMemberId,
        responded_at: null,
      })),
      { onConflict: 'group_id,member_id' },
    )

  if (error) throw error
}

export async function getDiaryGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('tennis_diary_group_members')
    .select('group_id, member_id, role, status, otmember!tennis_diary_group_members_member_id_fkey(id, username, display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingDiaryTableError(error)) return []
    throw error
  }

  return (data || []).map((member) => ({
    ...member,
    member_name: member.otmember?.display_name || member.otmember?.username || '회원',
    member_avatar_url: member.otmember?.avatar_url || '',
  }))
}

export async function getDiaryInvitations(memberId) {
  const { data, error } = await supabase
    .from('tennis_diary_group_members')
    .select(`
      group_id,
      member_id,
      status,
      created_at,
      tennis_diary_groups(id, name, owner_member_id, created_at),
      inviter:otmember!tennis_diary_group_members_invited_by_member_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('member_id', memberId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingDiaryTableError(error)) return []
    throw error
  }

  return (data || []).map((invite) => ({
    ...invite,
    group: invite.tennis_diary_groups,
    inviter_name: invite.inviter?.display_name || invite.inviter?.username || '회원',
  }))
}

export async function respondDiaryInvitation({ groupId, memberId, accepted }) {
  const { error } = await supabase
    .from('tennis_diary_group_members')
    .update({
      status: accepted ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('group_id', groupId)
    .eq('member_id', memberId)
    .eq('status', 'pending')

  if (error) throw error
}

export async function addDiaryEntry(memberId, payload, imageFile = null, mentions = []) {
  const imagePayload = imageFile
    ? await uploadPostImage({ file: imageFile, folder: `diaries/${memberId}` })
    : {}

  const { data, error } = await supabase
    .from('tennis_diary_entries')
    .insert({
      member_id: memberId,
      diary_date: payload.diary_date,
      mood: payload.mood,
      activity_type: payload.activity_type,
      visibility: payload.visibility,
      group_id: payload.visibility === 'group' ? payload.group_id : null,
      title: payload.title.trim() || null,
      body: payload.body.trim(),
      ...imagePayload,
    })
    .select(entrySelectColumns)
    .single()

  if (error) {
    if (imagePayload.image_path) await removePostImage(imagePayload.image_path)
    throw error
  }

  await saveMentions({
    sourceType: 'tennis_diary_entry',
    sourceId: data.id,
    actorMemberId: memberId,
    mentions: payload.visibility === 'private' ? [] : filterMentionsInText(`${payload.title || ''} ${payload.body || ''}`, mentions),
  })

  return normalizeEntry(data)
}

export async function updateDiaryEntry(entryId, payload, memberId = '', mentions = []) {
  const { data, error } = await supabase
    .from('tennis_diary_entries')
    .update({
      mood: payload.mood,
      activity_type: payload.activity_type,
      visibility: payload.visibility,
      group_id: payload.visibility === 'group' ? payload.group_id : null,
      title: payload.title.trim() || null,
      body: payload.body.trim(),
    })
    .eq('id', entryId)
    .select(entrySelectColumns)
    .single()

  if (error) throw error
  if (memberId) {
    await saveMentions({
      sourceType: 'tennis_diary_entry',
      sourceId: entryId,
      actorMemberId: memberId,
      mentions: payload.visibility === 'private' ? [] : filterMentionsInText(`${payload.title || ''} ${payload.body || ''}`, mentions),
    })
  }
  return normalizeEntry(data)
}

export async function deleteDiaryEntry(entryId) {
  const { data: entry } = await supabase
    .from('tennis_diary_entries')
    .select('image_path')
    .eq('id', entryId)
    .maybeSingle()

  const { error } = await supabase
    .from('tennis_diary_entries')
    .delete()
    .eq('id', entryId)

  if (error) throw error
  await removePostImage(entry?.image_path)
}

export async function addDiaryComment(entryId, memberId, message, parentCommentId = null, mentions = []) {
  const { data, error } = await supabase
    .from('tennis_diary_comments')
    .insert({
      entry_id: entryId,
      member_id: memberId,
      parent_comment_id: parentCommentId,
      message: message.trim(),
    })
    .select(commentSelectColumns)
    .single()

  if (error) throw error
  await saveMentions({
    sourceType: 'tennis_diary_comment',
    sourceId: data.id,
    actorMemberId: memberId,
    mentions: filterMentionsInText(message, mentions),
  })
  return normalizeComment(data)
}

export async function updateDiaryComment(commentId, message, memberId = '', mentions = []) {
  const { data, error } = await supabase
    .from('tennis_diary_comments')
    .update({ message: message.trim() })
    .eq('id', commentId)
    .select(commentSelectColumns)
    .single()

  if (error) throw error
  if (memberId) {
    await saveMentions({
      sourceType: 'tennis_diary_comment',
      sourceId: commentId,
      actorMemberId: memberId,
      mentions: filterMentionsInText(message, mentions),
    })
  }
  return normalizeComment(data)
}

export async function deleteDiaryComment(commentId) {
  const { error } = await supabase
    .from('tennis_diary_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

export async function getDiaryLikeSummaries(entryIds, memberId) {
  if (!entryIds.length) return {}

  const { data, error } = await supabase
    .from('tennis_diary_likes')
    .select('entry_id, member_id')
    .in('entry_id', entryIds)

  if (error) {
    if (isMissingDiaryTableError(error)) return {}
    throw error
  }

  return data.reduce((summaries, like) => {
    const summary = summaries[like.entry_id] ?? { count: 0, likedByMe: false }
    summary.count += 1
    summary.likedByMe = summary.likedByMe || like.member_id === memberId
    summaries[like.entry_id] = summary
    return summaries
  }, {})
}

export async function toggleDiaryLike(entryId, memberId, likedByMe) {
  if (likedByMe) {
    const { error } = await supabase
      .from('tennis_diary_likes')
      .delete()
      .eq('entry_id', entryId)
      .eq('member_id', memberId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('tennis_diary_likes')
    .insert({ entry_id: entryId, member_id: memberId })

  if (error) throw error
}

export async function getDiaryCommentLikeSummaries(commentIds, memberId) {
  if (!commentIds.length) return {}

  const { data, error } = await supabase
    .from('tennis_diary_comment_likes')
    .select('comment_id, member_id')
    .in('comment_id', commentIds)

  if (error) {
    if (isMissingDiaryTableError(error)) return {}
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

export async function toggleDiaryCommentLike(commentId, memberId, likedByMe) {
  if (likedByMe) {
    const { error } = await supabase
      .from('tennis_diary_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('member_id', memberId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('tennis_diary_comment_likes')
    .insert({ comment_id: commentId, member_id: memberId })

  if (error) throw error
}

function normalizeEntry(entry) {
  const comments = (entry.tennis_diary_comments || [])
    .map(normalizeComment)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return {
    ...entry,
    title: entry.title || '',
    group_id: entry.group_id || null,
    member_name: entry.otmember?.display_name || entry.otmember?.username || '회원',
    member_avatar_url: entry.otmember?.avatar_url || '',
    image_path: entry.image_path || '',
    image_name: entry.image_name || '',
    image_url: getPostImageUrl(entry.image_path),
    comments: nestComments(comments),
    flat_comments: comments,
  }
}

function normalizeComment(comment) {
  return {
    ...comment,
    parent_comment_id: comment.parent_comment_id || null,
    replies: [],
    member_name: comment.otmember?.display_name || comment.otmember?.username || '회원',
    member_avatar_url: comment.otmember?.avatar_url || '',
  }
}

function nestComments(comments) {
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

function isMissingDiaryTableError(error) {
  return missingDiaryTableCodes.has(error.code) || /tennis_diary/.test(error.message || '')
}

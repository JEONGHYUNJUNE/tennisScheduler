import { supabase } from '../lib/supabase'

const SETTINGS_KEY = 'weekly_pick'
const missingSettingsTableCodes = new Set(['42P01', 'PGRST205'])
const missingCommentTableCodes = new Set(['42P01', 'PGRST200', 'PGRST205'])

const commentSelectColumns = `
  id,
  setting_key,
  member_id,
  message,
  created_at,
  updated_at,
  otmember!tennis_video_comments_member_id_fkey(id, username, display_name, avatar_url)
`

export const defaultRecommendedVideo = {
  title: '추천 테니스 영상',
  description: '',
  url: 'https://youtu.be/Ec9cQyAH6oE?si=pdHfE9Z973YVjugp',
}

export async function getRecommendedVideo() {
  const { data, error } = await supabase
    .from('tennis_video_settings')
    .select('title, description, youtube_url')
    .eq('setting_key', SETTINGS_KEY)
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTableError(error)) return defaultRecommendedVideo
    throw error
  }

  if (!data) return defaultRecommendedVideo

  return {
    title: data.title || defaultRecommendedVideo.title,
    description: data.description || '',
    url: data.youtube_url || defaultRecommendedVideo.url,
  }
}

export async function saveRecommendedVideo(video) {
  const payload = {
    setting_key: SETTINGS_KEY,
    title: video.title.trim() || defaultRecommendedVideo.title,
    description: video.description.trim() || null,
    youtube_url: video.url.trim(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('tennis_video_settings')
    .upsert(payload, { onConflict: 'setting_key' })
    .select('title, description, youtube_url')
    .single()

  if (error) throw error

  return {
    title: data.title || defaultRecommendedVideo.title,
    description: data.description || '',
    url: data.youtube_url,
  }
}

export async function getRecommendedVideoComments() {
  const { data, error } = await supabase
    .from('tennis_video_comments')
    .select(commentSelectColumns)
    .eq('setting_key', SETTINGS_KEY)
    .order('created_at', { ascending: true })

  if (error) {
    if (isMissingCommentTableError(error)) return []
    throw error
  }

  return data.map(normalizeComment)
}

export async function addRecommendedVideoComment(memberId, message) {
  const { data, error } = await supabase
    .from('tennis_video_comments')
    .insert({
      setting_key: SETTINGS_KEY,
      member_id: memberId,
      message: message.trim(),
    })
    .select(commentSelectColumns)
    .single()

  if (error) throw error
  return normalizeComment(data)
}

export async function updateRecommendedVideoComment(commentId, message) {
  const { data, error } = await supabase
    .from('tennis_video_comments')
    .update({ message: message.trim() })
    .eq('id', commentId)
    .select(commentSelectColumns)
    .single()

  if (error) throw error
  return normalizeComment(data)
}

export async function deleteRecommendedVideoComment(commentId) {
  const { error } = await supabase
    .from('tennis_video_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

function normalizeComment(comment) {
  return {
    ...comment,
    member_name: comment.otmember?.display_name || comment.otmember?.username || '회원',
    member_avatar_url: comment.otmember?.avatar_url || '',
  }
}

function isMissingSettingsTableError(error) {
  return missingSettingsTableCodes.has(error.code) || /tennis_video_settings/.test(error.message || '')
}

function isMissingCommentTableError(error) {
  return missingCommentTableCodes.has(error.code) || /tennis_video_comments/.test(error.message || '')
}

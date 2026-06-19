import { supabase } from '../lib/supabase'

const SETTINGS_KEY = 'weekly_pick'
const missingSettingsTableCodes = new Set(['42P01', 'PGRST205'])

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

function isMissingSettingsTableError(error) {
  return missingSettingsTableCodes.has(error.code) || /tennis_video_settings/.test(error.message || '')
}

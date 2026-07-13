import { supabase } from '../lib/supabase'

export const defaultNotificationPreferences = {
  schedule_enabled: true,
  social_enabled: true,
  diary_enabled: true,
  inquiry_enabled: true,
  chat_enabled: true,
  general_enabled: true,
}

const missingPreferenceTableCodes = new Set(['42P01', '42703'])
const preferenceColumns = 'member_id, schedule_enabled, social_enabled, diary_enabled, inquiry_enabled, chat_enabled, general_enabled, updated_at'

export async function getNotificationPreferences(memberId) {
  if (!memberId) return { ...defaultNotificationPreferences }

  const { data, error } = await supabase
    .from('ot_notification_preferences')
    .select(preferenceColumns)
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    if (missingPreferenceTableCodes.has(error.code)) return { ...defaultNotificationPreferences }
    throw error
  }

  return { ...defaultNotificationPreferences, ...(data || {}) }
}

export async function saveNotificationPreferences(memberId, preferences) {
  if (!memberId) throw new Error('회원 정보를 확인할 수 없습니다.')

  const nextPreferences = {
    ...defaultNotificationPreferences,
    ...preferences,
    member_id: memberId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ot_notification_preferences')
    .upsert(nextPreferences, { onConflict: 'member_id' })
    .select(preferenceColumns)
    .single()

  if (error) {
    if (missingPreferenceTableCodes.has(error.code)) {
      throw new Error('알림 설정 테이블이 아직 준비되지 않았습니다. Supabase 마이그레이션을 먼저 적용해 주세요.')
    }
    throw error
  }

  return { ...defaultNotificationPreferences, ...(data || {}) }
}

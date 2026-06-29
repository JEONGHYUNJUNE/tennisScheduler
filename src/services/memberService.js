import { supabase } from '../lib/supabase'

const missingPositionColumnCodes = new Set(['42703', 'PGRST204'])
const missingOptionalProfileColumnPattern = /club_position|avatar_url|avatar_path/

export async function getMembers() {
  const withPosition = await supabase
    .from('otmember')
    .select('id, username, display_name, tennis_start_date, role, club_position, is_active, avatar_url, avatar_path, created_at')
    .order('created_at', { ascending: false })

  if (!withPosition.error) return withPosition.data.map(normalizeMember)
  if (!isMissingPositionColumnError(withPosition.error)) throw withPosition.error

  const { data, error } = await supabase
    .from('otmember')
    .select('id, username, display_name, tennis_start_date, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(normalizeMember)
}

export async function updateMember(memberId, updates) {
  const payload = {}
  if (updates.role) payload.role = updates.role
  if (typeof updates.club_position === 'string') payload.club_position = updates.club_position.trim()
  if (typeof updates.is_active === 'boolean') payload.is_active = updates.is_active

  const { data, error } = await supabase
    .from('otmember')
    .update(payload)
    .eq('id', memberId)
    .select('id, username, display_name, tennis_start_date, role, club_position, is_active, created_at')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('회원 정보를 수정하지 못했습니다. 관리자 권한 또는 Supabase RLS 정책을 확인해 주세요.')
  }

  return normalizeMember(data)
}

function normalizeMember(member) {
  return {
    ...member,
    user_id: member.username,
    name: member.display_name,
    club_position: member.club_position || '',
    avatar_url: member.avatar_url || '',
    avatar_path: member.avatar_path || '',
  }
}

function isMissingPositionColumnError(error) {
  return missingPositionColumnCodes.has(error.code) || missingOptionalProfileColumnPattern.test(error.message || '')
}

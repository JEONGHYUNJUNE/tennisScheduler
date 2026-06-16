import { supabase } from '../lib/supabase'

export async function getMembers() {
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
  if (typeof updates.is_active === 'boolean') payload.is_active = updates.is_active

  const { data, error } = await supabase
    .from('otmember')
    .update(payload)
    .eq('id', memberId)
    .select('id, username, display_name, tennis_start_date, role, is_active, created_at')
    .single()

  if (error) throw error
  return normalizeMember(data)
}

function normalizeMember(member) {
  return {
    ...member,
    user_id: member.username,
    name: member.display_name,
  }
}

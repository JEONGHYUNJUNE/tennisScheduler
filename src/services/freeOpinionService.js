import { supabase } from '../lib/supabase'

const selectColumns = `
  id,
  member_id,
  message,
  created_at,
  otmember!ot_free_opinions_member_id_fkey(id, username, display_name)
`

export async function getFreeOpinions() {
  const { data, error } = await supabase
    .from('ot_free_opinions')
    .select(selectColumns)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data.map(normalizeOpinion)
}

export async function addFreeOpinion(memberId, message) {
  const { data, error } = await supabase
    .from('ot_free_opinions')
    .insert({
      member_id: memberId,
      message: message.trim(),
    })
    .select(selectColumns)
    .single()

  if (error) throw error
  return normalizeOpinion(data)
}

function normalizeOpinion(opinion) {
  return {
    ...opinion,
    member_name: opinion.otmember?.display_name || opinion.otmember?.username || '회원',
  }
}

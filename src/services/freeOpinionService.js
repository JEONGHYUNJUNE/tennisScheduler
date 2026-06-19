import { supabase } from '../lib/supabase'

const missingReadTableCodes = new Set(['42P01', 'PGRST205'])

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

export async function getUnreadFreeOpinionCount(memberId) {
  const { data: readState, error: readError } = await supabase
    .from('ot_free_opinion_reads')
    .select('last_read_at')
    .eq('member_id', memberId)
    .maybeSingle()

  if (readError) {
    if (isMissingReadTableError(readError)) return 0
    throw readError
  }

  let query = supabase
    .from('ot_free_opinions')
    .select('id', { count: 'exact', head: true })

  if (readState?.last_read_at) {
    query = query.gt('created_at', readState.last_read_at)
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
}

export async function markFreeOpinionsRead(memberId) {
  const { error } = await supabase
    .from('ot_free_opinion_reads')
    .upsert(
      {
        member_id: memberId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'member_id' },
    )

  if (error && !isMissingReadTableError(error)) throw error
}

function normalizeOpinion(opinion) {
  return {
    ...opinion,
    member_name: opinion.otmember?.display_name || opinion.otmember?.username || '회원',
  }
}

function isMissingReadTableError(error) {
  return missingReadTableCodes.has(error.code) || /ot_free_opinion_reads/.test(error.message || '')
}

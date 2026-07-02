import { supabase } from '../lib/supabase'

const missingMentionTableCodes = new Set(['42P01', 'PGRST205'])

export function normalizeMentionMember(member) {
  return {
    id: member.id,
    name: member.display_name || member.name || member.username || '회원',
    username: member.username || member.user_id || '',
    avatar_url: member.avatar_url || '',
  }
}

export function filterMentionsInText(text, mentions = []) {
  const normalizedText = text || ''
  const unique = new Map()

  mentions.forEach((mention) => {
    const member = normalizeMentionMember(mention)
    if (!member.id || !member.name) return
    if (!normalizedText.includes(`@${member.name}`)) return
    unique.set(member.id, member)
  })

  return Array.from(unique.values())
}

export async function saveMentions({ sourceType, sourceId, actorMemberId, mentions = [] }) {
  if (!sourceType || !sourceId || !actorMemberId) return

  const { error: deleteError } = await supabase
    .from('ot_mentions')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('actor_member_id', actorMemberId)

  if (deleteError) {
    if (isMissingMentionTableError(deleteError)) return
    throw deleteError
  }

  const uniqueMentions = new Map()
  mentions.forEach((mention) => {
    const member = normalizeMentionMember(mention)
    if (!member.id || member.id === actorMemberId) return
    uniqueMentions.set(member.id, member)
  })

  const rows = Array.from(uniqueMentions.values()).map((mention) => ({
    source_type: sourceType,
    source_id: sourceId,
    actor_member_id: actorMemberId,
    mentioned_member_id: mention.id,
    mentioned_display_name: mention.name,
  }))

  if (!rows.length) return

  const { error } = await supabase.from('ot_mentions').insert(rows)
  if (error && !isMissingMentionTableError(error)) throw error
}

function isMissingMentionTableError(error) {
  return missingMentionTableCodes.has(error.code) || /ot_mentions/.test(error.message || '')
}

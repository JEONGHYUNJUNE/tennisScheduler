import { supabase } from '../lib/supabase'

export async function getEventMuted(eventId, memberId) {
  const { data, error } = await supabase.from('ot_event_notification_mutes')
    .select('event_id').eq('event_id', eventId).eq('member_id', memberId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function setEventMuted(eventId, memberId, muted) {
  const query = muted
    ? supabase.from('ot_event_notification_mutes').upsert({ event_id: eventId, member_id: memberId }, { onConflict: 'member_id,event_id', ignoreDuplicates: true })
    : supabase.from('ot_event_notification_mutes').delete().eq('event_id', eventId).eq('member_id', memberId)
  const { error } = await query
  if (error) throw error
}

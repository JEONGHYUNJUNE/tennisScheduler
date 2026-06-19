import { supabase } from '../lib/supabase'

const missingGuestColumnCodes = new Set(['42703', 'PGRST204'])
const relationshipAmbiguousCodes = new Set(['PGRST201'])

const localDate = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const formatLocalDate = (date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const getTodayDateText = localDate

export async function getUpcomingEvents() {
  const withGuestColumns = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, guest_name, guest_memo, created_by, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name))')
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')

  if (!withGuestColumns.error) return withGuestColumns.data.map((event) => normalizeEvent(event, true))
  if (!isRecoverableAttendanceEmbedError(withGuestColumns.error)) throw withGuestColumns.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances(id, member_id, status, otmember!tennis_attendances_member_id_fkey(id, username, display_name))')
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')
  if (error) throw error
  return data.map((event) => normalizeEvent(event, false))
}

export async function getMyUpcomingEvents(memberId) {
  const { data, error } = await supabase
    .from('tennis_events')
    .select('*, tennis_attendances!inner(id, member_id, status)')
    .eq('tennis_attendances.member_id', memberId)
    .in('tennis_attendances.status', ['attending', 'waiting'])
    .gte('event_date', localDate())
    .order('event_date')
    .order('start_time')

  if (error) throw error
  return data.map(normalizeEvent)
}

export async function getMonthlyAttendanceRanking(targetDate = new Date()) {
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  const nextMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1)

  const withPosition = await supabase
    .from('tennis_events')
    .select(`
      id, title, event_date,
      tennis_attendances(
        id, member_id, status,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, club_position, is_active)
      )
    `)
    .gte('event_date', formatLocalDate(monthStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .lt('event_date', localDate())
    .order('event_date', { ascending: false })

  if (!withPosition.error) return buildRanking(withPosition.data)
  if (!/club_position/.test(withPosition.error.message || '')) throw withPosition.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select(`
      id, title, event_date,
      tennis_attendances(
        id, member_id, status,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date, is_active)
      )
    `)
    .gte('event_date', formatLocalDate(monthStart))
    .lt('event_date', formatLocalDate(nextMonthStart))
    .lt('event_date', localDate())
    .order('event_date', { ascending: false })

  if (error) throw error
  return buildRanking(data)
}

function buildRanking(events) {
  const rankingMap = new Map()

  for (const event of events || []) {
    for (const attendance of event.tennis_attendances || []) {
      if (attendance.status !== 'attending' || !attendance.member_id || attendance.otmember?.is_active === false) continue

      const member = normalizeMember(attendance.otmember)
      const current = rankingMap.get(attendance.member_id) || {
        member_id: attendance.member_id,
        name: member?.name || '-',
        user_id: member?.user_id || '',
        club_position: member?.club_position || '',
        count: 0,
        events: [],
      }

      current.count += 1
      current.events.push({ id: event.id, title: event.title, event_date: event.event_date })
      rankingMap.set(attendance.member_id, current)
    }
  }

  return [...rankingMap.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko-KR'))
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export async function getEvent(eventId) {
  const withGuestColumns = await supabase
    .from('tennis_events')
    .select(`
      *,
      tennis_attendances(
        id, member_id, guest_name, guest_memo, created_by, status, created_at,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date)
      )
    `)
    .eq('id', eventId)
    .single()

  if (!withGuestColumns.error) return normalizeEvent(withGuestColumns.data, true)
  if (!isRecoverableAttendanceEmbedError(withGuestColumns.error)) throw withGuestColumns.error

  const { data, error } = await supabase
    .from('tennis_events')
    .select(`
      *,
      tennis_attendances(
        id, member_id, status, created_at,
        otmember!tennis_attendances_member_id_fkey(id, username, display_name, tennis_start_date)
      )
    `)
    .eq('id', eventId)
    .single()
  if (error) throw error
  return normalizeEvent(data, false)
}

export async function saveEvent(event, memberId) {
  if (event.event_date < localDate()) {
    throw new Error('오늘 이전 날짜로는 일정을 저장할 수 없습니다.')
  }

  const payload = {
    title: event.title.trim(),
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time || null,
    location: event.location.trim(),
    max_participants: event.max_players ? Number(event.max_players) : null,
    memo: event.memo.trim() || null,
  }

  if (event.id) {
    const { data, error } = await supabase
      .from('tennis_events')
      .update(payload)
      .eq('id', event.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('tennis_events')
    .insert({ ...payload, created_by: memberId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function attendEvent(event, memberId) {
  const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0
  const isFull = event.max_players && attendingCount >= event.max_players
  const status = isFull ? 'waiting' : 'attending'

  const { data, error } = await supabase
    .from('tennis_attendances')
    .insert({ event_id: event.id, member_id: memberId, status })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addGuestAttendance(event, guest, actorId) {
  const guestName = guest.guest_name?.trim()
  const guestMemo = guest.guest_memo?.trim()

  if (!guestName) throw new Error('게스트 이름을 입력해 주세요.')

  const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0
  const isFull = event.max_players && attendingCount >= event.max_players
  const status = isFull ? 'waiting' : 'attending'

  const { data, error } = await supabase
    .from('tennis_attendances')
    .insert({
      event_id: event.id,
      member_id: null,
      guest_name: guestName,
      guest_memo: guestMemo || null,
      created_by: actorId,
      status,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelAttendance(attendanceId) {
  const { error } = await supabase.from('tennis_attendances').delete().eq('id', attendanceId)
  if (error) throw error
}

export async function removeGuestAttendance(attendanceId) {
  const { error } = await supabase.from('tennis_attendances').delete().eq('id', attendanceId)
  if (error) throw error
}

export async function deleteEvent(eventId) {
  const { error } = await supabase.from('tennis_events').delete().eq('id', eventId)
  if (error) throw error
}

export function isCancellationBlocked(eventDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDay = new Date(`${eventDate}T00:00:00`)
  const daysUntilEvent = Math.ceil((eventDay - today) / 86400000)
  return daysUntilEvent <= 5
}

function normalizeMember(member) {
  if (!member) return member
  return {
    ...member,
    user_id: member.username,
    name: member.display_name,
    club_position: member.club_position || '',
  }
}

function normalizeEvent(event, supportsGuestAttendance = true) {
  const attendances = event.tennis_attendances?.map((attendance) => ({
    ...attendance,
    otmember: normalizeMember(attendance.otmember),
    display_name: attendance.guest_name || normalizeMember(attendance.otmember)?.name || '',
    identifier: attendance.guest_name ? '게스트' : normalizeMember(attendance.otmember)?.user_id || '',
    is_guest: Boolean(attendance.guest_name),
  })) || []

  return {
    ...event,
    max_players: event.max_participants,
    supports_guest_attendance: supportsGuestAttendance,
    tennis_attendances: attendances.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)),
  }
}

function isMissingGuestColumnError(error) {
  return missingGuestColumnCodes.has(error.code) || /guest_name|guest_memo|created_by/.test(error.message || '')
}

function isRecoverableAttendanceEmbedError(error) {
  return isMissingGuestColumnError(error) || relationshipAmbiguousCodes.has(error.code)
}

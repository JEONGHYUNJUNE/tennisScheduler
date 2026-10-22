// Date-only calculations avoid browser timezone and daylight-saving shifts.
export function monthlyOccurrence(month, day) {
  const [year, monthNumber] = month.slice(0, 7).split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return `${month.slice(0, 7)}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function nextEventDate(event, fromDate) {
  if (!event.repeat_monthly_day) return event.event_date
  const lowerBound = event.event_date > fromDate ? event.event_date : fromDate
  let candidate = monthlyOccurrence(lowerBound, event.repeat_monthly_day)
  if (candidate < lowerBound) {
    const [year, month] = lowerBound.split('-').map(Number)
    candidate = monthlyOccurrence(new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10), event.repeat_monthly_day)
  }
  return event.repeat_until && candidate > event.repeat_until ? null : candidate
}

export function recurrenceLabel(event) {
  return event.repeat_monthly_day ? `매월 ${event.repeat_monthly_day}일 반복` : ''
}

// Recurring attendance applies from the signup date, never retroactively.
export function attendanceEventDates(event, attendance, fromDate, untilDate) {
  if (!event.repeat_monthly_day) {
    return event.event_date >= fromDate && event.event_date < untilDate ? [event.event_date] : []
  }
  const joinedAt = Date.parse(attendance.created_at)
  const joinedDate = Number.isFinite(joinedAt)
    ? new Date(joinedAt + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : event.event_date
  const dates = []
  let candidate = nextEventDate(event, joinedDate > fromDate ? joinedDate : fromDate)
  while (candidate && candidate < untilDate) {
    dates.push(candidate)
    const [year, month] = candidate.split('-').map(Number)
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
    candidate = nextEventDate(event, nextMonth)
  }
  return dates
}

// Calendar/history calculations stay date-only; upcoming views use Korean event time.
export function nextUpcomingEventDate(event, now = new Date()) {
  if (!event.repeat_monthly_day) return event.event_date
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const candidate = nextEventDate(event, today)
  const cutoffTime = event.end_time || event.start_time
  if (!candidate || !cutoffTime) return candidate
  const cutoff = Date.parse(`${candidate}T${cutoffTime.slice(0, 8)}+09:00`)
  if (now.getTime() < cutoff) return candidate
  const [year, month] = candidate.split('-').map(Number)
  return nextEventDate(event, new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10))
}

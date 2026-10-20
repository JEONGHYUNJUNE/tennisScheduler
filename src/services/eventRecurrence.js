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

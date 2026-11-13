const escapeText = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
const fold = (line) => {
  const encoder = new TextEncoder()
  const parts = []
  let current = '', bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) { parts.push(current); current = ' '; bytes = 1 }
    current += char; bytes += size
  }
  return [...parts, current].join('\r\n')
}

// Export the displayed occurrence only; the app remains the source of recurrence updates.
export function buildEventCalendar(event, url, now = new Date()) {
  const date = event.event_date
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ONS Tennis//Schedule//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${event.id}-${date}@ons-tennis`, `DTSTAMP:${utcStamp(now)}`]
  if (event.start_time) {
    const start = new Date(`${date}T${event.start_time.slice(0, 8)}+09:00`)
    let end = event.end_time ? new Date(`${date}T${event.end_time.slice(0, 8)}+09:00`) : new Date(start.getTime() + 3600000)
    if (end <= start) end = new Date(end.getTime() + 86400000)
    lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`)
  } else {
    const nextDay = new Date(`${date}T00:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    lines.push(`DTSTART;VALUE=DATE:${date.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${nextDay.toISOString().slice(0, 10).replaceAll('-', '')}`)
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText([event.memo, event.repeat_monthly_day ? '반복 일정의 이번 회차입니다. 다음 회차는 앱에서 추가해 주세요.' : '', url].filter(Boolean).join('\n\n'))}`,
    `URL:${escapeText(url)}`, 'END:VEVENT', 'END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadEventCalendar(event) {
  const url = `${window.location.origin}${window.location.pathname}#/events/${event.id}`
  const blob = new Blob([buildEventCalendar(event, url)], { type: 'text/calendar;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `ONS-${event.event_date}.ics`
  document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
}

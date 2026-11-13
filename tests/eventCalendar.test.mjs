import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEventCalendar } from '../src/services/eventCalendar.js'
const base = { id: 'event-1', event_date: '2026-11-22', start_time: '10:00:00', end_time: '12:00:00', title: '테니스, 모임; 테스트', location: '관악구민', memo: '첫째 줄\n둘째 줄' }
test('calendar converts Korea time to UTC and escapes text', () => {
 const text = buildEventCalendar(base)
 assert.ok(text.includes('DTSTART:20261122T010000Z\r\n'))
 assert.ok(text.includes('DTEND:20261122T030000Z\r\n'))
 assert.ok(text.includes('SUMMARY:테니스\\, 모임\\; 테스트'))
 assert.ok(text.includes('첫째 줄\\n둘째 줄'))
 assert.ok(text.endsWith('END:VCALENDAR\r\n'))
})
test('all day, overnight, missing end and stable occurrence identifiers', () => {
 const allDay=buildEventCalendar({...base,start_time:null})
 assert.ok(allDay.includes('DTEND;VALUE=DATE:20261123'))
 const overnight=buildEventCalendar({...base,start_time:'23:00:00',end_time:'01:00:00'})
 assert.ok(overnight.includes('DTEND:20261122T160000Z'))
 const missing=buildEventCalendar({...base,end_time:null})
 assert.ok(missing.includes('DTEND:20261122T020000Z'))
 assert.ok(missing.includes('UID:event-1-2026-11-22@ons-tennis'))
})
test('Unicode lines are folded at 75 bytes without corrupting Korean, recurrence exports one occurrence', () => {
 const title='테니스🎾'.repeat(80)
 const text=buildEventCalendar({...base,title,repeat_monthly_day:22})
 for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75)
 assert.ok(text.replace(/\r\n /g,'').includes('SUMMARY:'+title))
 assert.ok(!text.includes('RRULE:'))
})

test('calendar description contains only the post memo without app URL or recurrence guidance', () => {
 const text=buildEventCalendar({...base,repeat_monthly_day:22}).replace(/\r\n /g,'')
 assert.ok(text.includes('DESCRIPTION:첫째 줄\\n둘째 줄\r\n'))
 assert.ok(!text.includes('URL:'))
 assert.ok(!text.includes('https://'))
 assert.ok(!text.includes('다음 회차는'))
 const empty=buildEventCalendar({...base,memo:null})
 assert.ok(empty.includes('DESCRIPTION:\r\n'))
})

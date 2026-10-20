import test from 'node:test'
import assert from 'node:assert/strict'
import { attendanceEventDates } from '../src/services/eventRecurrence.js'

test('counts each elapsed monthly occurrence, including series started before ranking window', () => {
  assert.deepEqual(attendanceEventDates(
    { event_date: '2026-01-01', repeat_monthly_day: 10 },
    { created_at: '2026-01-01T00:00:00Z' }, '2026-08-01', '2026-10-20',
  ), ['2026-08-10', '2026-09-10', '2026-10-10'])
})
test('excludes months before signup in Korea and excludes today/future dates', () => {
  const event = { event_date: '2026-01-01', repeat_monthly_day: 10 }
  assert.deepEqual(attendanceEventDates(event, { created_at: '2026-09-10T16:00:00Z' }, '2026-08-01', '2026-11-01'), ['2026-10-10'])
  assert.deepEqual(attendanceEventDates(event, { created_at: '2026-08-01T00:00:00Z' }, '2026-08-01', '2026-10-10'), ['2026-08-10', '2026-09-10'])
})
test('respects repeat end date and short months', () => {
  assert.deepEqual(attendanceEventDates(
    { event_date: '2027-01-01', repeat_monthly_day: 31, repeat_until: '2027-03-30' },
    { created_at: '2027-01-01T00:00:00Z' }, '2027-01-01', '2027-04-01',
  ), ['2027-01-31', '2027-02-28'])
})
test('ordinary attendance remains one event and missing signup date uses series start', () => {
  assert.deepEqual(attendanceEventDates({ event_date:'2026-10-01' }, {}, '2026-08-01','2026-10-20'),['2026-10-01'])
  assert.deepEqual(attendanceEventDates({ event_date:'2026-11-01' }, {}, '2026-08-01','2026-10-20'),[])
  assert.deepEqual(attendanceEventDates({ event_date:'2026-10-01',repeat_monthly_day:10 }, {}, '2026-08-01','2026-10-20'),['2026-10-10'])
})

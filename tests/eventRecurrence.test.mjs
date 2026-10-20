import test from 'node:test'
import assert from 'node:assert/strict'
import { monthlyOccurrence, nextEventDate } from '../src/services/eventRecurrence.js'

test('month-end dates clamp without drifting and support leap years', () => {
  assert.equal(monthlyOccurrence('2027-02-01', 31), '2027-02-28')
  assert.equal(monthlyOccurrence('2028-02-01', 31), '2028-02-29')
  assert.equal(monthlyOccurrence('2027-04-01', 31), '2027-04-30')
  assert.equal(monthlyOccurrence('2027-03-01', 31), '2027-03-31')
})
test('next occurrence respects start, today, end and December rollover', () => {
  const event = { event_date: '2026-10-20', repeat_monthly_day: 15 }
  assert.equal(nextEventDate(event, '2026-10-01'), '2026-11-15')
  assert.equal(nextEventDate(event, '2026-11-15'), '2026-11-15')
  assert.equal(nextEventDate(event, '2026-12-16'), '2027-01-15')
  assert.equal(nextEventDate({ ...event, repeat_until: '2026-11-14' }, '2026-10-20'), null)
  assert.equal(nextEventDate({ ...event, repeat_until: '2026-11-15' }, '2026-10-20'), '2026-11-15')
})
test('ordinary events keep their actual date', () => {
  assert.equal(nextEventDate({ event_date: '2026-10-10' }, '2026-10-20'), '2026-10-10')
})

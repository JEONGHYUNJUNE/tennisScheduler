import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { nextUpcomingEventDate } from '../src/services/eventRecurrence.js'
const source = readFileSync(new URL('../src/services/eventService.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export /gm, '')
for (const legacy of [false, true]) test(`full search loads all pages including history and far future (legacy=${legacy})`, async () => {
  const ranges = []
  let failed = false
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id: String(id), event_date: id % 2 ? '2020-01-01' : '2035-01-01', title: '일정', tennis_attendances: [] }))
  const supabase = { from() {
    let start, end
    const q = {
      select() { return q }, order() { return q },
      range(a, b) { start = a; end = b; ranges.push([a, b]); return q },
      then(resolve) {
        if (legacy && !failed) { failed = true; return Promise.resolve({ error: { code: '42703', message: 'guest_name missing' } }).then(resolve) }
        return Promise.resolve({ data: rows.slice(start, end + 1), error: null }).then(resolve)
      },
    }
    return q
  } }
  const context = vm.createContext({ supabase, nextUpcomingEventDate, getPostImageUrl: () => '' })
  vm.runInContext(source, context)
  const result = await context.getAllEvents()
  assert.equal(result.length, 1001)
  assert.equal(new Set(result.map(row => row.id)).size, 1001)
  assert.ok(result.some(row => row.event_date === '2020-01-01'))
  assert.ok(result.some(row => row.event_date === '2035-01-01'))
  assert.deepEqual(ranges.slice(-3), [[0, 499], [500, 999], [1000, 1499]])
})

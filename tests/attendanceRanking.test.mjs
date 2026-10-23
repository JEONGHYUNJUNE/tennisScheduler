import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { attendanceEventDates, nextEventDate } from '../src/services/eventRecurrence.js'

const source = readFileSync(new URL('../src/services/eventService.js',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replace(/^export /gm,'')
class FixedDate extends Date {
  constructor(...args) { super(args.length>1 ? Date.UTC(...args) : args.length ? args[0] : '2026-10-20T12:00:00Z') }
  getTimezoneOffset() { return 0 }
  getFullYear() { return this.getUTCFullYear() }
  getMonth() { return this.getUTCMonth() }
}
const attendee=(id,created_at,status='attending',active=true)=>({member_id:id,created_at,status,otmember:{id,username:id,display_name:id,is_active:active}})
const events=[
  {id:'ordinary',title:'일반',event_date:'2026-09-01',tennis_attendances:[attendee('A','2026-08-01')]},
  {id:'monthly',title:'반복',event_date:'2026-01-01',repeat_monthly_day:10,tennis_attendances:[attendee('A','2026-09-11'),attendee('B','2026-01-01'),attendee('waiting','2026-01-01','waiting'),attendee('inactive','2026-01-01','attending',false)]},
]
for(const fallback of [false,true]) test(`ranking excludes all recurring events and preserves ordinary attendance${fallback?' with legacy profile fallback':''}`,async()=>{
  const queries=[]
  const supabase={from(table){const calls=[['from',table]];queries.push(calls);const q={then(resolve){return Promise.resolve(fallback&&queries.length===1?{error:{message:'column club_position does not exist'}}:{data:events,error:null}).then(resolve)}};for(const method of ['select','gte','lt','or','is','order'])q[method]=(...args)=>{calls.push([method,...args]);return q};return q}}
  const context=vm.createContext({supabase,Date:FixedDate,attendanceEventDates,nextEventDate})
  vm.runInContext(source,context)
  const result=JSON.parse(JSON.stringify(await context.getMonthlyAttendanceRanking(new FixedDate())))
  assert.deepEqual(result.map(x=>[x.member_id,x.count]),[['A',1]])
  assert.deepEqual(result[0].events.map(x=>x.id),['ordinary'])
  assert.equal(queries.length,fallback?2:1)
  for(const query of queries){
    assert.ok(query.some(([method,column])=>method==='gte'&&column==='event_date'))
    assert.ok(query.some(([method,column,value])=>method==='is'&&column==='repeat_monthly_day'&&value===null))
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const edgeSource = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/send-push-notification/index.ts',import.meta.url),'utf8')).replace(/^import .*$/gm,'')
const edge = vm.createContext({Deno:{serve(){},env:{get(){return ''}}},URLSearchParams,console})
vm.runInContext(edgeSource,edge)
const link=n=>edge.getNotificationUrl('https://app.example',n)

test('group push routes to its room while existing links keep their targets',()=>{
  assert.equal(link({type:'group_chat_message_created',group_chat_room_id:'g'}),'https://app.example/#/group-chats/g')
  assert.equal(link({type:'chat_message_created',chat_room_id:'d'}),'https://app.example/#/chats/d')
  assert.equal(link({type:'chat_requested',chat_room_id:'d'}),'https://app.example/#/chats/d')
  assert.equal(link({type:'event_reminder_today',event_id:'e'}),'https://app.example/#/events/e')
  assert.equal(link({type:'tennis_event_comment_reply_created',event_id:'e',tennis_event_comment_id:'c'}),'https://app.example/#/events/e?comment=c')
  assert.equal(link({type:'free_opinion_created',free_opinion_id:'p'}),'https://app.example/#/free-opinions?opinion=p')
  assert.equal(edge.getNotificationCategory({type:'group_chat_message_created',group_chat_room_id:'g'}),'chat')
  assert.equal(edge.getNotificationCategory({type:'event_reminder_today',event_id:'e'}),'schedule')
})

test('clicking group notifications never closes direct chat or another group',async()=>{
  const closed=[]
  const notifications=[
    {data:{groupChatRoomId:'g'},tag:'g1',close(){closed.push('g1')}},
    {data:{groupChatRoomId:'other'},tag:'g2',close(){closed.push('g2')}},
    {data:{chatRoomId:'d'},tag:'d1',close(){closed.push('d1')}},
  ]
  const worker=vm.createContext({self:{addEventListener(){},registration:{getNotifications:async()=>notifications}}})
  vm.runInContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),worker)
  await worker.closeRelatedChatNotifications(null,'g','g1')
  assert.deepEqual(closed,['g1'])
  closed.length=0
  await worker.closeRelatedChatNotifications('d',null,'d1')
  assert.deepEqual(closed,['d1'])
})

// Start Vite on port 5194, then run: node tests/groupChat-ui.mjs
// HTTP and realtime transports are mocked; no real messages or files are sent.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ headless: true })
const me = { id:'00000000-0000-4000-8000-000000000001', username:'preview', display_name:'검증회원', role:'member', is_active:true }
const peer = { ...me, id:'00000000-0000-4000-8000-000000000002', username:'peer', display_name:'대화상대' }
const now = '2026-10-20T08:00:00.000Z'
for (const width of [390,1440]) {
  const context = await browser.newContext({ viewport:{width,height:900},isMobile:width===390,hasTouch:width===390 })
  await context.addInitScript(({me}) => {
    localStorage.setItem('sb-mkdonxpnvxdxcoiejqym-auth-token',JSON.stringify({access_token:'preview',refresh_token:'preview',expires_at:9999999999,user:{id:me.id,app_metadata:{provider:'email'}}}))
    sessionStorage.setItem('ons-tennis-auth-profile-cache',JSON.stringify({...me,auth_user_id:me.id}))
  },{me})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/src/lib/supabase.js',async route=>{
    const response=await route.fetch()
    await route.fulfill({response,body:(await response.text())+`\nwindow.__channels=[];supabase.channel=()=>{const c={on(type,filter,fn){window.__channels.push({filter,fn});return c},subscribe(){return c},unsubscribe(){},track(){return Promise.resolve()},presenceState(){return {}},send(){return Promise.resolve()}};return c};supabase.removeChannel=async()=>{};`})
  })
  let group=null, groupFailure=false, memberLeft=false, readCalls=0, seq=0
  const sent=[], uploads=[], messages=[]
  const direct={id:'direct',status:'active',requester_member_id:me.id,recipient_member_id:peer.id,requester:me,recipient:peer,updated_at:now,requester_last_read_at:null,recipient_last_read_at:null}
  const directMessages=[{id:'dm1',room_id:'direct',sender_member_id:peer.id,message_type:'text',body:'기존 1:1 메시지',created_at:now,sender:peer}]
  await page.route('**/*.supabase.co/**',async route=>{
    const req=route.request(), u=new URL(req.url()), table=u.pathname.split('/').at(-1)
    const json=(body,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range',...headers},body:JSON.stringify(body)})
    const isSingle=req.headers().accept?.includes('vnd.pgrst.object')
    if(u.pathname.includes('/auth/')) return json({id:me.id})
    if(u.pathname.includes('/storage/')) {
      if(req.method()==='POST'){uploads.push({path:u.pathname,contentType:req.headers()['content-type']});return json({Key:u.pathname})}
      return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=','base64')})
    }
    if(table==='get_unread_one_to_one_chat_count')return json(1)
    if(table==='otmember') return json(u.searchParams.has('order')?[me,peer]:me)
    if(table==='chat_rooms') return json(u.searchParams.has('id')?direct:[direct])
    if(table==='chat_messages') {
      if(req.method()==='HEAD')return json(null,200,{'content-range':'0-0/1'})
      if(req.method()==='POST'){const b=req.postDataJSON(),m={...b,id:'dm-new',sender_member_id:me.id,sender:me,created_at:now};directMessages.push(m);return json(m,201)}
      return json(directMessages)
    }
    if(table==='create_group_chat'){
      const body=req.postDataJSON();assert.deepEqual(body.invited_member_ids,[peer.id])
      group={id:'group',name:body.room_name,status:'active',created_by_member_id:me.id,created_at:now,updated_at:now,group_chat_members:[me,peer].map(m=>({room_id:'group',member_id:m.id,role:m.id===me.id?'owner':'member',joined_at:now,last_read_at:null,left_at:null,member:m}))};return json(group)
    }
    if(table==='group_chat_rooms'){
      if(groupFailure)return json({code:'42501',message:'group_chat_rooms permission denied'},403)
      return json(memberLeft?[]:u.searchParams.has('id')?group:group?[group]:[])
    }
    if(table==='group_chat_messages'){
      if(req.method()==='HEAD')return json(null,200,{'content-range':'0-0/0'})
      if(req.method()==='POST'){const body=req.postDataJSON();sent.push(body);const m={...body,id:`gm${++seq}`,sender_member_id:me.id,sender:me,created_at:now};messages.push(m);return json(m,201)}
      if(u.searchParams.has('id'))return json(messages.find(m=>`eq.${m.id}`===u.searchParams.get('id')))
      return json([...messages].reverse())
    }
    if(table==='mark_group_chat_read'){readCalls++;return json({room_id:'group',member_id:me.id,last_read_at:now})}
    if(table==='leave_group_chat'){memberLeft=true;return json(null)}
    if(table==='chat_custom_stickers')return json([{id:'sticker',image_path:'chat-custom-stickers/me/test.png',image_name:'sticker.png',image_mime:'image/png'}])
    if(u.pathname.includes('/rpc/'))return json(isSingle?direct:[])
    return json([])
  })
  await page.goto('http://127.0.0.1:5194/#/chats')
  await page.getByText('기존 1:1 메시지',{exact:true}).waitFor()
  assert.equal(await page.locator('.chat-header-button span').textContent(),'1')
  await page.getByRole('button',{name:'단체톡 만들기',exact:true}).click()
  await page.getByPlaceholder('예: 금요 야간반').fill('검증 단체톡')
  await page.getByRole('dialog').getByLabel('대화상대').check()
  await page.getByRole('dialog').getByRole('button',{name:'단체톡 만들기',exact:true}).click()
  await page.getByRole('link').filter({hasText:'검증 단체톡'}).click()
  await page.getByPlaceholder('메시지를 입력하세요.').fill('단체 메시지')
  await page.getByRole('button',{name:'전송',exact:true}).click()
  await page.getByText('단체 메시지',{exact:true}).waitFor()
  await page.evaluate(()=>{const callbacks=window.__channels.filter(x=>x.filter.table==='group_chat_messages'&&x.filter.filter==='room_id=eq.group');for(const cb of callbacks)cb.fn({new:{id:'gm1'}})})
  assert.equal(await page.getByText('단체 메시지',{exact:true}).count(),1)
  await page.getByRole('button',{name:'이모티콘',exact:true})[width===390?'tap':'click']()
  await page.getByRole('button',{name:'따봉',exact:true}).click()
  await page.getByText('👍',{exact:true}).waitFor()
  await page.getByRole('button',{name:'이모티콘',exact:true})[width===390?'tap':'click']()
  await page.getByRole('button',{name:'커스텀 이모티콘 보내기'}).click()
  await page.waitForFunction(()=>!document.querySelector('.group-chat-composer textarea').disabled)
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'test.png',mimeType:'image/png',buffer:await page.screenshot({clip:{x:0,y:0,width:10,height:10}})})
  await page.waitForFunction(()=>document.querySelectorAll('.chat-image-lightbox-trigger').length>0)
  await page.locator('input[type=file][accept="video/*"]').setInputFiles({name:'clip.mov',mimeType:'video/quicktime',buffer:Buffer.from('test movie')})
  await page.locator('video').waitFor()
  assert.equal(uploads.length,2)
  assert.ok(sent.some(m=>m.message_type==='video'&&m.image_mime==='video/quicktime'))
  assert.ok(sent.some(m=>m.image_path==='chat-custom-stickers/me/test.png'))
  // A hidden tab must not mark new incoming messages as read.
  const readsBefore=readCalls
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}))
  await page.evaluate(()=>{for(const cb of window.__channels.filter(x=>x.filter.table==='group_chat_messages'&&x.filter.filter)) cb.fn({new:{id:'gm1'}})})
  await page.waitForTimeout(650)
  assert.equal(readCalls,readsBefore)
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'}))
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:`/tmp/group-chat-${width}.png`,fullPage:true})
  page.once('dialog',d=>d.accept())
  await page.getByRole('button',{name:'나가기',exact:true}).click()
  await page.waitForURL('**/#/chats')
  await page.getByText('기존 1:1 메시지',{exact:true}).waitFor()
  // Group-query errors must leave direct chats and their unread badge intact.
  groupFailure=true
  await page.reload()
  await page.getByText('기존 1:1 메시지',{exact:true}).waitFor()
  assert.equal(await page.locator('.chat-header-button span').textContent(),'1')
  await page.getByRole('tab',{name:'단체톡',exact:true}).click()
  await page.getByText('group_chat_rooms permission denied',{exact:true}).waitFor()
  await page.getByRole('tab',{name:'1:1 채팅',exact:true}).click()
  await page.getByRole('link').filter({hasText:'기존 1:1 메시지'}).click()
  await page.getByPlaceholder('메시지를 입력하세요.').waitFor()
  await page.getByPlaceholder('메시지를 입력하세요.').fill('기존 개인 채팅 전송')
  await page.getByRole('button',{name:'전송',exact:true}).click()
  await page.getByText('기존 개인 채팅 전송',{exact:true}).waitFor()
  assert.deepEqual(errors,[])
  await context.close()
  console.log(`PASS ${width}px: group create/invite/text/emoji/custom sticker/photo/video/realtime dedupe/read/leave; direct chat send + badge survive group errors`)
}
await browser.close()

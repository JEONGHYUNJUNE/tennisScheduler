-- Run with: supabase db query --linked --file tests/groupChatPermissions.sql
-- All fixtures and notifications roll back. No push webhook is invoked.
begin;
alter table public.ot_notifications disable trigger "send-push-notification";
create temp table group_test (actor uuid, peer uuid, outsider uuid, room uuid, message uuid);
insert into group_test(actor,peer,outsider)
select ids[1],ids[2],ids[3] from (
  select array_agg(id order by id) ids from (select id from public.otmember where coalesce(is_active,true) order by id limit 3) members
) candidates;
do $$ begin
  if (select outsider from group_test) is null then raise exception 'Three active members required'; end if;
end $$;
grant select,update on group_test to authenticated;
insert into public.ot_notification_preferences(member_id,chat_enabled)
select peer,true from group_test on conflict(member_id) do update set chat_enabled=true;
select set_config('request.jwt.claim.sub',actor::text,true) from group_test;
set local role authenticated;
update group_test set room=(public.create_group_chat('[ROLLBACK TEST] group',array[(select peer from group_test)])).id;
do $$ declare r uuid; msg uuid; begin
  select room into r from group_test;
  if (select count(*) from public.group_chat_members where room_id=r) <> 2 then raise exception 'Invites failed'; end if;
  insert into public.group_chat_messages(room_id,sender_member_id,message_type,body)
    values(r,(select outsider from group_test),'text','  검증 메시지  ') returning id into msg;
  update group_test set message=msg;
  if not exists(select 1 from public.group_chat_messages where id=msg and sender_member_id=(select actor from group_test) and body='검증 메시지') then raise exception 'Sender spoof or trim failure'; end if;
  begin
    insert into public.group_chat_messages(room_id,message_type,body) values(r,'text','  ');
    raise exception 'Empty text accepted';
  exception when raise_exception then
    if sqlerrm='Empty text accepted' then raise; end if;
  end;
  begin
    insert into public.group_chat_messages(room_id,message_type,body) values(r,'image','file');
    raise exception 'Missing media path accepted';
  exception when raise_exception then
    if sqlerrm='Missing media path accepted' then raise; end if;
  end;
  begin
    execute 'truncate public.group_chat_messages';
    raise exception 'Truncate accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.ot_notifications where group_chat_room_id=(select room from group_test)) <> 1 then raise exception 'Expected one recipient'; end if;
  if not exists(select 1 from public.ot_notifications where group_chat_room_id=(select room from group_test) and recipient_member_id=(select peer from group_test)) then raise exception 'Wrong notification recipient'; end if;
end $$;
select set_config('request.jwt.claim.sub',outsider::text,true) from group_test;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.group_chat_rooms where id=(select room from group_test))
    or exists(select 1 from public.group_chat_messages where room_id=(select room from group_test)) then raise exception 'Outsider can read'; end if;
  begin
    perform public.mark_group_chat_read((select room from group_test));
    raise exception 'Outsider can mark read';
  exception when raise_exception then
    if sqlerrm='Outsider can mark read' then raise; end if;
  end;
  begin
    insert into public.group_chat_messages(room_id,body) values((select room from group_test),'intruder');
    raise exception 'Outsider can send';
  exception when raise_exception or insufficient_privilege then
    if sqlerrm='Outsider can send' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',peer::text,true) from group_test;
set local role authenticated;
select public.mark_group_chat_read(room) from group_test;
do $$ begin
  if not exists(select 1 from public.group_chat_members where room_id=(select room from group_test) and member_id=(select peer from group_test) and last_read_at is not null) then raise exception 'Read receipt failed'; end if;
end $$;
select public.leave_group_chat(room) from group_test;
do $$ begin
  if exists(select 1 from public.group_chat_rooms where id=(select room from group_test)) then raise exception 'Left member can still read'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',actor::text,true) from group_test;
set local role authenticated;
insert into public.group_chat_messages(room_id,body) select room,'퇴장 이후 메시지' from group_test;
insert into public.group_chat_messages(room_id,message_type,body,image_path,image_mime)
  select room,'image','사진','group-chats/test/image.png','image/png' from group_test;
insert into public.group_chat_messages(room_id,message_type,body,image_path,image_mime)
  select room,'video','영상','group-chats/test/video.mp4','video/mp4' from group_test;
reset role;
do $$ begin
  if (select count(*) from public.ot_notifications where group_chat_room_id=(select room from group_test)) <> 1 then raise exception 'Left member notified'; end if;
end $$;
rollback;
select 'PASS: room creation, invites, sender spoof protection, blank/media validation, truncate denied, outsider read/write/read-receipt denied, member read receipt, leave, photo/video metadata and notification recipients; all rolled back' as result;

-- Roll back all test settings. The temporary inbox has no push/webhook triggers.
begin;
do $$
declare ids uuid[]; target uuid;
begin
  select array_agg(id) into ids from (select id from public.otmember where coalesce(is_active,true) limit 2) members;
  select id into target from public.tennis_events limit 1;
  if coalesce(array_length(ids,1),0) < 2 or target is null then raise exception 'Need two active members and one event'; end if;
  perform set_config('test.member1',ids[1]::text,true);
  perform set_config('test.member2',ids[2]::text,true);
  perform set_config('test.event',target::text,true);
  insert into public.ot_event_notification_mutes(member_id,event_id) values (ids[1],target),(ids[2],target) on conflict do nothing;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.member1'), true) is not null as identity_set;
do $$
begin
  if (select count(*) from public.ot_event_notification_mutes where event_id=current_setting('test.event')::uuid) <> 1 then raise exception 'RLS leaked other member preferences'; end if;
  delete from public.ot_event_notification_mutes where member_id=current_setting('test.member2')::uuid;
  begin
    insert into public.ot_event_notification_mutes(member_id,event_id) values (current_setting('test.member2')::uuid,current_setting('test.event')::uuid);
    raise exception 'RLS allowed another member insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
begin
 if not exists(select 1 from public.ot_event_notification_mutes where member_id=current_setting('test.member2')::uuid and event_id=current_setting('test.event')::uuid) then raise exception 'RLS allowed another member delete'; end if;
end $$;
-- Second member is unmuted only for this transaction.
delete from public.ot_event_notification_mutes where member_id=current_setting('test.member2')::uuid and event_id=current_setting('test.event')::uuid;
create temporary table test_notification_inbox(recipient_member_id uuid, event_id uuid);
create trigger check_mute before insert on test_notification_inbox for each row execute function public.suppress_muted_event_notification();
insert into test_notification_inbox values
 (current_setting('test.member1')::uuid,current_setting('test.event')::uuid),
 (current_setting('test.member2')::uuid,current_setting('test.event')::uuid),
 (current_setting('test.member1')::uuid,null);
do $$
begin
 if (select count(*) from test_notification_inbox) <> 2 then raise exception 'Mute filtering failed'; end if;
 if exists(select 1 from test_notification_inbox where recipient_member_id=current_setting('test.member1')::uuid and event_id is not null) then raise exception 'Muted event notification was delivered'; end if;
end $$;
rollback;

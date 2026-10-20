begin;
-- Disable webhooks and other side effects while exercising the reminder query.
set local session_replication_role = replica;
do $$
declare
  e uuid := gen_random_uuid();
  regular uuid := gen_random_uuid();
  m uuid;
  waiting_member uuid;
  today date := (now() at time zone 'Asia/Seoul')::date;
  n integer;
begin
  select id into m from public.otmember where coalesce(is_active,true) order by id limit 1;
  select id into waiting_member from public.otmember where coalesce(is_active,true) and id <> m order by id limit 1;
  if m is null or waiting_member is null then raise exception 'Test needs two active members'; end if;
  if public.monthly_event_occurrence('2028-02-01',31) <> '2028-02-29'
    or public.monthly_event_occurrence('2027-02-01',31) <> '2027-02-28'
    or public.monthly_event_occurrence('2027-03-01',31) <> '2027-03-31' then raise exception 'Month end failed'; end if;
  insert into public.tennis_events(id,title,event_date,start_time,location,created_by,repeat_monthly_day)
    values(e,'[ROLLBACK TEST] monthly',today - 40,'09:00','test',m,extract(day from today)::int);
  insert into public.tennis_attendances(event_id,member_id,status) values(e,m,'attending'),(e,waiting_member,'waiting');
  -- A previous month's delivery must not suppress this month's reminder.
  insert into public.ot_event_reminder_deliveries(event_id,member_id,reminder_type,occurrence_date)
    values(e,m,'same_day_08',today - 30);
  perform public.enqueue_due_event_reminders('same_day_08');
  select count(*) into n from public.ot_notifications where event_id=e;
  if n <> 1 then raise exception 'Expected exactly one attendee reminder, got %',n; end if;
  if exists(select 1 from public.ot_notifications where event_id=e and recipient_member_id<>m) then raise exception 'Non-attendee notified'; end if;
  perform public.enqueue_due_event_reminders('same_day_08');
  if (select count(*) from public.ot_notifications where event_id=e) <> 1 then raise exception 'Duplicate delivery'; end if;
  delete from public.ot_notifications where event_id=e;
  delete from public.ot_event_reminder_deliveries where event_id=e;
  delete from public.tennis_attendances where event_id=e and member_id=m;
  perform public.enqueue_due_event_reminders('same_day_08');
  if exists(select 1 from public.ot_notifications where event_id=e) then raise exception 'Cancelled member notified'; end if;
  insert into public.tennis_attendances(event_id,member_id,status) values(e,m,'attending');
  update public.tennis_events set repeat_until=today - 1 where id=e;
  perform public.enqueue_due_event_reminders('same_day_08');
  if exists(select 1 from public.ot_notifications where event_id=e) then raise exception 'Expired repeat notified'; end if;
  insert into public.tennis_events(id,title,event_date,start_time,location,created_by)
    values(regular,'[ROLLBACK TEST] regular',today,'09:00','test',m);
  insert into public.tennis_attendances(event_id,member_id,status) values(regular,m,'attending');
  perform public.enqueue_due_event_reminders('same_day_08');
  if (select count(*) from public.ot_notifications where event_id=regular) <> 1 then raise exception 'Regular reminder regressed'; end if;
  -- Re-enable FK cascades for deletion, still within the transaction that rolls back.
  set local session_replication_role = origin;
  delete from public.tennis_events where id=regular;
  if exists(select 1 from public.ot_event_reminder_deliveries where event_id=regular)
    or exists(select 1 from public.ot_notifications where event_id=regular) then raise exception 'Delete did not cascade'; end if;
end $$;
rollback;
select 'PASS: month end, attendee-only, multiple months, deduplication, cancellation, expiry, ordinary reminders, delete cascade; all test data rolled back' as result;

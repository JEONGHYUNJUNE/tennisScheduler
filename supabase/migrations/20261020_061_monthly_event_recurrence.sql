-- A recurring event keeps one attendance list. Cancelling attendance stops all future reminders.
begin;

alter table public.tennis_events
  add column if not exists repeat_monthly_day integer,
  add column if not exists repeat_until date;
alter table public.tennis_events add constraint tennis_events_monthly_repeat_check
  check ((repeat_monthly_day is null and repeat_until is null)
    or (repeat_monthly_day is not null and repeat_monthly_day between 1 and 31 and (repeat_until is null or repeat_until >= event_date)));

-- Clamp 29/30/31 to the month's last day, without drifting subsequent months.
create or replace function public.monthly_event_occurrence(target_month date, target_day integer)
returns date language sql immutable strict set search_path = '' as $$
  select (date_trunc('month', target_month)::date
    + (least(target_day, extract(day from (date_trunc('month', target_month) + interval '1 month - 1 day'))::integer) - 1));
$$;

alter table public.ot_event_reminder_deliveries add column if not exists occurrence_date date;
update public.ot_event_reminder_deliveries delivery
set occurrence_date = event.event_date
from public.tennis_events event where event.id = delivery.event_id and delivery.occurrence_date is null;
alter table public.ot_event_reminder_deliveries alter column occurrence_date set not null;
alter table public.ot_event_reminder_deliveries
  drop constraint ot_event_reminder_deliveries_event_id_member_id_reminder_ty_key;
alter table public.ot_event_reminder_deliveries add constraint ot_event_reminder_occurrence_unique
  unique (event_id, member_id, reminder_type, occurrence_date);

create or replace function public.enqueue_due_event_reminders(target_reminder_type text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  notification_count integer := 0;
  today_kst date := (now() at time zone 'Asia/Seoul')::date;
begin
  with due_reminders as (
    select event.id as event_id, attendance.member_id, reminder.reminder_type,
      reminder.target_event_date as occurrence_date, event.title, event.start_time, event.location
    from public.tennis_events event
    join public.tennis_attendances attendance on attendance.event_id = event.id
    join public.otmember member on member.id = attendance.member_id
    cross join lateral (values
      ('day_before_20'::text, today_kst + 1),
      ('same_day_08'::text, today_kst)
    ) as reminder(reminder_type, target_event_date)
    where attendance.status = 'attending'
      and coalesce(member.is_active, true)
      and (
        (event.repeat_monthly_day is null and event.event_date = reminder.target_event_date)
        or (event.repeat_monthly_day is not null
          and reminder.target_event_date >= event.event_date
          and (event.repeat_until is null or reminder.target_event_date <= event.repeat_until)
          and public.monthly_event_occurrence(reminder.target_event_date, event.repeat_monthly_day) = reminder.target_event_date)
      )
      and (target_reminder_type is null or reminder.reminder_type = target_reminder_type)
  ), inserted_deliveries as (
    insert into public.ot_event_reminder_deliveries (event_id, member_id, reminder_type, occurrence_date)
    select due.event_id, due.member_id, due.reminder_type, due.occurrence_date from due_reminders due
    on conflict (event_id, member_id, reminder_type, occurrence_date) do nothing
    returning event_id, member_id, reminder_type, occurrence_date
  )
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select due.member_id, null, due.event_id,
    case when due.reminder_type = 'day_before_20' then 'event_reminder_day_before' else 'event_reminder_today' end,
    case when due.reminder_type = 'day_before_20' then '내일 테니스 일정이 있습니다.' else '오늘 테니스 일정이 있습니다.' end,
    due.title || ' · ' || to_char(due.occurrence_date, 'YYYY-MM-DD') || ' '
      || coalesce(to_char(due.start_time, 'HH24:MI'), '시간 미정')
      || case when nullif(due.location, '') is not null then ' (' || due.location || ')' else '' end
  from inserted_deliveries delivery join due_reminders due
    using (event_id, member_id, reminder_type, occurrence_date);
  get diagnostics notification_count = row_count;
  return notification_count;
end;
$$;
-- Only scheduled server jobs should invoke delivery, never end-user RPC requests.
revoke execute on function public.enqueue_due_event_reminders(text) from public, anon, authenticated;

-- Recurring reminders are opt-in. Do not broadcast their creation to non-attendees.
create or replace function public.notify_tennis_event_inserted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.repeat_monthly_day is null then
    perform public.notify_active_members('new_event', '새로운 일정이 있습니다.',
      new.title || ' 일정이 등록되었습니다.', new.id, new.created_by);
  end if;
  return new;
end;
$$;

-- Include recurrence changes in the existing attendee-only edit notification.
create or replace function public.notify_tennis_event_updated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.title is distinct from new.title or old.event_date is distinct from new.event_date
    or old.start_time is distinct from new.start_time or old.end_time is distinct from new.end_time
    or old.location is distinct from new.location or old.max_participants is distinct from new.max_participants
    or old.memo is distinct from new.memo or old.repeat_monthly_day is distinct from new.repeat_monthly_day
    or old.repeat_until is distinct from new.repeat_until then
    perform public.notify_event_attendees('event_updated', '참석 일정이 수정되었습니다.',
      new.title || ' 일정 정보가 변경되었습니다.', new.id, new.created_by);
  end if;
  if new.max_participants is not null and (old.max_participants is null or new.max_participants > old.max_participants) then
    perform public.promote_waiting_attendances_for_event(new.id);
  end if;
  return new;
end;
$$;

commit;

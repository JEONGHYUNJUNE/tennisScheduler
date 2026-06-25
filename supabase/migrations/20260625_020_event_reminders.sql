-- 참석 확정자에게 일정 리마인더 알림을 생성합니다.
-- - 일정 하루 전 오후 8시
-- - 일정 당일 오전 8시
-- 이 함수는 ot_notifications에 알림을 넣고, 기존 Database Webhook/Edge Function이 푸시를 발송합니다.

create extension if not exists pg_cron with schema extensions;

create table if not exists public.ot_event_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tennis_events(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  reminder_type text not null,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, member_id, reminder_type)
);

alter table public.ot_event_reminder_deliveries
drop constraint if exists ot_event_reminder_deliveries_reminder_type_check;

alter table public.ot_event_reminder_deliveries
add constraint ot_event_reminder_deliveries_reminder_type_check
check (reminder_type in ('day_before_20', 'same_day_08'));

create index if not exists ot_event_reminder_deliveries_event_idx
on public.ot_event_reminder_deliveries(event_id);

create index if not exists ot_event_reminder_deliveries_member_idx
on public.ot_event_reminder_deliveries(member_id);

alter table public.ot_event_reminder_deliveries enable row level security;

create or replace function public.enqueue_due_event_reminders(target_reminder_type text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_count integer := 0;
  today_kst date := (now() at time zone 'Asia/Seoul')::date;
begin
  with due_reminders as (
    select
      event.id as event_id,
      attendance.member_id,
      reminder.reminder_type,
      event.title,
      event.event_date,
      event.start_time,
      event.location
    from public.tennis_events event
    join public.tennis_attendances attendance
      on attendance.event_id = event.id
    join public.otmember member
      on member.id = attendance.member_id
    cross join lateral (
      values
        (
          'day_before_20'::text,
          today_kst + 1
        ),
        (
          'same_day_08'::text,
          today_kst
        )
    ) as reminder(reminder_type, target_event_date)
    where attendance.status = 'attending'
      and coalesce(member.is_active, true) = true
      and event.event_date = reminder.target_event_date
      and (target_reminder_type is null or reminder.reminder_type = target_reminder_type)
  ),
  inserted_deliveries as (
    insert into public.ot_event_reminder_deliveries (event_id, member_id, reminder_type)
    select due.event_id, due.member_id, due.reminder_type
    from due_reminders due
    on conflict (event_id, member_id, reminder_type) do nothing
    returning event_id, member_id, reminder_type
  )
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select
    due.member_id,
    null,
    due.event_id,
    due.reminder_type,
    case
      when due.reminder_type = 'day_before_20' then '내일 테니스 일정이 있습니다.'
      else '오늘 테니스 일정이 있습니다.'
    end,
    due.title
      || case
        when due.reminder_type = 'day_before_20' then ' 일정이 내일 '
        else ' 일정이 오늘 '
      end
      || coalesce(to_char(due.start_time, 'HH24:MI'), '시간 미정')
      || '에 시작됩니다.'
      || case
        when nullif(due.location, '') is not null then ' (' || due.location || ')'
        else ''
      end
  from inserted_deliveries delivery
  join due_reminders due
    on due.event_id = delivery.event_id
   and due.member_id = delivery.member_id
   and due.reminder_type = delivery.reminder_type;

  get diagnostics notification_count = row_count;
  return notification_count;
end;
$$;

do $$
begin
  begin
    perform cron.unschedule('ot-event-reminders-every-5-minutes');
  exception
    when others then null;
  end;

  begin
    perform cron.unschedule('ot-event-reminders-day-before-20');
  exception
    when others then null;
  end;

  begin
    perform cron.unschedule('ot-event-reminders-same-day-08');
  exception
    when others then null;
  end;
end;
$$;

-- pg_cron은 UTC 기준으로 실행됩니다.
-- 11:00 UTC = 20:00 KST, 23:00 UTC = 다음날 08:00 KST
select cron.schedule(
  'ot-event-reminders-day-before-20',
  '0 11 * * *',
  $$select public.enqueue_due_event_reminders('day_before_20');$$
);

select cron.schedule(
  'ot-event-reminders-same-day-08',
  '0 23 * * *',
  $$select public.enqueue_due_event_reminders('same_day_08');$$
);

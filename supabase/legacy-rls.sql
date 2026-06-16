-- 기존 OT Tennis 스키마(id, username, display_name, max_participants)용 RLS 정책입니다.
-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

alter table public.otmember enable row level security;
alter table public.tennis_events enable row level security;
alter table public.tennis_attendances enable row level security;

alter table public.tennis_attendances
drop constraint if exists tennis_attendances_status_check;

alter table public.tennis_attendances
add constraint tennis_attendances_status_check
check (status in ('attending', 'waiting'));

create table if not exists public.ot_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_member_id uuid not null references public.otmember(id) on delete cascade,
  actor_member_id uuid references public.otmember(id) on delete set null,
  event_id uuid references public.tennis_events(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ot_notifications_recipient_created_at_idx
on public.ot_notifications(recipient_member_id, created_at desc);

alter table public.ot_notifications enable row level security;

drop policy if exists "members can read own notifications" on public.ot_notifications;
create policy "members can read own notifications"
on public.ot_notifications for select to authenticated
using (recipient_member_id = auth.uid());

drop policy if exists "members can mark own notifications read" on public.ot_notifications;
create policy "members can mark own notifications read"
on public.ot_notifications for update to authenticated
using (recipient_member_id = auth.uid())
with check (recipient_member_id = auth.uid());

create or replace function public.notify_active_members(
  notification_type text,
  notification_title text,
  notification_message text,
  target_event_id uuid,
  actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select member.id, actor_id, target_event_id, notification_type, notification_title, notification_message
  from public.otmember member
  where coalesce(member.is_active, true) = true;
end;
$$;

create or replace function public.notify_admin_members(
  notification_type text,
  notification_title text,
  notification_message text,
  target_event_id uuid,
  actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select member.id, actor_id, target_event_id, notification_type, notification_title, notification_message
  from public.otmember member
  where member.role = 'admin'
    and coalesce(member.is_active, true) = true
    and (actor_id is null or member.id <> actor_id);
end;
$$;

create or replace function public.notify_event_attendees(
  notification_type text,
  notification_title text,
  notification_message text,
  target_event_id uuid,
  actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select distinct attendance.member_id, actor_id, target_event_id, notification_type, notification_title, notification_message
  from public.tennis_attendances attendance
  join public.otmember member on member.id = attendance.member_id
  where attendance.event_id = target_event_id
    and attendance.status in ('attending', 'waiting')
    and coalesce(member.is_active, true) = true;
end;
$$;

create or replace function public.promote_waiting_attendances_for_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_count integer;
  attending_count integer;
  open_slots integer;
begin
  select max_participants into max_count
  from public.tennis_events
  where id = target_event_id;

  if max_count is null then
    return;
  end if;

  select count(*) into attending_count
  from public.tennis_attendances
  where event_id = target_event_id
    and status = 'attending';

  open_slots := greatest(max_count - attending_count, 0);

  if open_slots <= 0 then
    return;
  end if;

  update public.tennis_attendances
  set status = 'attending'
  where id in (
    select waiting.id
    from public.tennis_attendances waiting
    where waiting.event_id = target_event_id
      and waiting.status = 'waiting'
    order by waiting.created_at asc
    limit open_slots
  );
end;
$$;

create or replace function public.notify_tennis_event_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_active_members(
    'new_event',
    '새로운 일정이 있습니다.',
    new.title || ' 일정이 등록되었습니다.',
    new.id,
    new.created_by
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_event_inserted on public.tennis_events;
create trigger notify_tennis_event_inserted
after insert on public.tennis_events
for each row execute function public.notify_tennis_event_inserted();

create or replace function public.notify_tennis_event_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.title is distinct from new.title
    or old.event_date is distinct from new.event_date
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.location is distinct from new.location
    or old.max_participants is distinct from new.max_participants
    or old.memo is distinct from new.memo then
    perform public.notify_event_attendees(
      'event_updated',
      '참석 일정이 수정되었습니다.',
      new.title || ' 일정 정보가 변경되었습니다.',
      new.id,
      new.created_by
    );
  end if;

  if new.max_participants is not null
    and (old.max_participants is null or new.max_participants > old.max_participants) then
    perform public.promote_waiting_attendances_for_event(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_tennis_event_updated on public.tennis_events;
create trigger notify_tennis_event_updated
after update on public.tennis_events
for each row execute function public.notify_tennis_event_updated();

create or replace function public.notify_attendance_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  event_title text;
begin
  select coalesce(display_name, username) into actor_name from public.otmember where id = new.member_id;
  select title into event_title from public.tennis_events where id = new.event_id;

  perform public.notify_admin_members(
    'attendance_created',
    case when new.status = 'waiting' then '대기 신청이 있습니다.' else '참석 신청이 있습니다.' end,
    actor_name || '님이 ' || event_title || ' 일정에 ' || case when new.status = 'waiting' then '대기 신청했습니다.' else '참석 신청했습니다.' end,
    new.event_id,
    new.member_id
  );

  return new;
end;
$$;

drop trigger if exists notify_attendance_inserted on public.tennis_attendances;
create trigger notify_attendance_inserted
after insert on public.tennis_attendances
for each row execute function public.notify_attendance_inserted();

create or replace function public.notify_attendance_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  event_title text;
begin
  select coalesce(display_name, username) into actor_name from public.otmember where id = old.member_id;
  select title into event_title from public.tennis_events where id = old.event_id;

  perform public.notify_admin_members(
    'attendance_cancelled',
    case when old.status = 'waiting' then '대기 취소가 있습니다.' else '참석 취소가 있습니다.' end,
    actor_name || '님이 ' || event_title || ' 일정의 ' || case when old.status = 'waiting' then '대기를 취소했습니다.' else '참석을 취소했습니다.' end,
    old.event_id,
    old.member_id
  );

  return old;
end;
$$;

drop trigger if exists notify_attendance_deleted on public.tennis_attendances;
create trigger notify_attendance_deleted
after delete on public.tennis_attendances
for each row execute function public.notify_attendance_deleted();

create or replace function public.notify_attendance_promoted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  event_title text;
begin
  if old.status = 'waiting' and new.status = 'attending' then
    select coalesce(display_name, username) into actor_name from public.otmember where id = new.member_id;
    select title into event_title from public.tennis_events where id = new.event_id;

    insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
    values (
      new.member_id,
      new.member_id,
      new.event_id,
      'waiting_promoted',
      '대기에서 참석으로 변경되었습니다.',
      event_title || ' 일정에 참석 확정되었습니다.'
    );

    perform public.notify_admin_members(
      'waiting_promoted',
      '대기자가 참석으로 변경되었습니다.',
      actor_name || '님이 ' || event_title || ' 일정의 대기에서 참석으로 변경되었습니다.',
      new.event_id,
      new.member_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_attendance_promoted on public.tennis_attendances;
create trigger notify_attendance_promoted
after update on public.tennis_attendances
for each row execute function public.notify_attendance_promoted();

create or replace function public.promote_first_waiting_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'attending' then
    perform public.promote_waiting_attendances_for_event(old.event_id);
  end if;

  return old;
end;
$$;

drop trigger if exists promote_first_waiting_attendance on public.tennis_attendances;
create trigger promote_first_waiting_attendance
after delete on public.tennis_attendances
for each row execute function public.promote_first_waiting_attendance();

drop policy if exists "members can read profiles" on public.otmember;
create policy "members can read profiles"
on public.otmember for select to authenticated
using (true);

drop policy if exists "members can insert own profile" on public.otmember;
create policy "members can insert own profile"
on public.otmember for insert to authenticated
with check (id = auth.uid() and role = 'member');

drop policy if exists "members can update own profile" on public.otmember;
create policy "members can update own profile"
on public.otmember for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "admins can update member profiles" on public.otmember;
create policy "admins can update member profiles"
on public.otmember for update to authenticated
using (
  exists (
    select 1 from public.otmember admin_member
    where admin_member.id = auth.uid()
      and admin_member.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.otmember admin_member
    where admin_member.id = auth.uid()
      and admin_member.role = 'admin'
  )
);

drop policy if exists "members can read events" on public.tennis_events;
create policy "members can read events"
on public.tennis_events for select to authenticated
using (true);

drop policy if exists "admins can create events" on public.tennis_events;
create policy "admins can create events"
on public.tennis_events for insert to authenticated
with check (
  exists (
    select 1 from public.otmember
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "admins can update events" on public.tennis_events;
create policy "admins can update events"
on public.tennis_events for update to authenticated
using (
  exists (
    select 1 from public.otmember
    where id = auth.uid() and role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.otmember
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "admins can delete events" on public.tennis_events;
create policy "admins can delete events"
on public.tennis_events for delete to authenticated
using (
  exists (
    select 1 from public.otmember
    where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "members can read attendances" on public.tennis_attendances;
create policy "members can read attendances"
on public.tennis_attendances for select to authenticated
using (true);

drop policy if exists "members can attend as themselves" on public.tennis_attendances;
create policy "members can attend as themselves"
on public.tennis_attendances for insert to authenticated
with check (member_id = auth.uid() and status in ('attending', 'waiting'));

drop policy if exists "members can cancel own attendance" on public.tennis_attendances;
create policy "members can cancel own attendance"
on public.tennis_attendances for delete to authenticated
using (member_id = auth.uid());

-- 게스트 참석 기능 추가
-- 실행 방법: Supabase SQL Editor에서 이 파일 전체를 실행하세요.

create extension if not exists pgcrypto;

alter table public.tennis_attendances
drop constraint if exists tennis_attendances_member_id_fkey;

alter table public.tennis_attendances
add constraint tennis_attendances_member_id_fkey
foreign key (member_id) references public.otmember(id) on delete cascade;

create or replace function public.is_active_admin(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.otmember member
    where member.id = target_member_id
      and member.role = 'admin'
      and coalesce(member.is_active, true) = true
  );
$$;

alter table public.tennis_attendances
  alter column member_id drop not null;

alter table public.tennis_attendances
  add column if not exists guest_name text,
  add column if not exists guest_memo text,
  add column if not exists created_by uuid references public.otmember(id) on delete set null;

alter table public.tennis_attendances
drop constraint if exists tennis_attendances_member_or_guest_check;

alter table public.tennis_attendances
add constraint tennis_attendances_member_or_guest_check
check (
  (
    member_id is not null
    and nullif(btrim(coalesce(guest_name, '')), '') is null
  )
  or (
    member_id is null
    and nullif(btrim(coalesce(guest_name, '')), '') is not null
  )
);

create unique index if not exists tennis_attendances_event_member_unique_idx
on public.tennis_attendances(event_id, member_id)
where member_id is not null;

create unique index if not exists tennis_attendances_event_guest_name_unique_idx
on public.tennis_attendances(event_id, lower(guest_name))
where guest_name is not null;

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
  actor_name := coalesce(
    new.guest_name,
    (select coalesce(display_name, username) from public.otmember where id = new.member_id),
    '알 수 없는 사용자'
  );

  select title into event_title from public.tennis_events where id = new.event_id;

  perform public.notify_admin_members(
    'attendance_created',
    case when new.status = 'waiting' then '대기 신청이 있습니다.' else '참석 신청이 있습니다.' end,
    actor_name || '님이 ' || event_title || ' 일정에 ' || case when new.status = 'waiting' then '대기 신청했습니다.' else '참석 신청했습니다.' end,
    new.event_id,
    coalesce(new.member_id, new.created_by)
  );

  return new;
end;
$$;

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
  actor_name := coalesce(
    old.guest_name,
    (select coalesce(display_name, username) from public.otmember where id = old.member_id),
    '알 수 없는 사용자'
  );

  select title into event_title from public.tennis_events where id = old.event_id;

  perform public.notify_admin_members(
    'attendance_cancelled',
    case when old.status = 'waiting' then '대기 취소가 있습니다.' else '참석 취소가 있습니다.' end,
    actor_name || '님이 ' || event_title || ' 일정의 ' || case when old.status = 'waiting' then '대기를 취소했습니다.' else '참석을 취소했습니다.' end,
    old.event_id,
    coalesce(old.member_id, old.created_by)
  );

  return old;
end;
$$;

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
    actor_name := coalesce(
      new.guest_name,
      (select coalesce(display_name, username) from public.otmember where id = new.member_id),
      '알 수 없는 사용자'
    );
    select title into event_title from public.tennis_events where id = new.event_id;

    if new.member_id is not null then
      insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
      values (
        new.member_id,
        new.member_id,
        new.event_id,
        'waiting_promoted',
        '대기에서 참석으로 변경되었습니다.',
        event_title || ' 일정에 참석 확정되었습니다.'
      );
    end if;

    perform public.notify_admin_members(
      'waiting_promoted',
      '대기자가 참석으로 변경되었습니다.',
      actor_name || '님이 ' || event_title || ' 일정의 대기에서 참석으로 변경되었습니다.',
      new.event_id,
      coalesce(new.member_id, new.created_by)
    );
  end if;

  return new;
end;
$$;

drop policy if exists "admins can add guest attendances" on public.tennis_attendances;
create policy "admins can add guest attendances"
on public.tennis_attendances for insert to authenticated
with check (
  member_id is null
  and nullif(btrim(coalesce(guest_name, '')), '') is not null
  and created_by = auth.uid()
  and status in ('attending', 'waiting')
  and public.is_active_admin(auth.uid())
);

drop policy if exists "admins can remove guest attendances" on public.tennis_attendances;
create policy "admins can remove guest attendances"
on public.tennis_attendances for delete to authenticated
using (
  member_id is null
  and public.is_active_admin(auth.uid())
);

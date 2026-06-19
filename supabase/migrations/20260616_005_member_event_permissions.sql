-- 일반 회원도 일정을 등록할 수 있게 하고,
-- 수정/삭제는 관리자 또는 해당 일정 작성자(created_by)만 가능하게 변경합니다.
-- 실행 방법: Supabase SQL Editor에서 이 파일 전체를 실행하세요.

create or replace function public.is_active_member(target_member_id uuid)
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
      and coalesce(member.is_active, true) = true
  );
$$;

create or replace function public.can_manage_event(target_event_id uuid, actor_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_events event
    join public.otmember member on member.id = actor_member_id
    where event.id = target_event_id
      and coalesce(member.is_active, true) = true
      and (
        member.role = 'admin'
        or event.created_by = actor_member_id
      )
  );
$$;

drop policy if exists "admins can create events" on public.tennis_events;
drop policy if exists "admins can update events" on public.tennis_events;
drop policy if exists "admins can delete events" on public.tennis_events;

create policy "active members can create events"
on public.tennis_events for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_active_member(auth.uid())
);

create policy "owners or admins can update events"
on public.tennis_events for update to authenticated
using (public.can_manage_event(id, auth.uid()))
with check (public.can_manage_event(id, auth.uid()));

create policy "owners or admins can delete events"
on public.tennis_events for delete to authenticated
using (public.can_manage_event(id, auth.uid()));

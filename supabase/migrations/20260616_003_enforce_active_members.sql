-- 비활성 회원(is_active = false)의 서비스 이용을 DB 정책에서도 제한합니다.
-- 비활성 회원은 로그인은 가능하지만 일정/참석/관리 기능을 사용할 수 없습니다.

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

drop policy if exists "members can read events" on public.tennis_events;
create policy "members can read events"
on public.tennis_events for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "admins can create events" on public.tennis_events;
create policy "admins can create events"
on public.tennis_events for insert to authenticated
with check (public.is_active_admin(auth.uid()));

drop policy if exists "admins can update events" on public.tennis_events;
create policy "admins can update events"
on public.tennis_events for update to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists "admins can delete events" on public.tennis_events;
create policy "admins can delete events"
on public.tennis_events for delete to authenticated
using (public.is_active_admin(auth.uid()));

drop policy if exists "members can read attendances" on public.tennis_attendances;
create policy "members can read attendances"
on public.tennis_attendances for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "members can attend as themselves" on public.tennis_attendances;
create policy "members can attend as themselves"
on public.tennis_attendances for insert to authenticated
with check (
  member_id = auth.uid()
  and status in ('attending', 'waiting')
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can cancel own attendance" on public.tennis_attendances;
create policy "members can cancel own attendance"
on public.tennis_attendances for delete to authenticated
using (
  member_id = auth.uid()
  and public.is_active_member(auth.uid())
);

drop policy if exists "admins can update member profiles" on public.otmember;
create policy "admins can update member profiles"
on public.otmember for update to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists "members can read own notifications" on public.ot_notifications;
create policy "members can read own notifications"
on public.ot_notifications for select to authenticated
using (
  recipient_member_id = auth.uid()
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can mark own notifications read" on public.ot_notifications;
create policy "members can mark own notifications read"
on public.ot_notifications for update to authenticated
using (
  recipient_member_id = auth.uid()
  and public.is_active_member(auth.uid())
)
with check (
  recipient_member_id = auth.uid()
  and public.is_active_member(auth.uid())
);

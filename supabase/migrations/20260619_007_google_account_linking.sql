-- Google 계정을 기존 아이디 계정에 연결하기 위한 컬럼/정책/헬퍼 보강
-- 실행 방법: Supabase SQL Editor에서 이 파일 전체를 실행하세요.

alter table public.otmember
add column if not exists google_auth_user_id uuid unique;

create or replace function public.member_matches_auth(target_member_id uuid)
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
      and (
        member.id = auth.uid()
        or member.google_auth_user_id = auth.uid()
      )
  );
$$;

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
    where (
        member.id = target_member_id
        or member.google_auth_user_id = target_member_id
      )
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
    where (
        member.id = target_member_id
        or member.google_auth_user_id = target_member_id
      )
      and member.role = 'admin'
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
    join public.otmember member
      on member.id = actor_member_id
      or member.google_auth_user_id = actor_member_id
    where event.id = target_event_id
      and coalesce(member.is_active, true) = true
      and (
        member.role = 'admin'
        or event.created_by = member.id
      )
  );
$$;

drop policy if exists "members can update own profile" on public.otmember;
create policy "members can update own profile"
on public.otmember for update to authenticated
using (
  id = auth.uid()
  or google_auth_user_id = auth.uid()
)
with check (
  id = auth.uid()
  or google_auth_user_id = auth.uid()
);

drop policy if exists "active members can create events" on public.tennis_events;
create policy "active members can create events"
on public.tennis_events for insert to authenticated
with check (
  public.member_matches_auth(created_by)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update events" on public.tennis_events;
create policy "owners or admins can update events"
on public.tennis_events for update to authenticated
using (public.can_manage_event(id, auth.uid()))
with check (public.can_manage_event(id, auth.uid()));

drop policy if exists "owners or admins can delete events" on public.tennis_events;
create policy "owners or admins can delete events"
on public.tennis_events for delete to authenticated
using (public.can_manage_event(id, auth.uid()));

drop policy if exists "members can attend as themselves" on public.tennis_attendances;
create policy "members can attend as themselves"
on public.tennis_attendances for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and status in ('attending', 'waiting')
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can cancel own attendance" on public.tennis_attendances;
create policy "members can cancel own attendance"
on public.tennis_attendances for delete to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can read own notifications" on public.ot_notifications;
create policy "members can read own notifications"
on public.ot_notifications for select to authenticated
using (
  public.member_matches_auth(recipient_member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can mark own notifications read" on public.ot_notifications;
create policy "members can mark own notifications read"
on public.ot_notifications for update to authenticated
using (
  public.member_matches_auth(recipient_member_id)
  and public.is_active_member(auth.uid())
)
with check (
  public.member_matches_auth(recipient_member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "admins can add guest attendances" on public.tennis_attendances;
create policy "admins can add guest attendances"
on public.tennis_attendances for insert to authenticated
with check (
  member_id is null
  and nullif(btrim(coalesce(guest_name, '')), '') is not null
  and public.member_matches_auth(created_by)
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

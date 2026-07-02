-- 그룹다이어리 생성/초대가 계정 연결 방식에 따라 RLS에 막히지 않도록 RPC로 보강합니다.

create or replace function public.current_otmember_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.id
  from public.otmember member
  where (
      member.id = auth.uid()
      or member.google_auth_user_id = auth.uid()
    )
    and coalesce(member.is_active, true) = true
  limit 1;
$$;

create or replace function public.can_read_tennis_diary_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_groups diary_group
    join public.otmember actor on actor.id = public.current_otmember_id()
    where diary_group.id = target_group_id
      and coalesce(actor.is_active, true) = true
      and (
        diary_group.owner_member_id = actor.id
        or actor.role = 'admin'
        or exists (
          select 1
          from public.tennis_diary_group_members membership
          where membership.group_id = diary_group.id
            and membership.member_id = actor.id
            and membership.status in ('pending', 'accepted')
        )
      )
  );
$$;

create or replace function public.can_manage_tennis_diary_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_groups diary_group
    join public.otmember actor on actor.id = public.current_otmember_id()
    where diary_group.id = target_group_id
      and coalesce(actor.is_active, true) = true
      and (
        diary_group.owner_member_id = actor.id
        or actor.role = 'admin'
      )
  );
$$;

drop policy if exists "members can read own diary groups" on public.tennis_diary_groups;
create policy "members can read own diary groups"
on public.tennis_diary_groups for select to authenticated
using (public.can_read_tennis_diary_group(id));

drop policy if exists "active members can create diary groups" on public.tennis_diary_groups;
create policy "active members can create diary groups"
on public.tennis_diary_groups for insert to authenticated
with check (
  owner_member_id = public.current_otmember_id()
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can insert own diary groups fallback" on public.tennis_diary_groups;
create policy "members can insert own diary groups fallback"
on public.tennis_diary_groups for insert to authenticated
with check (
  public.member_matches_auth(owner_member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update diary groups" on public.tennis_diary_groups;
create policy "owners or admins can update diary groups"
on public.tennis_diary_groups for update to authenticated
using (public.can_manage_tennis_diary_group(id))
with check (public.can_manage_tennis_diary_group(id));

drop policy if exists "members can read own group memberships" on public.tennis_diary_group_members;
create policy "members can read own group memberships"
on public.tennis_diary_group_members for select to authenticated
using (
  public.is_active_admin(auth.uid())
  or public.can_manage_tennis_diary_group(group_id)
  or public.member_matches_auth(member_id)
  or (
    status = 'accepted'
    and public.is_tennis_diary_group_member(group_id, public.current_otmember_id())
  )
);

drop policy if exists "owners or admins can invite diary group members" on public.tennis_diary_group_members;
create policy "owners or admins can invite diary group members"
on public.tennis_diary_group_members for insert to authenticated
with check (
  public.can_manage_tennis_diary_group(group_id)
  or (
    member_id = public.current_otmember_id()
    and role = 'owner'
    and status = 'accepted'
  )
);

drop policy if exists "members can respond or owners can update diary group members" on public.tennis_diary_group_members;
create policy "members can respond or owners can update diary group members"
on public.tennis_diary_group_members for update to authenticated
using (
  public.can_manage_tennis_diary_group(group_id)
  or member_id = public.current_otmember_id()
)
with check (
  public.can_manage_tennis_diary_group(group_id)
  or member_id = public.current_otmember_id()
);

create or replace function public.create_tennis_diary_group(
  group_name text,
  invitee_member_ids uuid[] default '{}'
)
returns table (
  id uuid,
  name text,
  owner_member_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  created_group_id uuid;
begin
  actor_member_id := public.current_otmember_id();

  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  insert into public.tennis_diary_groups (name, owner_member_id)
  values (trim(group_name), actor_member_id)
  returning tennis_diary_groups.id into created_group_id;

  insert into public.tennis_diary_group_members (
    group_id,
    member_id,
    role,
    status,
    invited_by_member_id,
    responded_at
  )
  values (
    created_group_id,
    actor_member_id,
    'owner',
    'accepted',
    actor_member_id,
    now()
  )
  on conflict (group_id, member_id) do update
  set
    role = 'owner',
    status = 'accepted',
    invited_by_member_id = excluded.invited_by_member_id,
    responded_at = excluded.responded_at;

  insert into public.tennis_diary_group_members (
    group_id,
    member_id,
    role,
    status,
    invited_by_member_id
  )
  select
    created_group_id,
    candidate.member_id,
    'member',
    'pending',
    actor_member_id
  from (
    select distinct unnest(coalesce(invitee_member_ids, '{}'::uuid[])) as member_id
  ) candidate
  join public.otmember member on member.id = candidate.member_id
  where candidate.member_id <> actor_member_id
    and coalesce(member.is_active, true) = true
  on conflict (group_id, member_id) do update
  set
    status = 'pending',
    role = 'member',
    invited_by_member_id = excluded.invited_by_member_id,
    responded_at = null;

  return query
  select
    diary_group.id,
    diary_group.name,
    diary_group.owner_member_id,
    diary_group.created_at
  from public.tennis_diary_groups diary_group
  where diary_group.id = created_group_id;
end;
$$;

create or replace function public.invite_tennis_diary_group_members(
  target_group_id uuid,
  invitee_member_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
begin
  actor_member_id := public.current_otmember_id();

  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if not public.can_manage_tennis_diary_group(target_group_id) then
    raise exception '그룹 다이어리 초대 권한이 없습니다.';
  end if;

  insert into public.tennis_diary_group_members (
    group_id,
    member_id,
    role,
    status,
    invited_by_member_id,
    responded_at
  )
  select
    target_group_id,
    candidate.member_id,
    'member',
    'pending',
    actor_member_id,
    null
  from (
    select distinct unnest(coalesce(invitee_member_ids, '{}'::uuid[])) as member_id
  ) candidate
  join public.otmember member on member.id = candidate.member_id
  where candidate.member_id <> actor_member_id
    and coalesce(member.is_active, true) = true
  on conflict (group_id, member_id) do update
  set
    status = 'pending',
    role = 'member',
    invited_by_member_id = excluded.invited_by_member_id,
    responded_at = null;
end;
$$;

create or replace function public.delete_tennis_diary_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_ids uuid[];
  comment_ids uuid[];
begin
  if not public.is_active_admin(auth.uid()) then
    raise exception '그룹 다이어리 삭제 권한이 없습니다.';
  end if;

  select coalesce(array_agg(entry.id), '{}'::uuid[])
  into entry_ids
  from public.tennis_diary_entries entry
  where entry.group_id = target_group_id;

  select coalesce(array_agg(comment.id), '{}'::uuid[])
  into comment_ids
  from public.tennis_diary_comments comment
  where comment.entry_id = any(entry_ids);

  delete from public.ot_mentions mention
  where (
      mention.source_type = 'tennis_diary_entry'
      and mention.source_id = any(entry_ids)
    )
    or (
      mention.source_type = 'tennis_diary_comment'
      and mention.source_id = any(comment_ids)
    );

  delete from public.tennis_diary_entries entry
  where entry.group_id = target_group_id;

  delete from public.tennis_diary_groups diary_group
  where diary_group.id = target_group_id;

  if not found then
    raise exception '삭제할 그룹 다이어리를 찾을 수 없습니다.';
  end if;
end;
$$;

grant execute on function public.create_tennis_diary_group(text, uuid[]) to authenticated;
grant execute on function public.invite_tennis_diary_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.delete_tennis_diary_group(uuid) to authenticated;

insert into public.tennis_diary_group_members (
  group_id,
  member_id,
  role,
  status,
  invited_by_member_id,
  responded_at
)
select
  diary_group.id,
  diary_group.owner_member_id,
  'owner',
  'accepted',
  diary_group.owner_member_id,
  now()
from public.tennis_diary_groups diary_group
on conflict (group_id, member_id) do update
set
  role = 'owner',
  status = 'accepted',
  responded_at = coalesce(public.tennis_diary_group_members.responded_at, excluded.responded_at);

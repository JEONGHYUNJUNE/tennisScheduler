-- 테니스 다이어리에 초대 기반 그룹 공개 범위를 추가합니다.

create table if not exists public.tennis_diary_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  owner_member_id uuid not null references public.otmember(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tennis_diary_group_members (
  group_id uuid not null references public.tennis_diary_groups(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by_member_id uuid references public.otmember(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, member_id)
);

alter table public.tennis_diary_entries
add column if not exists group_id uuid references public.tennis_diary_groups(id) on delete set null;

alter table public.tennis_diary_entries
drop constraint if exists tennis_diary_entries_visibility_check;

alter table public.tennis_diary_entries
add constraint tennis_diary_entries_visibility_check
check (visibility in ('public', 'private', 'group'));

create index if not exists tennis_diary_group_members_member_idx
on public.tennis_diary_group_members(member_id, status);

create index if not exists tennis_diary_entries_group_idx
on public.tennis_diary_entries(group_id);

alter table public.tennis_diary_groups enable row level security;
alter table public.tennis_diary_group_members enable row level security;

create or replace function public.is_tennis_diary_group_member(target_group_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_group_members membership
    where membership.group_id = target_group_id
      and membership.member_id = target_member_id
      and membership.status = 'accepted'
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
    join public.otmember actor on public.member_matches_auth(actor.id)
    where diary_group.id = target_group_id
      and coalesce(actor.is_active, true) = true
      and (diary_group.owner_member_id = actor.id or actor.role = 'admin')
  );
$$;

create or replace function public.can_read_tennis_diary_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_entries entry
    join public.otmember actor on public.member_matches_auth(actor.id)
    where entry.id = target_entry_id
      and coalesce(actor.is_active, true) = true
      and (
        entry.visibility = 'public'
        or entry.member_id = actor.id
        or actor.role = 'admin'
        or (
          entry.visibility = 'group'
          and entry.group_id is not null
          and public.is_tennis_diary_group_member(entry.group_id, actor.id)
        )
      )
  );
$$;

drop policy if exists "members can read own diary groups" on public.tennis_diary_groups;
create policy "members can read own diary groups"
on public.tennis_diary_groups for select to authenticated
using (
  public.is_active_admin(auth.uid())
  or exists (
    select 1 from public.tennis_diary_group_members membership
    join public.otmember actor on public.member_matches_auth(actor.id)
    where membership.group_id = id
      and membership.member_id = actor.id
      and membership.status in ('pending', 'accepted')
  )
);

drop policy if exists "active members can create diary groups" on public.tennis_diary_groups;
create policy "active members can create diary groups"
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
    and exists (
      select 1 from public.tennis_diary_group_members my_membership
      join public.otmember actor on public.member_matches_auth(actor.id)
      where my_membership.group_id = tennis_diary_group_members.group_id
        and my_membership.member_id = actor.id
        and my_membership.status = 'accepted'
    )
  )
);

drop policy if exists "owners or admins can invite diary group members" on public.tennis_diary_group_members;
create policy "owners or admins can invite diary group members"
on public.tennis_diary_group_members for insert to authenticated
with check (
  public.can_manage_tennis_diary_group(group_id)
  or (
    public.member_matches_auth(member_id)
    and role = 'owner'
    and status = 'accepted'
  )
);

drop policy if exists "members can respond or owners can update diary group members" on public.tennis_diary_group_members;
create policy "members can respond or owners can update diary group members"
on public.tennis_diary_group_members for update to authenticated
using (
  public.can_manage_tennis_diary_group(group_id)
  or public.member_matches_auth(member_id)
)
with check (
  public.can_manage_tennis_diary_group(group_id)
  or public.member_matches_auth(member_id)
);

drop policy if exists "active members can read visible diary entries" on public.tennis_diary_entries;
create policy "active members can read visible diary entries"
on public.tennis_diary_entries for select to authenticated
using (public.can_read_tennis_diary_entry(id));

create or replace function public.validate_tennis_diary_group_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'group' then
    if new.group_id is null then
      raise exception 'Group diary requires group_id.';
    end if;

    if not public.is_tennis_diary_group_member(new.group_id, new.member_id) then
      raise exception 'Only accepted group members can write group diary entries.';
    end if;
  else
    new.group_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_tennis_diary_group_visibility on public.tennis_diary_entries;
create trigger validate_tennis_diary_group_visibility
before insert or update of visibility, group_id, member_id on public.tennis_diary_entries
for each row execute function public.validate_tennis_diary_group_visibility();

create or replace function public.touch_tennis_diary_group_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_tennis_diary_group_updated_at on public.tennis_diary_groups;
create trigger touch_tennis_diary_group_updated_at
before update on public.tennis_diary_groups
for each row execute function public.touch_tennis_diary_group_updated_at();

drop trigger if exists touch_tennis_diary_group_member_updated_at on public.tennis_diary_group_members;
create trigger touch_tennis_diary_group_member_updated_at
before update on public.tennis_diary_group_members
for each row execute function public.touch_tennis_diary_group_updated_at();

alter table public.ot_notifications
add column if not exists tennis_diary_group_id uuid references public.tennis_diary_groups(id) on delete cascade;

create or replace function public.notify_tennis_diary_group_invited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_name text;
  inviter_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select diary_group.name
  into group_name
  from public.tennis_diary_groups diary_group
  where diary_group.id = new.group_id;

  select coalesce(member.display_name, member.username, '회원')
  into inviter_name
  from public.otmember member
  where member.id = new.invited_by_member_id;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    tennis_diary_group_id,
    type,
    title,
    message
  )
  values (
    new.member_id,
    new.invited_by_member_id,
    new.group_id,
    'tennis_diary_group_invited',
    '그룹 다이어리 초대가 도착했습니다.',
    coalesce(inviter_name, '회원') || '님이 "' || coalesce(group_name, '그룹 다이어리') || '"에 초대했습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_diary_group_invited on public.tennis_diary_group_members;
create trigger notify_tennis_diary_group_invited
after insert on public.tennis_diary_group_members
for each row execute function public.notify_tennis_diary_group_invited();

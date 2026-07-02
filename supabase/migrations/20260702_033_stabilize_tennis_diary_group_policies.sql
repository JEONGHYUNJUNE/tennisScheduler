-- 그룹다이어리 RLS 정책을 재귀 없이 동작하도록 안정화합니다.

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
    join public.otmember actor on actor.id = public.current_otmember_id()
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

create or replace function public.can_manage_tennis_diary_entry(target_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_entries entry
    join public.otmember actor on actor.id = public.current_otmember_id()
    where entry.id = target_entry_id
      and coalesce(actor.is_active, true) = true
      and (entry.member_id = actor.id or actor.role = 'admin')
  );
$$;

create or replace function public.can_manage_tennis_diary_comment(target_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_diary_comments comment
    join public.otmember actor on actor.id = public.current_otmember_id()
    where comment.id = target_comment_id
      and coalesce(actor.is_active, true) = true
      and (comment.member_id = actor.id or actor.role = 'admin')
  );
$$;

drop policy if exists "members can read own diary groups" on public.tennis_diary_groups;
create policy "members can read own diary groups"
on public.tennis_diary_groups for select to authenticated
using (public.can_read_tennis_diary_group(id));

drop policy if exists "active members can create diary groups" on public.tennis_diary_groups;
create policy "active members can create diary groups"
on public.tennis_diary_groups for insert to authenticated
with check (owner_member_id = public.current_otmember_id());

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

drop policy if exists "active members can read visible diary entries" on public.tennis_diary_entries;
create policy "active members can read visible diary entries"
on public.tennis_diary_entries for select to authenticated
using (public.can_read_tennis_diary_entry(id));

drop policy if exists "active members can create own diary entries" on public.tennis_diary_entries;
create policy "active members can create own diary entries"
on public.tennis_diary_entries for insert to authenticated
with check (
  member_id = public.current_otmember_id()
  and (
    visibility <> 'group'
    or (
      group_id is not null
      and public.is_tennis_diary_group_member(group_id, member_id)
    )
  )
);

drop policy if exists "owners or admins can update diary entries" on public.tennis_diary_entries;
create policy "owners or admins can update diary entries"
on public.tennis_diary_entries for update to authenticated
using (public.can_manage_tennis_diary_entry(id))
with check (
  public.can_manage_tennis_diary_entry(id)
  and (
    visibility <> 'group'
    or (
      group_id is not null
      and public.is_tennis_diary_group_member(group_id, member_id)
    )
  )
);

drop policy if exists "members can create diary comments" on public.tennis_diary_comments;
create policy "members can create diary comments"
on public.tennis_diary_comments for insert to authenticated
with check (
  member_id = public.current_otmember_id()
  and public.can_read_tennis_diary_entry(entry_id)
);

drop policy if exists "members can create own diary likes" on public.tennis_diary_likes;
create policy "members can create own diary likes"
on public.tennis_diary_likes for insert to authenticated
with check (
  member_id = public.current_otmember_id()
  and public.can_read_tennis_diary_entry(entry_id)
);

drop policy if exists "members can delete own diary likes" on public.tennis_diary_likes;
create policy "members can delete own diary likes"
on public.tennis_diary_likes for delete to authenticated
using (member_id = public.current_otmember_id());

drop policy if exists "members can create own diary comment likes" on public.tennis_diary_comment_likes;
create policy "members can create own diary comment likes"
on public.tennis_diary_comment_likes for insert to authenticated
with check (
  member_id = public.current_otmember_id()
  and exists (
    select 1
    from public.tennis_diary_comments comment
    where comment.id = tennis_diary_comment_likes.comment_id
      and public.can_read_tennis_diary_entry(comment.entry_id)
  )
);

drop policy if exists "members can delete own diary comment likes" on public.tennis_diary_comment_likes;
create policy "members can delete own diary comment likes"
on public.tennis_diary_comment_likes for delete to authenticated
using (member_id = public.current_otmember_id());

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

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and old.invited_by_member_id is not distinct from new.invited_by_member_id then
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
after insert or update of status, invited_by_member_id on public.tennis_diary_group_members
for each row execute function public.notify_tennis_diary_group_invited();

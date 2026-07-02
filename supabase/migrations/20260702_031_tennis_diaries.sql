-- 테니스 다이어리: 날짜별 기록, 공개 범위, 사진, 댓글/대댓글, 좋아요를 추가합니다.

create table if not exists public.tennis_diary_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.otmember(id) on delete cascade,
  diary_date date not null,
  mood text not null check (mood in ('happy', 'excited', 'calm', 'hard', 'tired', 'proud')),
  activity_type text not null check (activity_type in ('lesson', 'meetup', 'etc')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  title text,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  image_path text,
  image_name text,
  image_mime text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tennis_diary_entries_date_created_idx
on public.tennis_diary_entries(diary_date desc, created_at desc);

create index if not exists tennis_diary_entries_member_idx
on public.tennis_diary_entries(member_id, diary_date desc);

create table if not exists public.tennis_diary_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.tennis_diary_entries(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  parent_comment_id uuid references public.tennis_diary_comments(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tennis_diary_comments_entry_created_idx
on public.tennis_diary_comments(entry_id, created_at asc);

create index if not exists tennis_diary_comments_parent_created_idx
on public.tennis_diary_comments(parent_comment_id, created_at asc);

create table if not exists public.tennis_diary_likes (
  entry_id uuid not null references public.tennis_diary_entries(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, member_id)
);

create table if not exists public.tennis_diary_comment_likes (
  comment_id uuid not null references public.tennis_diary_comments(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

alter table public.tennis_diary_entries enable row level security;
alter table public.tennis_diary_comments enable row level security;
alter table public.tennis_diary_likes enable row level security;
alter table public.tennis_diary_comment_likes enable row level security;

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
    join public.otmember actor on public.member_matches_auth(actor.id)
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
    join public.otmember actor on public.member_matches_auth(actor.id)
    where comment.id = target_comment_id
      and coalesce(actor.is_active, true) = true
      and (comment.member_id = actor.id or actor.role = 'admin')
  );
$$;

drop policy if exists "active members can read visible diary entries" on public.tennis_diary_entries;
create policy "active members can read visible diary entries"
on public.tennis_diary_entries for select to authenticated
using (
  public.is_active_member(auth.uid())
  and (
    visibility = 'public'
    or public.member_matches_auth(member_id)
    or public.is_active_admin(auth.uid())
  )
);

drop policy if exists "active members can create own diary entries" on public.tennis_diary_entries;
create policy "active members can create own diary entries"
on public.tennis_diary_entries for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update diary entries" on public.tennis_diary_entries;
create policy "owners or admins can update diary entries"
on public.tennis_diary_entries for update to authenticated
using (public.can_manage_tennis_diary_entry(id))
with check (public.can_manage_tennis_diary_entry(id));

drop policy if exists "owners or admins can delete diary entries" on public.tennis_diary_entries;
create policy "owners or admins can delete diary entries"
on public.tennis_diary_entries for delete to authenticated
using (public.can_manage_tennis_diary_entry(id));

drop policy if exists "members can read visible diary comments" on public.tennis_diary_comments;
create policy "members can read visible diary comments"
on public.tennis_diary_comments for select to authenticated
using (public.can_read_tennis_diary_entry(entry_id));

drop policy if exists "members can create diary comments" on public.tennis_diary_comments;
create policy "members can create diary comments"
on public.tennis_diary_comments for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.can_read_tennis_diary_entry(entry_id)
);

drop policy if exists "owners or admins can update diary comments" on public.tennis_diary_comments;
create policy "owners or admins can update diary comments"
on public.tennis_diary_comments for update to authenticated
using (public.can_manage_tennis_diary_comment(id))
with check (public.can_manage_tennis_diary_comment(id));

drop policy if exists "owners or admins can delete diary comments" on public.tennis_diary_comments;
create policy "owners or admins can delete diary comments"
on public.tennis_diary_comments for delete to authenticated
using (public.can_manage_tennis_diary_comment(id));

drop policy if exists "members can read diary likes" on public.tennis_diary_likes;
create policy "members can read diary likes"
on public.tennis_diary_likes for select to authenticated
using (public.can_read_tennis_diary_entry(entry_id));

drop policy if exists "members can create own diary likes" on public.tennis_diary_likes;
create policy "members can create own diary likes"
on public.tennis_diary_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.can_read_tennis_diary_entry(entry_id)
);

drop policy if exists "members can delete own diary likes" on public.tennis_diary_likes;
create policy "members can delete own diary likes"
on public.tennis_diary_likes for delete to authenticated
using (public.member_matches_auth(member_id));

drop policy if exists "members can read diary comment likes" on public.tennis_diary_comment_likes;
create policy "members can read diary comment likes"
on public.tennis_diary_comment_likes for select to authenticated
using (
  exists (
    select 1 from public.tennis_diary_comments comment
    where comment.id = tennis_diary_comment_likes.comment_id
      and public.can_read_tennis_diary_entry(comment.entry_id)
  )
);

drop policy if exists "members can create own diary comment likes" on public.tennis_diary_comment_likes;
create policy "members can create own diary comment likes"
on public.tennis_diary_comment_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and exists (
    select 1 from public.tennis_diary_comments comment
    where comment.id = tennis_diary_comment_likes.comment_id
      and public.can_read_tennis_diary_entry(comment.entry_id)
  )
);

drop policy if exists "members can delete own diary comment likes" on public.tennis_diary_comment_likes;
create policy "members can delete own diary comment likes"
on public.tennis_diary_comment_likes for delete to authenticated
using (public.member_matches_auth(member_id));

create or replace function public.touch_tennis_diary_updated_at()
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

drop trigger if exists touch_tennis_diary_entry_updated_at on public.tennis_diary_entries;
create trigger touch_tennis_diary_entry_updated_at
before update on public.tennis_diary_entries
for each row execute function public.touch_tennis_diary_updated_at();

drop trigger if exists touch_tennis_diary_comment_updated_at on public.tennis_diary_comments;
create trigger touch_tennis_diary_comment_updated_at
before update on public.tennis_diary_comments
for each row execute function public.touch_tennis_diary_updated_at();

create or replace function public.validate_tennis_diary_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_entry_id uuid;
  grandparent_comment_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent.entry_id, parent.parent_comment_id
  into parent_entry_id, grandparent_comment_id
  from public.tennis_diary_comments parent
  where parent.id = new.parent_comment_id;

  if parent_entry_id is null then
    raise exception 'Parent comment does not exist.';
  end if;

  if parent_entry_id <> new.entry_id then
    raise exception 'Reply must belong to the same diary entry.';
  end if;

  if grandparent_comment_id is not null then
    raise exception 'Nested replies deeper than one level are not supported.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_tennis_diary_comment_parent on public.tennis_diary_comments;
create trigger validate_tennis_diary_comment_parent
before insert or update of parent_comment_id, entry_id on public.tennis_diary_comments
for each row execute function public.validate_tennis_diary_comment_parent();

alter table public.ot_notifications
add column if not exists tennis_diary_entry_id uuid references public.tennis_diary_entries(id) on delete cascade;

alter table public.ot_notifications
add column if not exists tennis_diary_comment_id uuid references public.tennis_diary_comments(id) on delete cascade;

create index if not exists ot_notifications_tennis_diary_entry_idx
on public.ot_notifications(tennis_diary_entry_id);

create or replace function public.notify_tennis_diary_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_owner_id uuid;
  parent_comment_owner_id uuid;
  actor_name text;
  comment_preview text;
  normalized_message text;
begin
  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  normalized_message := trim(regexp_replace(new.message, '\s+', ' ', 'g'));
  comment_preview := left(normalized_message, 10);

  if char_length(normalized_message) > 10 then
    comment_preview := comment_preview || '…';
  end if;

  if new.parent_comment_id is not null then
    select parent.member_id
    into parent_comment_owner_id
    from public.tennis_diary_comments parent
    where parent.id = new.parent_comment_id;

    if parent_comment_owner_id is null or parent_comment_owner_id = new.member_id then
      return new;
    end if;

    insert into public.ot_notifications (
      recipient_member_id, actor_member_id, tennis_diary_entry_id, tennis_diary_comment_id,
      type, title, message
    )
    values (
      parent_comment_owner_id, new.member_id, new.entry_id, new.id,
      'tennis_diary_comment_reply_created',
      '다이어리 댓글에 답글이 달렸습니다.',
      actor_name || '님 답글: ' || comment_preview
    );

    return new;
  end if;

  select entry.member_id
  into entry_owner_id
  from public.tennis_diary_entries entry
  where entry.id = new.entry_id;

  if entry_owner_id is null or entry_owner_id = new.member_id then
    return new;
  end if;

  insert into public.ot_notifications (
    recipient_member_id, actor_member_id, tennis_diary_entry_id, tennis_diary_comment_id,
    type, title, message
  )
  values (
    entry_owner_id, new.member_id, new.entry_id, new.id,
    'tennis_diary_comment_created',
    '다이어리에 댓글이 달렸습니다.',
    actor_name || '님 댓글: ' || comment_preview
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_diary_comment_inserted on public.tennis_diary_comments;
create trigger notify_tennis_diary_comment_inserted
after insert on public.tennis_diary_comments
for each row execute function public.notify_tennis_diary_comment_inserted();

create or replace function public.notify_tennis_diary_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_owner_id uuid;
  actor_name text;
begin
  select entry.member_id
  into entry_owner_id
  from public.tennis_diary_entries entry
  where entry.id = new.entry_id;

  if entry_owner_id is null or entry_owner_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  insert into public.ot_notifications (
    recipient_member_id, actor_member_id, tennis_diary_entry_id,
    type, title, message
  )
  values (
    entry_owner_id, new.member_id, new.entry_id,
    'tennis_diary_liked',
    '다이어리에 좋아요가 달렸습니다.',
    actor_name || '님이 내 다이어리에 좋아요를 눌렀습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_diary_liked on public.tennis_diary_likes;
create trigger notify_tennis_diary_liked
after insert on public.tennis_diary_likes
for each row execute function public.notify_tennis_diary_liked();

create or replace function public.notify_tennis_diary_comment_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_owner_id uuid;
  target_entry_id uuid;
  actor_name text;
begin
  select comment.member_id, comment.entry_id
  into comment_owner_id, target_entry_id
  from public.tennis_diary_comments comment
  where comment.id = new.comment_id;

  if comment_owner_id is null or comment_owner_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  insert into public.ot_notifications (
    recipient_member_id, actor_member_id, tennis_diary_entry_id, tennis_diary_comment_id,
    type, title, message
  )
  values (
    comment_owner_id, new.member_id, target_entry_id, new.comment_id,
    'tennis_diary_comment_liked',
    '다이어리 댓글에 하트가 달렸습니다.',
    actor_name || '님이 내 댓글에 하트를 눌렀습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_diary_comment_liked on public.tennis_diary_comment_likes;
create trigger notify_tennis_diary_comment_liked
after insert on public.tennis_diary_comment_likes
for each row execute function public.notify_tennis_diary_comment_liked();

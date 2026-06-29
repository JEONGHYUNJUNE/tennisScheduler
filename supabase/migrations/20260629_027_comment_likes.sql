create table if not exists public.ot_free_opinion_comment_likes (
  comment_id uuid not null references public.ot_free_opinion_comments(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

create table if not exists public.tennis_event_comment_likes (
  comment_id uuid not null references public.tennis_event_comments(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

alter table public.ot_free_opinion_comment_likes enable row level security;
alter table public.tennis_event_comment_likes enable row level security;

drop policy if exists "active members can read free opinion comment likes" on public.ot_free_opinion_comment_likes;
create policy "active members can read free opinion comment likes"
on public.ot_free_opinion_comment_likes for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own free opinion comment likes" on public.ot_free_opinion_comment_likes;
create policy "active members can create own free opinion comment likes"
on public.ot_free_opinion_comment_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can delete own free opinion comment likes" on public.ot_free_opinion_comment_likes;
create policy "active members can delete own free opinion comment likes"
on public.ot_free_opinion_comment_likes for delete to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can read event comment likes" on public.tennis_event_comment_likes;
create policy "active members can read event comment likes"
on public.tennis_event_comment_likes for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own event comment likes" on public.tennis_event_comment_likes;
create policy "active members can create own event comment likes"
on public.tennis_event_comment_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can delete own event comment likes" on public.tennis_event_comment_likes;
create policy "active members can delete own event comment likes"
on public.tennis_event_comment_likes for delete to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

alter table public.ot_notifications
add column if not exists tennis_event_comment_id uuid references public.tennis_event_comments(id) on delete cascade;

create index if not exists ot_notifications_tennis_event_comment_idx
on public.ot_notifications(tennis_event_comment_id);

create or replace function public.notify_free_opinion_comment_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_owner_id uuid;
  opinion_id uuid;
  actor_name text;
begin
  select comment.member_id, comment.opinion_id
  into comment_owner_id, opinion_id
  from public.ot_free_opinion_comments comment
  where comment.id = new.comment_id;

  if comment_owner_id is null or comment_owner_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    free_opinion_id,
    free_opinion_comment_id,
    type,
    title,
    message
  )
  values (
    comment_owner_id,
    new.member_id,
    opinion_id,
    new.comment_id,
    'free_opinion_comment_liked',
    '댓글에 하트가 달렸습니다.',
    actor_name || '님이 내 댓글에 하트를 눌렀습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_free_opinion_comment_liked on public.ot_free_opinion_comment_likes;
create trigger notify_free_opinion_comment_liked
after insert on public.ot_free_opinion_comment_likes
for each row execute function public.notify_free_opinion_comment_liked();

create or replace function public.notify_tennis_event_comment_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_owner_id uuid;
  target_event_id uuid;
  actor_name text;
begin
  select comment.member_id, comment.event_id
  into comment_owner_id, target_event_id
  from public.tennis_event_comments comment
  where comment.id = new.comment_id;

  if comment_owner_id is null or comment_owner_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    event_id,
    tennis_event_comment_id,
    type,
    title,
    message
  )
  values (
    comment_owner_id,
    new.member_id,
    target_event_id,
    new.comment_id,
    'tennis_event_comment_liked',
    '댓글에 하트가 달렸습니다.',
    actor_name || '님이 내 댓글에 하트를 눌렀습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_event_comment_liked on public.tennis_event_comment_likes;
create trigger notify_tennis_event_comment_liked
after insert on public.tennis_event_comment_likes
for each row execute function public.notify_tennis_event_comment_liked();

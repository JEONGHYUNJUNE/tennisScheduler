-- 소통 글 댓글 기능을 추가합니다.
-- 소통 글이 삭제되면 연결된 댓글도 함께 삭제됩니다.

create table if not exists public.ot_free_opinion_comments (
  id uuid primary key default gen_random_uuid(),
  opinion_id uuid not null references public.ot_free_opinions(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ot_free_opinion_comments_opinion_created_idx
on public.ot_free_opinion_comments(opinion_id, created_at asc);

create index if not exists ot_free_opinion_comments_member_idx
on public.ot_free_opinion_comments(member_id);

alter table public.ot_free_opinion_comments enable row level security;

create or replace function public.touch_free_opinion_comment_updated_at()
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

drop trigger if exists touch_free_opinion_comment_updated_at on public.ot_free_opinion_comments;
create trigger touch_free_opinion_comment_updated_at
before update on public.ot_free_opinion_comments
for each row execute function public.touch_free_opinion_comment_updated_at();

create or replace function public.can_manage_free_opinion_comment(target_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ot_free_opinion_comments comment
    join public.otmember actor on public.member_matches_auth(actor.id)
    where comment.id = target_comment_id
      and coalesce(actor.is_active, true) = true
      and (
        actor.role = 'admin'
        or comment.member_id = actor.id
      )
  );
$$;

drop policy if exists "active members can read free opinion comments" on public.ot_free_opinion_comments;
create policy "active members can read free opinion comments"
on public.ot_free_opinion_comments for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own free opinion comments" on public.ot_free_opinion_comments;
create policy "active members can create own free opinion comments"
on public.ot_free_opinion_comments for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update free opinion comments" on public.ot_free_opinion_comments;
create policy "owners or admins can update free opinion comments"
on public.ot_free_opinion_comments for update to authenticated
using (public.can_manage_free_opinion_comment(id))
with check (public.can_manage_free_opinion_comment(id));

drop policy if exists "owners or admins can delete free opinion comments" on public.ot_free_opinion_comments;
create policy "owners or admins can delete free opinion comments"
on public.ot_free_opinion_comments for delete to authenticated
using (public.can_manage_free_opinion_comment(id));

create or replace function public.notify_free_opinion_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opinion_owner_id uuid;
  actor_name text;
begin
  select opinion.member_id
  into opinion_owner_id
  from public.ot_free_opinions opinion
  where opinion.id = new.opinion_id;

  if opinion_owner_id is null or opinion_owner_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  insert into public.ot_notifications (recipient_member_id, actor_member_id, type, title, message)
  values (
    opinion_owner_id,
    new.member_id,
    'free_opinion_comment_created',
    '소통 글에 댓글이 달렸습니다.',
    actor_name || '님이 내 소통 글에 댓글을 남겼습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_free_opinion_comment_inserted on public.ot_free_opinion_comments;
create trigger notify_free_opinion_comment_inserted
after insert on public.ot_free_opinion_comments
for each row execute function public.notify_free_opinion_comment_inserted();

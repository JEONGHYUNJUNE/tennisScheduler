-- 일정 상세 하단 댓글 기능을 추가합니다.
-- 일정이 삭제되면 연결된 댓글도 함께 삭제됩니다.

create table if not exists public.tennis_event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tennis_events(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tennis_event_comments_event_created_idx
on public.tennis_event_comments(event_id, created_at asc);

create index if not exists tennis_event_comments_member_idx
on public.tennis_event_comments(member_id);

alter table public.tennis_event_comments enable row level security;

create or replace function public.touch_tennis_event_comment_updated_at()
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

drop trigger if exists touch_tennis_event_comment_updated_at on public.tennis_event_comments;
create trigger touch_tennis_event_comment_updated_at
before update on public.tennis_event_comments
for each row execute function public.touch_tennis_event_comment_updated_at();

create or replace function public.can_manage_tennis_event_comment(target_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_event_comments comment
    join public.otmember actor on public.member_matches_auth(actor.id)
    where comment.id = target_comment_id
      and coalesce(actor.is_active, true) = true
      and (
        actor.role = 'admin'
        or comment.member_id = actor.id
      )
  );
$$;

drop policy if exists "active members can read tennis event comments" on public.tennis_event_comments;
create policy "active members can read tennis event comments"
on public.tennis_event_comments for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own tennis event comments" on public.tennis_event_comments;
create policy "active members can create own tennis event comments"
on public.tennis_event_comments for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update tennis event comments" on public.tennis_event_comments;
create policy "owners or admins can update tennis event comments"
on public.tennis_event_comments for update to authenticated
using (public.can_manage_tennis_event_comment(id))
with check (public.can_manage_tennis_event_comment(id));

drop policy if exists "owners or admins can delete tennis event comments" on public.tennis_event_comments;
create policy "owners or admins can delete tennis event comments"
on public.tennis_event_comments for delete to authenticated
using (public.can_manage_tennis_event_comment(id));

-- 테니스 TV 추천 영상 하단 댓글 기능을 추가합니다.

create table if not exists public.tennis_video_comments (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null references public.tennis_video_settings(setting_key) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tennis_video_comments_setting_created_idx
on public.tennis_video_comments(setting_key, created_at asc);

create index if not exists tennis_video_comments_member_idx
on public.tennis_video_comments(member_id);

alter table public.tennis_video_comments enable row level security;

create or replace function public.touch_tennis_video_comment_updated_at()
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

drop trigger if exists touch_tennis_video_comment_updated_at on public.tennis_video_comments;
create trigger touch_tennis_video_comment_updated_at
before update on public.tennis_video_comments
for each row execute function public.touch_tennis_video_comment_updated_at();

create or replace function public.can_manage_tennis_video_comment(target_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tennis_video_comments comment
    join public.otmember actor on public.member_matches_auth(actor.id)
    where comment.id = target_comment_id
      and coalesce(actor.is_active, true) = true
      and (
        actor.role = 'admin'
        or comment.member_id = actor.id
      )
  );
$$;

drop policy if exists "active members can read tennis video comments" on public.tennis_video_comments;
create policy "active members can read tennis video comments"
on public.tennis_video_comments for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own tennis video comments" on public.tennis_video_comments;
create policy "active members can create own tennis video comments"
on public.tennis_video_comments for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "owners or admins can update tennis video comments" on public.tennis_video_comments;
create policy "owners or admins can update tennis video comments"
on public.tennis_video_comments for update to authenticated
using (public.can_manage_tennis_video_comment(id))
with check (public.can_manage_tennis_video_comment(id));

drop policy if exists "owners or admins can delete tennis video comments" on public.tennis_video_comments;
create policy "owners or admins can delete tennis video comments"
on public.tennis_video_comments for delete to authenticated
using (public.can_manage_tennis_video_comment(id));

create or replace function public.clear_tennis_video_comments_when_url_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.youtube_url is distinct from new.youtube_url then
    delete from public.tennis_video_comments
    where setting_key = new.setting_key;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_tennis_video_comments_when_url_changes on public.tennis_video_settings;
create trigger clear_tennis_video_comments_when_url_changes
after update of youtube_url on public.tennis_video_settings
for each row execute function public.clear_tennis_video_comments_when_url_changes();

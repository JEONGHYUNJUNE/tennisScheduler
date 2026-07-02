-- 소통/다이어리 글과 댓글에 @언급 알림을 추가합니다.

create table if not exists public.ot_mentions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in (
    'free_opinion',
    'free_opinion_comment',
    'tennis_diary_entry',
    'tennis_diary_comment'
  )),
  source_id uuid not null,
  actor_member_id uuid not null references public.otmember(id) on delete cascade,
  mentioned_member_id uuid not null references public.otmember(id) on delete cascade,
  mentioned_display_name text not null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, mentioned_member_id)
);

create index if not exists ot_mentions_mentioned_created_idx
on public.ot_mentions(mentioned_member_id, created_at desc);

create index if not exists ot_mentions_source_idx
on public.ot_mentions(source_type, source_id);

alter table public.ot_mentions enable row level security;

drop policy if exists "members can read related mentions" on public.ot_mentions;
create policy "members can read related mentions"
on public.ot_mentions for select to authenticated
using (
  public.member_matches_auth(actor_member_id)
  or public.member_matches_auth(mentioned_member_id)
  or public.is_active_admin(auth.uid())
);

drop policy if exists "active members can create mentions" on public.ot_mentions;
create policy "active members can create mentions"
on public.ot_mentions for insert to authenticated
with check (
  public.member_matches_auth(actor_member_id)
  and actor_member_id <> mentioned_member_id
  and public.is_active_member(auth.uid())
);

drop policy if exists "actors can remove own mentions" on public.ot_mentions;
create policy "actors can remove own mentions"
on public.ot_mentions for delete to authenticated
using (
  public.member_matches_auth(actor_member_id)
  or public.is_active_admin(auth.uid())
);

create or replace function public.notify_mention_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  target_free_opinion_id uuid;
  target_free_opinion_comment_id uuid;
  target_diary_entry_id uuid;
  target_diary_comment_id uuid;
  source_message text;
  preview text;
  notification_title text;
  notification_type text;
begin
  if new.actor_member_id = new.mentioned_member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.actor_member_id;

  if new.source_type = 'free_opinion' then
    target_free_opinion_id := new.source_id;
    notification_type := 'free_opinion_mention';
    notification_title := '소통 글에서 언급되었습니다.';

    select opinion.message
    into source_message
    from public.ot_free_opinions opinion
    where opinion.id = new.source_id;
  elsif new.source_type = 'free_opinion_comment' then
    target_free_opinion_comment_id := new.source_id;
    notification_type := 'free_opinion_comment_mention';
    notification_title := '소통 댓글에서 언급되었습니다.';

    select comment.opinion_id, comment.message
    into target_free_opinion_id, source_message
    from public.ot_free_opinion_comments comment
    where comment.id = new.source_id;
  elsif new.source_type = 'tennis_diary_entry' then
    target_diary_entry_id := new.source_id;
    notification_type := 'tennis_diary_entry_mention';
    notification_title := '다이어리에서 언급되었습니다.';

    select trim(coalesce(entry.title, '') || ' ' || entry.body)
    into source_message
    from public.tennis_diary_entries entry
    where entry.id = new.source_id;
  elsif new.source_type = 'tennis_diary_comment' then
    target_diary_comment_id := new.source_id;
    notification_type := 'tennis_diary_comment_mention';
    notification_title := '다이어리 댓글에서 언급되었습니다.';

    select comment.entry_id, comment.message
    into target_diary_entry_id, source_message
    from public.tennis_diary_comments comment
    where comment.id = new.source_id;
  end if;

  preview := trim(regexp_replace(coalesce(source_message, ''), '\s+', ' ', 'g'));
  if char_length(preview) > 10 then
    preview := left(preview, 10) || '…';
  end if;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    free_opinion_id,
    free_opinion_comment_id,
    tennis_diary_entry_id,
    tennis_diary_comment_id,
    type,
    title,
    message
  )
  values (
    new.mentioned_member_id,
    new.actor_member_id,
    target_free_opinion_id,
    target_free_opinion_comment_id,
    target_diary_entry_id,
    target_diary_comment_id,
    notification_type,
    notification_title,
    coalesce(actor_name, '회원') || '님이 회원님을 언급했습니다' || case when preview <> '' then ': ' || preview else '.' end
  );

  return new;
end;
$$;

drop trigger if exists notify_mention_inserted on public.ot_mentions;
create trigger notify_mention_inserted
after insert on public.ot_mentions
for each row execute function public.notify_mention_inserted();

-- 일정 댓글에 한 단계 답글과 @멘션 알림을 추가합니다.

alter table public.tennis_event_comments
add column if not exists parent_comment_id uuid references public.tennis_event_comments(id) on delete cascade;

create index if not exists tennis_event_comments_parent_created_idx
on public.tennis_event_comments(parent_comment_id, created_at asc);

create or replace function public.validate_tennis_event_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_event_id uuid;
  grandparent_comment_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent.event_id, parent.parent_comment_id
  into parent_event_id, grandparent_comment_id
  from public.tennis_event_comments parent
  where parent.id = new.parent_comment_id;

  if parent_event_id is null then
    raise exception 'Parent comment does not exist.';
  end if;

  if parent_event_id <> new.event_id then
    raise exception 'Reply must belong to the same event.';
  end if;

  if grandparent_comment_id is not null then
    raise exception 'Nested replies deeper than one level are not supported.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_tennis_event_comment_parent on public.tennis_event_comments;
create trigger validate_tennis_event_comment_parent
before insert or update of parent_comment_id, event_id on public.tennis_event_comments
for each row execute function public.validate_tennis_event_comment_parent();

create or replace function public.notify_tennis_event_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_owner_id uuid;
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
    from public.tennis_event_comments parent
    where parent.id = new.parent_comment_id;

    if parent_comment_owner_id is null or parent_comment_owner_id = new.member_id then
      return new;
    end if;

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
      parent_comment_owner_id,
      new.member_id,
      new.event_id,
      new.id,
      'tennis_event_comment_reply_created',
      '일정 댓글에 답글이 달렸습니다.',
      actor_name || '님 답글: ' || comment_preview
    );

    return new;
  end if;

  select event.created_by
  into event_owner_id
  from public.tennis_events event
  where event.id = new.event_id;

  if event_owner_id is null or event_owner_id = new.member_id then
    return new;
  end if;

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
    event_owner_id,
    new.member_id,
    new.event_id,
    new.id,
    'tennis_event_comment_created',
    '일정에 댓글이 달렸습니다.',
    actor_name || '님 댓글: ' || comment_preview
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_event_comment_inserted on public.tennis_event_comments;
create trigger notify_tennis_event_comment_inserted
after insert on public.tennis_event_comments
for each row execute function public.notify_tennis_event_comment_inserted();

create or replace function public.notify_mention_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  target_event_id uuid;
  target_event_comment_id uuid;
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
  elsif new.source_type = 'tennis_event_comment' then
    target_event_comment_id := new.source_id;
    notification_type := 'tennis_event_comment_mention';
    notification_title := '일정 댓글에서 언급되었습니다.';

    select comment.event_id, comment.message
    into target_event_id, source_message
    from public.tennis_event_comments comment
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
    event_id,
    tennis_event_comment_id,
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
    target_event_id,
    target_event_comment_id,
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

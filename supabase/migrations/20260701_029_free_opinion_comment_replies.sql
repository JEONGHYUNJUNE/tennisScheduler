-- 소통 댓글에 한 단계 답글을 추가합니다.
-- 답글 알림은 원글 작성자가 아니라 부모 댓글 작성자에게만 보냅니다.

alter table public.ot_free_opinion_comments
add column if not exists parent_comment_id uuid references public.ot_free_opinion_comments(id) on delete cascade;

create index if not exists ot_free_opinion_comments_parent_created_idx
on public.ot_free_opinion_comments(parent_comment_id, created_at asc);

create or replace function public.validate_free_opinion_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_opinion_id uuid;
  grandparent_comment_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent.opinion_id, parent.parent_comment_id
  into parent_opinion_id, grandparent_comment_id
  from public.ot_free_opinion_comments parent
  where parent.id = new.parent_comment_id;

  if parent_opinion_id is null then
    raise exception 'Parent comment does not exist.';
  end if;

  if parent_opinion_id <> new.opinion_id then
    raise exception 'Reply must belong to the same opinion.';
  end if;

  if grandparent_comment_id is not null then
    raise exception 'Nested replies deeper than one level are not supported.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_free_opinion_comment_parent on public.ot_free_opinion_comments;
create trigger validate_free_opinion_comment_parent
before insert or update of parent_comment_id, opinion_id on public.ot_free_opinion_comments
for each row execute function public.validate_free_opinion_comment_parent();

create or replace function public.notify_free_opinion_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opinion_owner_id uuid;
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
    from public.ot_free_opinion_comments parent
    where parent.id = new.parent_comment_id;

    if parent_comment_owner_id is null or parent_comment_owner_id = new.member_id then
      return new;
    end if;

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
      parent_comment_owner_id,
      new.member_id,
      new.opinion_id,
      new.id,
      'free_opinion_comment_reply_created',
      '댓글에 답글이 달렸습니다.',
      actor_name || '님 답글: ' || comment_preview
    );

    return new;
  end if;

  select opinion.member_id
  into opinion_owner_id
  from public.ot_free_opinions opinion
  where opinion.id = new.opinion_id;

  if opinion_owner_id is null or opinion_owner_id = new.member_id then
    return new;
  end if;

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
    opinion_owner_id,
    new.member_id,
    new.opinion_id,
    new.id,
    'free_opinion_comment_created',
    '소통 글에 댓글이 달렸습니다.',
    actor_name || '님 댓글: ' || comment_preview
  );

  return new;
end;
$$;

drop trigger if exists notify_free_opinion_comment_inserted on public.ot_free_opinion_comments;
create trigger notify_free_opinion_comment_inserted
after insert on public.ot_free_opinion_comments
for each row execute function public.notify_free_opinion_comment_inserted();

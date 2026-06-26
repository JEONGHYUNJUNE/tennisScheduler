-- 소통 글/댓글 알림이 대상 글과 댓글로 딥링크되도록 알림 메타데이터를 보강합니다.
-- 댓글 알림 메시지에는 댓글 본문 앞 10자만 미리보기로 포함하고, 더 길면 말줄임표를 붙입니다.

alter table public.ot_notifications
add column if not exists free_opinion_id uuid references public.ot_free_opinions(id) on delete cascade;

alter table public.ot_notifications
add column if not exists free_opinion_comment_id uuid references public.ot_free_opinion_comments(id) on delete cascade;

create index if not exists ot_notifications_free_opinion_idx
on public.ot_notifications(free_opinion_id);

create or replace function public.notify_free_opinion_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  select coalesce(display_name, username, '회원')
  into actor_name
  from public.otmember
  where id = new.member_id;

  insert into public.ot_notifications (recipient_member_id, actor_member_id, free_opinion_id, type, title, message)
  select member.id,
         new.member_id,
         new.id,
         'free_opinion_created',
         '새 소통 글이 있습니다.',
         actor_name || '님이 새 글을 남겼습니다.'
  from public.otmember member
  where coalesce(member.is_active, true) = true
    and member.id <> new.member_id;

  return new;
end;
$$;

drop trigger if exists notify_free_opinion_inserted on public.ot_free_opinions;
create trigger notify_free_opinion_inserted
after insert on public.ot_free_opinions
for each row execute function public.notify_free_opinion_inserted();

create or replace function public.notify_free_opinion_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opinion_owner_id uuid;
  actor_name text;
  comment_preview text;
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

  comment_preview := left(trim(regexp_replace(new.message, '\s+', ' ', 'g')), 10);

  if char_length(trim(regexp_replace(new.message, '\s+', ' ', 'g'))) > 10 then
    comment_preview := comment_preview || '…';
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

-- 일정 댓글이 달리면 해당 일정 작성자에게만 알림/푸시 대상 레코드를 생성합니다.
-- 댓글 작성자가 일정 작성자 본인이면 알림을 만들지 않습니다.

create or replace function public.notify_tennis_event_comment_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_owner_id uuid;
  actor_name text;
begin
  select event.created_by
  into event_owner_id
  from public.tennis_events event
  where event.id = new.event_id;

  if event_owner_id is null or event_owner_id = new.member_id then
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
    type,
    title,
    message
  )
  values (
    event_owner_id,
    new.member_id,
    new.event_id,
    'tennis_event_comment_created',
    '일정에 댓글이 달렸습니다.',
    actor_name || '님이 내 일정에 댓글을 남겼습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_tennis_event_comment_inserted on public.tennis_event_comments;
create trigger notify_tennis_event_comment_inserted
after insert on public.tennis_event_comments
for each row execute function public.notify_tennis_event_comment_inserted();

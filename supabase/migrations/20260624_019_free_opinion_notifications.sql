-- 소통 새 글도 알림/푸시 대상이 되도록 ot_notifications에 기록합니다.

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

  insert into public.ot_notifications (recipient_member_id, actor_member_id, type, title, message)
  select member.id,
         new.member_id,
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

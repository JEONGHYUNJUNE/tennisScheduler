create or replace function public.notify_attendance_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  event_title text;
begin
  select title into event_title
  from public.tennis_events
  where id = old.event_id;

  if event_title is null then
    return old;
  end if;

  actor_name := coalesce(
    old.guest_name,
    (select coalesce(display_name, username) from public.otmember where id = old.member_id),
    '알 수 없는 사용자'
  );

  perform public.notify_admin_members(
    'attendance_cancelled',
    case when old.status = 'waiting' then '대기 취소가 있습니다.' else '참석 취소가 있습니다.' end,
    actor_name || '님이 ' || event_title || ' 일정의 ' || case when old.status = 'waiting' then '대기를 취소했습니다.' else '참석을 취소했습니다.' end,
    old.event_id,
    coalesce(old.member_id, old.created_by)
  );

  return old;
end;
$$;

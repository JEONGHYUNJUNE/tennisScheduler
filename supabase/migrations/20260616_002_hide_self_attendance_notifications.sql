-- 자기 자신이 신청/취소한 참석/대기 알림은 생성하지 않도록 관리자 알림 함수를 수정합니다.
-- 이미 생성된 자기 신청/취소 알림은 앱 화면에서도 숨깁니다.

create or replace function public.notify_admin_members(
  notification_type text,
  notification_title text,
  notification_message text,
  target_event_id uuid,
  actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ot_notifications (recipient_member_id, actor_member_id, event_id, type, title, message)
  select member.id, actor_id, target_event_id, notification_type, notification_title, notification_message
  from public.otmember member
  where member.role = 'admin'
    and coalesce(member.is_active, true) = true
    and (actor_id is null or member.id <> actor_id);
end;
$$;

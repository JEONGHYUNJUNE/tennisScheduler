-- 참고용 과거 핫픽스입니다. 지금은 migrations/20260616_001_apply_waiting_notifications.sql 실행을 권장합니다.
-- 기존 DB의 tennis_attendances에는 updated_at 컬럼이 없어서
-- 대기 자동 승격 트리거가 취소를 막는 문제를 고칩니다.

create or replace function public.promote_first_waiting_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'attending' then
    update public.tennis_attendances
    set status = 'attending'
    where id = (
      select a.id
      from public.tennis_attendances a
      where a.event_id = old.event_id
        and a.status = 'waiting'
      order by a.created_at asc
      limit 1
    );
  end if;

  return old;
end;
$$;

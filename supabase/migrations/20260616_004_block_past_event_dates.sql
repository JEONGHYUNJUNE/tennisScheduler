-- 관리자 화면 우회 또는 직접 API 호출로도 과거 일정을 등록/수정하지 못하게 막습니다.

create or replace function public.block_past_tennis_event_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_date < current_date then
    raise exception '오늘 이전 날짜로는 일정을 저장할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists block_past_tennis_event_date on public.tennis_events;
create trigger block_past_tennis_event_date
before insert or update on public.tennis_events
for each row execute function public.block_past_tennis_event_date();

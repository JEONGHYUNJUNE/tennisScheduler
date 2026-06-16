-- 참고용 과거 핫픽스입니다. 지금은 migrations/20260616_001_apply_waiting_notifications.sql 실행을 권장합니다.
-- 일정 정원을 늘렸을 때 빈 자리 수만큼 오래된 대기자부터 자동 참석 처리합니다.

create or replace function public.promote_waiting_attendances_for_event(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_count integer;
  attending_count integer;
  open_slots integer;
begin
  select max_participants into max_count
  from public.tennis_events
  where id = target_event_id;

  if max_count is null then
    return;
  end if;

  select count(*) into attending_count
  from public.tennis_attendances
  where event_id = target_event_id
    and status = 'attending';

  open_slots := greatest(max_count - attending_count, 0);

  if open_slots <= 0 then
    return;
  end if;

  update public.tennis_attendances
  set status = 'attending'
  where id in (
    select waiting.id
    from public.tennis_attendances waiting
    where waiting.event_id = target_event_id
      and waiting.status = 'waiting'
    order by waiting.created_at asc
    limit open_slots
  );
end;
$$;

create or replace function public.promote_first_waiting_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'attending' then
    perform public.promote_waiting_attendances_for_event(old.event_id);
  end if;

  return old;
end;
$$;

create or replace function public.notify_tennis_event_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.title is distinct from new.title
    or old.event_date is distinct from new.event_date
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.location is distinct from new.location
    or old.max_participants is distinct from new.max_participants
    or old.memo is distinct from new.memo then
    perform public.notify_event_attendees(
      'event_updated',
      '참석 일정이 수정되었습니다.',
      new.title || ' 일정 정보가 변경되었습니다.',
      new.id,
      new.created_by
    );
  end if;

  if new.max_participants is not null
    and (old.max_participants is null or new.max_participants > old.max_participants) then
    perform public.promote_waiting_attendances_for_event(new.id);
  end if;

  return new;
end;
$$;

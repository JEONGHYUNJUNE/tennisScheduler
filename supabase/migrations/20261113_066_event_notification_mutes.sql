begin;
create table public.ot_event_notification_mutes (
  member_id uuid not null references public.otmember(id) on delete cascade,
  event_id uuid not null references public.tennis_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, event_id)
);
alter table public.ot_event_notification_mutes enable row level security;
grant select, insert, delete on public.ot_event_notification_mutes to authenticated;
create policy "members read their own event mutes" on public.ot_event_notification_mutes
for select to authenticated using (public.member_matches_auth(member_id) and public.is_active_member(auth.uid()));
create policy "members mute events for themselves" on public.ot_event_notification_mutes
for insert to authenticated with check (public.member_matches_auth(member_id) and public.is_active_member(auth.uid()));
create policy "members unmute their own events" on public.ot_event_notification_mutes
for delete to authenticated using (public.member_matches_auth(member_id) and public.is_active_member(auth.uid()));

-- Suppress at insertion so neither the in-app inbox nor its push webhook receives it.
create function public.suppress_muted_event_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.event_id is not null and exists (
    select 1 from public.ot_event_notification_mutes
    where member_id = new.recipient_member_id and event_id = new.event_id
  ) then return null; end if;
  return new;
end;
$$;
revoke all on function public.suppress_muted_event_notification() from public, anon, authenticated;
create trigger suppress_muted_event_notification before insert on public.ot_notifications
for each row execute function public.suppress_muted_event_notification();
commit;

-- Supabase SQL Editor에서 전체 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.otmember (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  user_id text not null unique check (user_id = lower(user_id)),
  name text not null,
  tennis_start_date date not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.tennis_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time not null,
  end_time time,
  location text not null,
  max_players integer check (max_players is null or max_players > 0),
  memo text,
  created_by uuid not null references public.otmember(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or end_time > start_time)
);

create table if not exists public.tennis_attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.tennis_events(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  status text not null default 'attending' check (status in ('attending', 'waiting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create index if not exists tennis_events_event_date_idx on public.tennis_events(event_date);
create index if not exists tennis_attendances_event_id_idx on public.tennis_attendances(event_id);
create index if not exists tennis_attendances_member_id_idx on public.tennis_attendances(member_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tennis_events_updated_at on public.tennis_events;
create trigger set_tennis_events_updated_at before update on public.tennis_events
for each row execute function public.set_updated_at();

drop trigger if exists set_tennis_attendances_updated_at on public.tennis_attendances;
create trigger set_tennis_attendances_updated_at before update on public.tennis_attendances
for each row execute function public.set_updated_at();

-- 회원가입 시 Auth metadata를 이용해 프로필을 자동 생성합니다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.otmember (auth_user_id, user_id, name, tennis_start_date)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'user_id'),
    new.raw_user_meta_data ->> 'name',
    (new.raw_user_meta_data ->> 'tennis_start_date')::date
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.otmember
    where auth_user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_current_member(target_member_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.otmember
    where id = target_member_id and auth_user_id = auth.uid()
  );
$$;

-- UI 우회 시에도 5일 이내 취소를 DB에서 차단합니다.
create or replace function public.enforce_attendance_cancellation_deadline()
returns trigger language plpgsql set search_path = '' as $$
declare
  target_date date;
begin
  if public.is_admin() then
    return old;
  end if;

  select event_date into target_date from public.tennis_events where id = old.event_id;
  if target_date <= current_date + 5 then
    raise exception '5일내 취소는 모집장에게 팀즈 해주시기 바랍니다';
  end if;
  return old;
end;
$$;

drop trigger if exists enforce_attendance_cancellation_deadline on public.tennis_attendances;
create trigger enforce_attendance_cancellation_deadline before delete on public.tennis_attendances
for each row execute function public.enforce_attendance_cancellation_deadline();

create or replace function public.promote_first_waiting_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'attending' then
    update public.tennis_attendances
    set status = 'attending',
        updated_at = now()
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

drop trigger if exists promote_first_waiting_attendance on public.tennis_attendances;
create trigger promote_first_waiting_attendance after delete on public.tennis_attendances
for each row execute function public.promote_first_waiting_attendance();

alter table public.otmember enable row level security;
alter table public.tennis_events enable row level security;
alter table public.tennis_attendances enable row level security;

drop policy if exists "authenticated members can read profiles" on public.otmember;
create policy "authenticated members can read profiles" on public.otmember
for select to authenticated using (true);

drop policy if exists "users can update own basic profile" on public.otmember;
create policy "users can update own basic profile" on public.otmember
for update to authenticated using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid() and role = 'member');

drop policy if exists "authenticated users can read events" on public.tennis_events;
create policy "authenticated users can read events" on public.tennis_events
for select to authenticated using (true);

drop policy if exists "admins can insert events" on public.tennis_events;
create policy "admins can insert events" on public.tennis_events
for insert to authenticated with check (public.is_admin());

drop policy if exists "admins can update events" on public.tennis_events;
create policy "admins can update events" on public.tennis_events
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins can delete events" on public.tennis_events;
create policy "admins can delete events" on public.tennis_events
for delete to authenticated using (public.is_admin());

drop policy if exists "authenticated users can read attendances" on public.tennis_attendances;
create policy "authenticated users can read attendances" on public.tennis_attendances
for select to authenticated using (true);

drop policy if exists "users can attend as themselves" on public.tennis_attendances;
create policy "users can attend as themselves" on public.tennis_attendances
for insert to authenticated with check (
  public.is_current_member(member_id)
  and status in ('attending', 'waiting')
);

drop policy if exists "users can cancel own attendance" on public.tennis_attendances;
create policy "users can cancel own attendance" on public.tennis_attendances
for delete to authenticated using (public.is_current_member(member_id));

-- 첫 관리자는 회원가입 후 SQL Editor에서 아래처럼 지정하세요.
-- update public.otmember set role = 'admin' where user_id = '관리자아이디';

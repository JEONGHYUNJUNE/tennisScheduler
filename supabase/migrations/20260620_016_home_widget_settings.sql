create table if not exists public.home_widget_settings (
  member_id uuid primary key references public.otmember(id) on delete cascade,
  widget_order jsonb not null default '["upcomingEvents","members","ranking","calendar"]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint home_widget_settings_widget_order_array check (jsonb_typeof(widget_order) = 'array')
);

alter table public.home_widget_settings enable row level security;

drop policy if exists "Members can read own widget settings" on public.home_widget_settings;
create policy "Members can read own widget settings"
on public.home_widget_settings
for select
using (public.member_matches_auth(member_id));

drop policy if exists "Members can create own widget settings" on public.home_widget_settings;
create policy "Members can create own widget settings"
on public.home_widget_settings
for insert
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "Members can update own widget settings" on public.home_widget_settings;
create policy "Members can update own widget settings"
on public.home_widget_settings
for update
using (public.member_matches_auth(member_id))
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

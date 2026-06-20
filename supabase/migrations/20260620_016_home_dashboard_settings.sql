create table if not exists public.home_dashboard_settings (
  member_id uuid primary key references public.otmember(id) on delete cascade,
  widget_order jsonb not null default '["upcomingEvents","members","ranking","calendar"]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint home_dashboard_settings_widget_order_array check (jsonb_typeof(widget_order) = 'array')
);

alter table public.home_dashboard_settings enable row level security;

drop policy if exists "Members can read own dashboard settings" on public.home_dashboard_settings;
create policy "Members can read own dashboard settings"
on public.home_dashboard_settings
for select
using (public.member_matches_auth(member_id));

drop policy if exists "Members can create own dashboard settings" on public.home_dashboard_settings;
create policy "Members can create own dashboard settings"
on public.home_dashboard_settings
for insert
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "Members can update own dashboard settings" on public.home_dashboard_settings;
create policy "Members can update own dashboard settings"
on public.home_dashboard_settings
for update
using (public.member_matches_auth(member_id))
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

-- 테니스 TV 추천 영상을 관리자 화면에서 변경할 수 있도록 저장합니다.

create table if not exists public.tennis_video_settings (
  setting_key text primary key,
  title text not null default '추천 테니스 영상',
  description text,
  youtube_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.tennis_video_settings enable row level security;

insert into public.tennis_video_settings (setting_key, title, description, youtube_url)
values (
  'weekly_pick',
  '추천 테니스 영상',
  null,
  'https://youtu.be/Ec9cQyAH6oE?si=pdHfE9Z973YVjugp'
)
on conflict (setting_key) do nothing;

drop policy if exists "active members can read tennis video settings" on public.tennis_video_settings;
create policy "active members can read tennis video settings"
on public.tennis_video_settings for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "admins can insert tennis video settings" on public.tennis_video_settings;
create policy "admins can insert tennis video settings"
on public.tennis_video_settings for insert to authenticated
with check (public.is_active_admin(auth.uid()));

drop policy if exists "admins can update tennis video settings" on public.tennis_video_settings;
create policy "admins can update tennis video settings"
on public.tennis_video_settings for update to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

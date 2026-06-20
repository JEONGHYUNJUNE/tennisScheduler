-- 일정과 소통 글에 하트 좋아요를 저장합니다.

create table if not exists public.tennis_event_likes (
  event_id uuid not null,
  member_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (event_id, member_id),
  constraint tennis_event_likes_event_id_fkey
    foreign key (event_id) references public.tennis_events(id) on delete cascade,
  constraint tennis_event_likes_member_id_fkey
    foreign key (member_id) references public.otmember(id) on delete cascade
);

create table if not exists public.ot_free_opinion_likes (
  opinion_id uuid not null,
  member_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (opinion_id, member_id),
  constraint ot_free_opinion_likes_opinion_id_fkey
    foreign key (opinion_id) references public.ot_free_opinions(id) on delete cascade,
  constraint ot_free_opinion_likes_member_id_fkey
    foreign key (member_id) references public.otmember(id) on delete cascade
);

alter table public.tennis_event_likes enable row level security;
alter table public.ot_free_opinion_likes enable row level security;

drop policy if exists "active members can read event likes" on public.tennis_event_likes;
create policy "active members can read event likes"
on public.tennis_event_likes for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own event likes" on public.tennis_event_likes;
create policy "active members can create own event likes"
on public.tennis_event_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can delete own event likes" on public.tennis_event_likes;
create policy "active members can delete own event likes"
on public.tennis_event_likes for delete to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can read free opinion likes" on public.ot_free_opinion_likes;
create policy "active members can read free opinion likes"
on public.ot_free_opinion_likes for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own free opinion likes" on public.ot_free_opinion_likes;
create policy "active members can create own free opinion likes"
on public.ot_free_opinion_likes for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can delete own free opinion likes" on public.ot_free_opinion_likes;
create policy "active members can delete own free opinion likes"
on public.ot_free_opinion_likes for delete to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

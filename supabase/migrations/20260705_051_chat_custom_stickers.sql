create table if not exists public.chat_custom_stickers (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references public.otmember(id) on delete cascade,
  room_id uuid references public.chat_rooms(id) on delete cascade,
  image_path text not null,
  image_name text,
  image_mime text,
  created_at timestamptz not null default now()
);

create unique index if not exists chat_custom_stickers_owner_room_path_idx
on public.chat_custom_stickers(owner_member_id, coalesce(room_id, '00000000-0000-0000-0000-000000000000'::uuid), image_path);

create index if not exists chat_custom_stickers_owner_idx
on public.chat_custom_stickers(owner_member_id, created_at);

create index if not exists chat_custom_stickers_room_idx
on public.chat_custom_stickers(room_id, created_at);

alter table public.chat_custom_stickers enable row level security;

drop policy if exists "members can read own personal stickers" on public.chat_custom_stickers;
create policy "members can read own personal stickers"
on public.chat_custom_stickers for select to authenticated
using (
  room_id is null
  and public.member_matches_auth(owner_member_id)
);

drop policy if exists "room participants can read shared stickers" on public.chat_custom_stickers;
create policy "room participants can read shared stickers"
on public.chat_custom_stickers for select to authenticated
using (
  room_id is not null
  and public.is_chat_room_participant(room_id, public.current_otmember_id())
);

drop policy if exists "active members can create personal stickers" on public.chat_custom_stickers;
create policy "active members can create personal stickers"
on public.chat_custom_stickers for insert to authenticated
with check (
  room_id is null
  and public.member_matches_auth(owner_member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "room participants can create shared stickers" on public.chat_custom_stickers;
create policy "room participants can create shared stickers"
on public.chat_custom_stickers for insert to authenticated
with check (
  room_id is not null
  and public.member_matches_auth(owner_member_id)
  and public.is_chat_room_participant(room_id, public.current_otmember_id())
);

drop policy if exists "owners can delete own stickers" on public.chat_custom_stickers;
create policy "owners can delete own stickers"
on public.chat_custom_stickers for delete to authenticated
using (public.member_matches_auth(owner_member_id));

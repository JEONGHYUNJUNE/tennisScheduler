-- 소통 메뉴 NEW 뱃지를 위한 멤버별 마지막 읽음 시각입니다.

create table if not exists public.ot_free_opinion_reads (
  member_id uuid primary key,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ot_free_opinion_reads_member_id_fkey
    foreign key (member_id) references public.otmember(id) on delete cascade
);

alter table public.ot_free_opinion_reads enable row level security;

drop policy if exists "members can read own free opinion read state" on public.ot_free_opinion_reads;
create policy "members can read own free opinion read state"
on public.ot_free_opinion_reads for select to authenticated
using (public.member_matches_auth(member_id));

drop policy if exists "members can insert own free opinion read state" on public.ot_free_opinion_reads;
create policy "members can insert own free opinion read state"
on public.ot_free_opinion_reads for insert to authenticated
with check (public.member_matches_auth(member_id));

drop policy if exists "members can update own free opinion read state" on public.ot_free_opinion_reads;
create policy "members can update own free opinion read state"
on public.ot_free_opinion_reads for update to authenticated
using (public.member_matches_auth(member_id))
with check (public.member_matches_auth(member_id));

-- 자유의견 피드: 댓글처럼 짧게 남기고 최신 20개만 유지합니다.

create table if not exists public.ot_free_opinions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now(),
  constraint ot_free_opinions_member_id_fkey
    foreign key (member_id) references public.otmember(id) on delete cascade
);

create index if not exists ot_free_opinions_created_at_idx
on public.ot_free_opinions(created_at desc);

alter table public.ot_free_opinions enable row level security;

drop policy if exists "active members can read free opinions" on public.ot_free_opinions;
create policy "active members can read free opinions"
on public.ot_free_opinions for select to authenticated
using (public.is_active_member(auth.uid()));

drop policy if exists "active members can create own free opinions" on public.ot_free_opinions;
create policy "active members can create own free opinions"
on public.ot_free_opinions for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

create or replace function public.prune_old_free_opinions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ot_free_opinions opinion
  where opinion.id not in (
    select recent.id
    from public.ot_free_opinions recent
    order by recent.created_at desc
    limit 20
  );

  return new;
end;
$$;

drop trigger if exists prune_old_free_opinions on public.ot_free_opinions;
create trigger prune_old_free_opinions
after insert on public.ot_free_opinions
for each statement execute function public.prune_old_free_opinions();

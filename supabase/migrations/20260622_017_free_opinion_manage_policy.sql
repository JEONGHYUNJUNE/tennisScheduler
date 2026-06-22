-- 소통 글 수정/삭제 권한을 추가합니다.
-- 관리자는 모든 글을 수정/삭제할 수 있고, 일반 회원은 본인 글만 수정/삭제할 수 있습니다.

create or replace function public.can_manage_free_opinion(target_opinion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ot_free_opinions opinion
    join public.otmember actor on public.member_matches_auth(actor.id)
    where opinion.id = target_opinion_id
      and coalesce(actor.is_active, true) = true
      and (
        actor.role = 'admin'
        or opinion.member_id = actor.id
      )
  );
$$;

drop policy if exists "owners or admins can update free opinions" on public.ot_free_opinions;
create policy "owners or admins can update free opinions"
on public.ot_free_opinions for update to authenticated
using (public.can_manage_free_opinion(id))
with check (public.can_manage_free_opinion(id));

drop policy if exists "owners or admins can delete free opinions" on public.ot_free_opinions;
create policy "owners or admins can delete free opinions"
on public.ot_free_opinions for delete to authenticated
using (public.can_manage_free_opinion(id));

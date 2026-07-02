-- 다이어리 글 저장은 작성자 본인 여부로 통과시키고,
-- 그룹다이어리 유효성은 validate_tennis_diary_group_visibility 트리거가 검사하게 분리합니다.

drop policy if exists "members can insert own diary entries fallback" on public.tennis_diary_entries;
create policy "members can insert own diary entries fallback"
on public.tennis_diary_entries for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can select own diary entries fallback" on public.tennis_diary_entries;
create policy "members can select own diary entries fallback"
on public.tennis_diary_entries for select to authenticated
using (
  visibility = 'public'
  or public.member_matches_auth(member_id)
  or public.is_active_admin(auth.uid())
);

insert into public.tennis_diary_group_members (
  group_id,
  member_id,
  role,
  status,
  invited_by_member_id,
  responded_at
)
select
  diary_group.id,
  diary_group.owner_member_id,
  'owner',
  'accepted',
  diary_group.owner_member_id,
  now()
from public.tennis_diary_groups diary_group
on conflict (group_id, member_id) do update
set
  role = 'owner',
  status = 'accepted',
  responded_at = coalesce(public.tennis_diary_group_members.responded_at, excluded.responded_at);

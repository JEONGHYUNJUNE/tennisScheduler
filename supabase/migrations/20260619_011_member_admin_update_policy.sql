    -- Google 연결 계정도 멤버관리에서 회원 정보를 수정할 수 있도록 관리자 정책을 보강합니다.

    create or replace function public.is_active_admin(target_member_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $$
      select exists (
        select 1
        from public.otmember member
        where (
            member.id = target_member_id
            or member.google_auth_user_id = target_member_id
          )
          and member.role = 'admin'
          and coalesce(member.is_active, true) = true
      );
    $$;

    drop policy if exists "admins can update member profiles" on public.otmember;
    create policy "admins can update member profiles"
    on public.otmember for update to authenticated
    using (public.is_active_admin(auth.uid()))
    with check (public.is_active_admin(auth.uid()));

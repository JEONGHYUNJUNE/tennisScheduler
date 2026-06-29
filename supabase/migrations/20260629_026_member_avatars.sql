alter table public.otmember
add column if not exists avatar_url text,
add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "member avatars are publicly readable" on storage.objects;
create policy "member avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'member-avatars');

drop policy if exists "members can upload own avatar" on storage.objects;
create policy "members can upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-avatars'
  and exists (
    select 1
    from public.otmember member
    where member.id::text = (storage.foldername(name))[1]
      and (
        member.id = auth.uid()
        or member.google_auth_user_id = auth.uid()
      )
  )
);

drop policy if exists "members can update own avatar" on storage.objects;
create policy "members can update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'member-avatars'
  and exists (
    select 1
    from public.otmember member
    where member.id::text = (storage.foldername(name))[1]
      and (
        member.id = auth.uid()
        or member.google_auth_user_id = auth.uid()
      )
  )
)
with check (
  bucket_id = 'member-avatars'
  and exists (
    select 1
    from public.otmember member
    where member.id::text = (storage.foldername(name))[1]
      and (
        member.id = auth.uid()
        or member.google_auth_user_id = auth.uid()
      )
  )
);

drop policy if exists "members can delete own avatar" on storage.objects;
create policy "members can delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'member-avatars'
  and exists (
    select 1
    from public.otmember member
    where member.id::text = (storage.foldername(name))[1]
      and (
        member.id = auth.uid()
        or member.google_auth_user_id = auth.uid()
      )
  )
);

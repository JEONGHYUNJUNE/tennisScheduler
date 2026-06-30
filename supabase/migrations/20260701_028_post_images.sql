alter table public.tennis_events
add column if not exists memo_image_path text,
add column if not exists memo_image_name text,
add column if not exists memo_image_mime text;

alter table public.ot_free_opinions
add column if not exists image_path text,
add column if not exists image_name text,
add column if not exists image_mime text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post images are publicly readable" on storage.objects;
create policy "post images are publicly readable"
on storage.objects for select
using (bucket_id = 'post-images');

drop policy if exists "active members can upload post images" on storage.objects;
create policy "active members can upload post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can update post images" on storage.objects;
create policy "active members can update post images"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and public.is_active_member(auth.uid())
)
with check (
  bucket_id = 'post-images'
  and public.is_active_member(auth.uid())
);

drop policy if exists "active members can delete post images" on storage.objects;
create policy "active members can delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and public.is_active_member(auth.uid())
);

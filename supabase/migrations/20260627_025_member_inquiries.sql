-- 마이페이지 문의하기/답변함 기능을 추가합니다.
-- 첨부 이미지는 private Storage bucket에 저장하고, 앱에서는 signed URL로만 확인합니다.

create table if not exists public.member_inquiries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.otmember(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 1000),
  image_path text,
  image_name text,
  image_mime text,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.member_inquiries(id) on delete cascade,
  admin_member_id uuid references public.otmember(id) on delete cascade,
  sender_member_id uuid not null references public.otmember(id) on delete cascade,
  sender_role text not null default 'admin' check (sender_role in ('admin', 'member')),
  message text not null check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.member_inquiry_replies
alter column admin_member_id drop not null;

alter table public.member_inquiry_replies
add column if not exists sender_member_id uuid references public.otmember(id) on delete cascade;

alter table public.member_inquiry_replies
add column if not exists sender_role text not null default 'admin';

alter table public.member_inquiry_replies
drop constraint if exists member_inquiry_replies_sender_role_check;

alter table public.member_inquiry_replies
add constraint member_inquiry_replies_sender_role_check
check (sender_role in ('admin', 'member'));

update public.member_inquiry_replies
set sender_member_id = admin_member_id
where sender_member_id is null
  and admin_member_id is not null;

alter table public.member_inquiry_replies
alter column sender_member_id set not null;

create index if not exists member_inquiries_member_created_idx
on public.member_inquiries(member_id, created_at desc);

create index if not exists member_inquiries_status_created_idx
on public.member_inquiries(status, created_at desc);

create index if not exists member_inquiry_replies_inquiry_created_idx
on public.member_inquiry_replies(inquiry_id, created_at asc);

alter table public.ot_notifications
add column if not exists inquiry_id uuid references public.member_inquiries(id) on delete cascade;

alter table public.ot_notifications
add column if not exists inquiry_reply_id uuid references public.member_inquiry_replies(id) on delete cascade;

create index if not exists ot_notifications_inquiry_idx
on public.ot_notifications(inquiry_id);

alter table public.member_inquiries enable row level security;
alter table public.member_inquiry_replies enable row level security;

insert into storage.buckets (id, name, public)
values ('inquiry-attachments', 'inquiry-attachments', false)
on conflict (id) do update set public = false;

create or replace function public.touch_member_inquiry_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_member_inquiry_updated_at on public.member_inquiries;
create trigger touch_member_inquiry_updated_at
before update on public.member_inquiries
for each row execute function public.touch_member_inquiry_updated_at();

drop policy if exists "members can read own inquiries" on public.member_inquiries;
create policy "members can read own inquiries"
on public.member_inquiries for select to authenticated
using (
  public.member_matches_auth(member_id)
  or public.is_active_admin(auth.uid())
);

drop policy if exists "members can create own inquiries" on public.member_inquiries;
create policy "members can create own inquiries"
on public.member_inquiries for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "admins can update inquiries" on public.member_inquiries;
create policy "admins can update inquiries"
on public.member_inquiries for update to authenticated
using (public.is_active_admin(auth.uid()))
with check (public.is_active_admin(auth.uid()));

drop policy if exists "members and admins can delete inquiries" on public.member_inquiries;
create policy "members and admins can delete inquiries"
on public.member_inquiries for delete to authenticated
using (
  public.member_matches_auth(member_id)
  or public.is_active_admin(auth.uid())
);

drop policy if exists "members and admins can read inquiry replies" on public.member_inquiry_replies;
create policy "members and admins can read inquiry replies"
on public.member_inquiry_replies for select to authenticated
using (
  public.is_active_admin(auth.uid())
  or exists (
    select 1
    from public.member_inquiries inquiry
    where inquiry.id = public.member_inquiry_replies.inquiry_id
      and public.member_matches_auth(inquiry.member_id)
  )
);

drop policy if exists "admins can create inquiry replies" on public.member_inquiry_replies;
drop policy if exists "admins and owners can create inquiry replies" on public.member_inquiry_replies;
create policy "admins and owners can create inquiry replies"
on public.member_inquiry_replies for insert to authenticated
with check (
  (
    sender_role = 'admin'
    and public.is_active_admin(auth.uid())
    and public.member_matches_auth(sender_member_id)
  )
  or (
    sender_role = 'member'
    and public.member_matches_auth(sender_member_id)
    and exists (
      select 1
      from public.member_inquiries inquiry
      where inquiry.id = public.member_inquiry_replies.inquiry_id
        and public.member_matches_auth(inquiry.member_id)
    )
  )
);

drop policy if exists "senders and admins can delete inquiry replies" on public.member_inquiry_replies;
create policy "senders and admins can delete inquiry replies"
on public.member_inquiry_replies for delete to authenticated
using (
  public.is_active_admin(auth.uid())
  or public.member_matches_auth(sender_member_id)
);

drop policy if exists "members can upload inquiry attachments" on storage.objects;
create policy "members can upload inquiry attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'inquiry-attachments'
  and exists (
    select 1
    from public.otmember member
    where member.id = ((storage.foldername(name))[1])::uuid
      and public.member_matches_auth(member.id)
      and coalesce(member.is_active, true) = true
  )
);

drop policy if exists "members and admins can read inquiry attachments" on storage.objects;
create policy "members and admins can read inquiry attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'inquiry-attachments'
  and (
    public.is_active_admin(auth.uid())
    or exists (
      select 1
      from public.otmember member
      where member.id = ((storage.foldername(name))[1])::uuid
        and public.member_matches_auth(member.id)
        and coalesce(member.is_active, true) = true
    )
  )
);

drop policy if exists "members and admins can delete inquiry attachments" on storage.objects;
create policy "members and admins can delete inquiry attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'inquiry-attachments'
  and (
    public.is_active_admin(auth.uid())
    or exists (
      select 1
      from public.otmember member
      where member.id = ((storage.foldername(name))[1])::uuid
        and public.member_matches_auth(member.id)
        and coalesce(member.is_active, true) = true
    )
  )
);

create or replace function public.get_inquiry_notification_preview(source_message text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when char_length(trim(regexp_replace(coalesce(source_message, ''), '\s+', ' ', 'g'))) > 10
      then left(trim(regexp_replace(coalesce(source_message, ''), '\s+', ' ', 'g')), 10) || '…'
    else trim(regexp_replace(coalesce(source_message, ''), '\s+', ' ', 'g'))
  end;
$$;

create or replace function public.notify_member_inquiry_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  inquiry_preview text;
begin
  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  inquiry_preview := public.get_inquiry_notification_preview(new.message);

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    inquiry_id,
    type,
    title,
    message
  )
  select admin_member.id,
         new.member_id,
         new.id,
         'member_inquiry_created',
         '새 문의가 도착했습니다.',
         actor_name || '님 문의: ' || inquiry_preview
  from public.otmember admin_member
  where admin_member.role = 'admin'
    and coalesce(admin_member.is_active, true) = true
    and admin_member.id <> new.member_id;

  return new;
end;
$$;

drop trigger if exists notify_member_inquiry_inserted on public.member_inquiries;
create trigger notify_member_inquiry_inserted
after insert on public.member_inquiries
for each row execute function public.notify_member_inquiry_inserted();

create or replace function public.notify_member_inquiry_reply_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inquiry_owner_id uuid;
  actor_name text;
  reply_preview text;
begin
  select inquiry.member_id
  into inquiry_owner_id
  from public.member_inquiries inquiry
  where inquiry.id = new.inquiry_id;

  if inquiry_owner_id is null then
    return new;
  end if;

  reply_preview := public.get_inquiry_notification_preview(new.message);

  if new.sender_role = 'admin' then
    update public.member_inquiries
    set status = 'answered'
    where id = new.inquiry_id;

    if inquiry_owner_id = new.sender_member_id then
      return new;
    end if;

    insert into public.ot_notifications (
      recipient_member_id,
      actor_member_id,
      inquiry_id,
      inquiry_reply_id,
      type,
      title,
      message
    )
    values (
      inquiry_owner_id,
      new.sender_member_id,
      new.inquiry_id,
      new.id,
      'member_inquiry_replied',
      '문의에 답변이 도착했습니다.',
      '관리자 답변: ' || reply_preview
    );
  else
    update public.member_inquiries
    set status = 'open'
    where id = new.inquiry_id;

    select coalesce(member.display_name, member.username, '회원')
    into actor_name
    from public.otmember member
    where member.id = new.sender_member_id;

    insert into public.ot_notifications (
      recipient_member_id,
      actor_member_id,
      inquiry_id,
      inquiry_reply_id,
      type,
      title,
      message
    )
    select admin_member.id,
           new.sender_member_id,
           new.inquiry_id,
           new.id,
           'member_inquiry_followed_up',
           '문의에 추가 댓글이 달렸습니다.',
           actor_name || '님 댓글: ' || reply_preview
    from public.otmember admin_member
    where admin_member.role = 'admin'
      and coalesce(admin_member.is_active, true) = true
      and admin_member.id <> new.sender_member_id;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_member_inquiry_reply_inserted on public.member_inquiry_replies;
create trigger notify_member_inquiry_reply_inserted
after insert on public.member_inquiry_replies
for each row execute function public.notify_member_inquiry_reply_inserted();

create or replace function public.refresh_member_inquiry_status_after_reply_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.member_inquiries
  set status = case
    when exists (
      select 1
      from public.member_inquiry_replies reply
      where reply.inquiry_id = old.inquiry_id
        and reply.sender_role = 'admin'
    ) then 'answered'
    else 'open'
  end
  where id = old.inquiry_id;

  return old;
end;
$$;

drop trigger if exists refresh_member_inquiry_status_after_reply_delete on public.member_inquiry_replies;
create trigger refresh_member_inquiry_status_after_reply_delete
after delete on public.member_inquiry_replies
for each row execute function public.refresh_member_inquiry_status_after_reply_delete();

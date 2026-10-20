-- 단체톡방: 1:1 채팅과 분리된 별도 테이블/정책/RPC입니다.

create table if not exists public.group_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_member_id uuid references public.otmember(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_chat_members (
  room_id uuid not null references public.group_chat_rooms(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_read_at timestamptz,
  primary key (room_id, member_id)
);

create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.group_chat_rooms(id) on delete cascade,
  sender_member_id uuid references public.otmember(id) on delete set null,
  message_type text not null default 'text' check (message_type in ('text', 'system', 'image', 'video')),
  body text not null default '',
  image_path text,
  image_name text,
  image_mime text,
  deleted_at timestamptz,
  deleted_by_member_id uuid references public.otmember(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ot_notifications
add column if not exists group_chat_room_id uuid references public.group_chat_rooms(id) on delete set null;

create or replace function public.get_notification_category(notification_type text)
returns text
language sql
immutable
as $$
  select case
    when notification_type in (
      'attendance_created',
      'attendance_cancelled',
      'waiting_promoted',
      'event_created',
      'event_updated',
      'event_cancelled',
      'event_reminder_day_before',
      'event_reminder_today',
      'tennis_event_comment_created',
      'tennis_event_comment_reply_created',
      'tennis_event_comment_mention',
      'tennis_event_comment_liked'
    ) or notification_type like 'tennis_event_%' then 'schedule'
    when notification_type in (
      'free_opinion_created',
      'free_opinion_comment_created',
      'free_opinion_comment_reply_created',
      'free_opinion_comment_liked',
      'free_opinion_mention',
      'free_opinion_comment_mention'
    ) or notification_type like 'free_opinion_%' then 'social'
    when notification_type in (
      'tennis_diary_comment_created',
      'tennis_diary_comment_reply_created',
      'tennis_diary_liked',
      'tennis_diary_comment_liked',
      'tennis_diary_entry_mention',
      'tennis_diary_comment_mention',
      'tennis_diary_group_invited',
      'tennis_diary_entry_created'
    ) or notification_type like 'tennis_diary_%' then 'diary'
    when notification_type in (
      'member_inquiry_created',
      'member_inquiry_replied',
      'member_inquiry_followed_up'
    ) or notification_type like 'member_inquiry_%' then 'inquiry'
    when notification_type in (
      'chat_requested',
      'chat_message_created',
      'chat_message_reaction_created',
      'group_chat_message_created'
    ) or notification_type like 'chat_%'
      or notification_type like 'group_chat_%' then 'chat'
    else 'general'
  end;
$$;

create index if not exists group_chat_rooms_updated_idx
on public.group_chat_rooms(updated_at desc);

create index if not exists group_chat_members_member_idx
on public.group_chat_members(member_id, left_at, joined_at desc);

create index if not exists group_chat_messages_room_created_idx
on public.group_chat_messages(room_id, created_at asc);

create index if not exists group_chat_messages_room_visible_created_idx
on public.group_chat_messages(room_id, created_at desc)
where deleted_at is null;

create index if not exists ot_notifications_group_chat_room_idx
on public.ot_notifications(group_chat_room_id);

alter table public.group_chat_rooms enable row level security;
alter table public.group_chat_members enable row level security;
alter table public.group_chat_messages enable row level security;

create or replace function public.is_group_chat_member(target_room_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_chat_members member
    join public.group_chat_rooms room on room.id = member.room_id
    where member.room_id = target_room_id
      and member.member_id = target_member_id
      and member.left_at is null
      and room.status = 'active'
  );
$$;

drop policy if exists "group chat members can read rooms" on public.group_chat_rooms;
create policy "group chat members can read rooms"
on public.group_chat_rooms for select to authenticated
using (public.is_group_chat_member(id, public.current_otmember_id()));

drop policy if exists "group chat members can read memberships" on public.group_chat_members;
create policy "group chat members can read memberships"
on public.group_chat_members for select to authenticated
using (public.is_group_chat_member(room_id, public.current_otmember_id()));

drop policy if exists "group chat members can read messages" on public.group_chat_messages;
create policy "group chat members can read messages"
on public.group_chat_messages for select to authenticated
using (public.is_group_chat_member(room_id, public.current_otmember_id()));

drop policy if exists "group chat members can create messages" on public.group_chat_messages;
create policy "group chat members can create messages"
on public.group_chat_messages for insert to authenticated
with check (
  public.is_group_chat_member(room_id, public.current_otmember_id())
  and message_type in ('text', 'image', 'video')
);

create or replace function public.touch_group_chat_room_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_group_chat_room_updated_at on public.group_chat_rooms;
create trigger touch_group_chat_room_updated_at
before update on public.group_chat_rooms
for each row execute function public.touch_group_chat_room_updated_at();

create or replace function public.set_group_chat_message_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if new.message_type <> 'system' then
    new.sender_member_id := actor_member_id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_group_chat_message_sender on public.group_chat_messages;
create trigger set_group_chat_message_sender
before insert on public.group_chat_messages
for each row execute function public.set_group_chat_message_sender();

create or replace function public.touch_group_chat_room_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_chat_rooms
  set updated_at = now()
  where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists touch_group_chat_room_on_message on public.group_chat_messages;
create trigger touch_group_chat_room_on_message
after insert on public.group_chat_messages
for each row execute function public.touch_group_chat_room_on_message();

create or replace function public.create_group_chat(
  room_name text,
  invited_member_ids uuid[] default '{}'
)
returns public.group_chat_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  new_room public.group_chat_rooms%rowtype;
  invitee_member_id uuid;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if nullif(trim(room_name), '') is null then
    raise exception '단체톡방 이름을 입력해 주세요.';
  end if;

  insert into public.group_chat_rooms (name, created_by_member_id)
  values (trim(room_name), actor_member_id)
  returning * into new_room;

  insert into public.group_chat_members (room_id, member_id, role, last_read_at)
  values (new_room.id, actor_member_id, 'owner', now())
  on conflict (room_id, member_id) do update
  set left_at = null,
      role = excluded.role;

  foreach invitee_member_id in array coalesce(invited_member_ids, '{}')
  loop
    if invitee_member_id <> actor_member_id and exists (
      select 1 from public.otmember member
      where member.id = invitee_member_id
        and coalesce(member.is_active, true) = true
    ) then
      insert into public.group_chat_members (room_id, member_id, role)
      values (new_room.id, invitee_member_id, 'member')
      on conflict (room_id, member_id) do update
      set left_at = null;
    end if;
  end loop;

  insert into public.group_chat_messages (room_id, sender_member_id, message_type, body)
  values (new_room.id, actor_member_id, 'system', '단체톡방이 만들어졌습니다.');

  return new_room;
end;
$$;

grant execute on function public.create_group_chat(text, uuid[]) to authenticated;

create or replace function public.mark_group_chat_read(target_room_id uuid)
returns public.group_chat_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  updated_member public.group_chat_members%rowtype;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  update public.group_chat_members member
  set last_read_at = now()
  where member.room_id = target_room_id
    and member.member_id = actor_member_id
    and member.left_at is null
  returning * into updated_member;

  if updated_member.room_id is null then
    raise exception '단체톡방을 찾을 수 없습니다.';
  end if;

  return updated_member;
end;
$$;

grant execute on function public.mark_group_chat_read(uuid) to authenticated;

create or replace function public.leave_group_chat(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  actor_name text;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = actor_member_id;

  update public.group_chat_members member
  set left_at = now()
  where member.room_id = target_room_id
    and member.member_id = actor_member_id
    and member.left_at is null;

  if not found then
    raise exception '단체톡방을 찾을 수 없습니다.';
  end if;

  insert into public.group_chat_messages (room_id, sender_member_id, message_type, body)
  values (target_room_id, actor_member_id, 'system', actor_name || '님이 나갔습니다.');
end;
$$;

grant execute on function public.leave_group_chat(uuid) to authenticated;

create or replace function public.notify_group_chat_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_name text;
  room_name text;
begin
  if new.message_type = 'system' then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into sender_name
  from public.otmember member
  where member.id = new.sender_member_id;

  select room.name
  into room_name
  from public.group_chat_rooms room
  where room.id = new.room_id;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    group_chat_room_id,
    type,
    title,
    message
  )
  select
    member.member_id,
    new.sender_member_id,
    new.room_id,
    'group_chat_message_created',
    coalesce(room_name, '단체톡') || ' 새 메시지',
    sender_name || ': ' || case
      when new.message_type = 'image' then '사진'
      when new.message_type = 'video' then '동영상'
      else left(regexp_replace(new.body, '\s+', ' ', 'g'), 40)
    end
  from public.group_chat_members member
  where member.room_id = new.room_id
    and member.left_at is null
    and member.member_id is distinct from new.sender_member_id
    and public.is_notification_category_enabled(member.member_id, 'group_chat_message_created');

  return new;
end;
$$;

drop trigger if exists notify_group_chat_message_inserted on public.group_chat_messages;
create trigger notify_group_chat_message_inserted
after insert on public.group_chat_messages
for each row execute function public.notify_group_chat_message_inserted();

do $$
begin
  alter publication supabase_realtime add table public.group_chat_rooms;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.group_chat_members;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.group_chat_messages;
exception
  when duplicate_object then null;
end;
$$;

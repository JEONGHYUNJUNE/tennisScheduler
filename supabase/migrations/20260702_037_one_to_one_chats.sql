-- 1:1 채팅 요청, 실시간 메시지, 종료 기능을 추가합니다.

create or replace function public.current_otmember_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.id
  from public.otmember member
  where (
      member.id = auth.uid()
      or member.google_auth_user_id = auth.uid()
    )
    and coalesce(member.is_active, true) = true
  limit 1;
$$;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  requester_member_id uuid not null references public.otmember(id) on delete cascade,
  recipient_member_id uuid not null references public.otmember(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'active', 'ended')),
  requested_at timestamptz not null default now(),
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  check (requester_member_id <> recipient_member_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_member_id uuid references public.otmember(id) on delete set null,
  message_type text not null default 'text' check (message_type in ('text', 'sticker', 'image', 'system')),
  body text not null default '',
  image_path text,
  image_name text,
  image_mime text,
  created_at timestamptz not null default now()
);

create index if not exists chat_rooms_requester_idx
on public.chat_rooms(requester_member_id, status, updated_at desc);

create index if not exists chat_rooms_recipient_idx
on public.chat_rooms(recipient_member_id, status, updated_at desc);

create index if not exists chat_messages_room_created_idx
on public.chat_messages(room_id, created_at asc);

create unique index if not exists chat_rooms_open_pair_unique_idx
on public.chat_rooms(
  least(requester_member_id, recipient_member_id),
  greatest(requester_member_id, recipient_member_id)
)
where status <> 'ended';

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

do $$
begin
  alter publication supabase_realtime add table public.chat_rooms;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end;
$$;

alter table public.ot_notifications
add column if not exists chat_room_id uuid references public.chat_rooms(id) on delete set null;

create index if not exists ot_notifications_chat_room_idx
on public.ot_notifications(chat_room_id);

create or replace function public.is_chat_room_participant(target_room_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_rooms room
    where room.id = target_room_id
      and room.status <> 'ended'
      and target_member_id in (room.requester_member_id, room.recipient_member_id)
  );
$$;

create or replace function public.can_send_chat_message(target_room_id uuid, target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_rooms room
    where room.id = target_room_id
      and room.status = 'active'
      and target_member_id in (room.requester_member_id, room.recipient_member_id)
  );
$$;

drop policy if exists "participants can read own chat rooms" on public.chat_rooms;
create policy "participants can read own chat rooms"
on public.chat_rooms for select to authenticated
using (
  public.member_matches_auth(requester_member_id)
  or public.member_matches_auth(recipient_member_id)
  or public.is_active_admin(auth.uid())
);

drop policy if exists "participants can read own chat messages" on public.chat_messages;
create policy "participants can read own chat messages"
on public.chat_messages for select to authenticated
using (
  public.is_chat_room_participant(room_id, public.current_otmember_id())
  or public.is_active_admin(auth.uid())
);

drop policy if exists "participants can create active chat messages" on public.chat_messages;
create policy "participants can create active chat messages"
on public.chat_messages for insert to authenticated
with check (
  public.can_send_chat_message(room_id, public.current_otmember_id())
  and message_type in ('text', 'sticker', 'image')
);

create or replace function public.touch_chat_room_updated_at()
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

drop trigger if exists touch_chat_room_updated_at on public.chat_rooms;
create trigger touch_chat_room_updated_at
before update on public.chat_rooms
for each row execute function public.touch_chat_room_updated_at();

create or replace function public.set_chat_message_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
begin
  if new.message_type = 'system' then
    return new;
  end if;

  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if not public.can_send_chat_message(new.room_id, actor_member_id) then
    raise exception '채팅 메시지를 보낼 수 없습니다.';
  end if;

  new.sender_member_id := actor_member_id;
  new.body := trim(new.body);
  if new.message_type <> 'image' and char_length(new.body) = 0 then
    raise exception '메시지를 입력해 주세요.';
  end if;

  return new;
end;
$$;

drop trigger if exists set_chat_message_sender on public.chat_messages;
create trigger set_chat_message_sender
before insert on public.chat_messages
for each row execute function public.set_chat_message_sender();

create or replace function public.touch_chat_room_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_rooms
  set updated_at = now()
  where id = new.room_id;

  return new;
end;
$$;

drop trigger if exists touch_chat_room_on_message on public.chat_messages;
create trigger touch_chat_room_on_message
after insert on public.chat_messages
for each row execute function public.touch_chat_room_on_message();

create or replace function public.request_one_to_one_chat(target_member_id uuid)
returns table (
  id uuid,
  status text,
  requester_member_id uuid,
  recipient_member_id uuid,
  requested_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  target_room_id uuid;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if actor_member_id = target_member_id then
    raise exception '자기 자신에게는 채팅 요청을 보낼 수 없습니다.';
  end if;

  if not exists (
    select 1 from public.otmember member
    where member.id = target_member_id
      and coalesce(member.is_active, true) = true
  ) then
    raise exception '채팅할 회원을 찾을 수 없습니다.';
  end if;

  select room.id
  into target_room_id
  from public.chat_rooms room
  where room.status <> 'ended'
    and actor_member_id in (room.requester_member_id, room.recipient_member_id)
    and target_member_id in (room.requester_member_id, room.recipient_member_id)
  limit 1;

  if target_room_id is null then
    insert into public.chat_rooms (requester_member_id, recipient_member_id)
    values (actor_member_id, target_member_id)
    returning chat_rooms.id into target_room_id;
  end if;

  return query
  select room.id, room.status, room.requester_member_id, room.recipient_member_id, room.requested_at, room.activated_at, room.ended_at, room.updated_at
  from public.chat_rooms room
  where room.id = target_room_id;
end;
$$;

create or replace function public.enter_one_to_one_chat(target_room_id uuid)
returns table (
  id uuid,
  status text,
  requester_member_id uuid,
  recipient_member_id uuid,
  requested_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  actor_name text;
  room_record public.chat_rooms%rowtype;
  updated_count integer := 0;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  select *
  into room_record
  from public.chat_rooms room
  where room.id = target_room_id
    and room.status <> 'ended'
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);

  if room_record.id is null then
    raise exception '채팅방을 찾을 수 없습니다.';
  end if;

  if room_record.status = 'requested' and actor_member_id = room_record.recipient_member_id then
    update public.chat_rooms
    set status = 'active',
        activated_at = coalesce(activated_at, now())
    where chat_rooms.id = target_room_id
      and chat_rooms.status = 'requested';

    get diagnostics updated_count = row_count;

    if updated_count > 0 then
      select coalesce(member.display_name, member.username, '회원')
      into actor_name
      from public.otmember member
      where member.id = actor_member_id;

      insert into public.chat_messages (room_id, sender_member_id, message_type, body)
      select target_room_id, null, 'system', coalesce(actor_name, '회원') || '님이 입장하셨습니다.'
      where not exists (
        select 1
        from public.chat_messages message
        where message.room_id = target_room_id
          and message.message_type = 'system'
          and message.body = coalesce(actor_name, '회원') || '님이 입장하셨습니다.'
      );
    end if;
  end if;

  return query
  select room.id, room.status, room.requester_member_id, room.recipient_member_id, room.requested_at, room.activated_at, room.ended_at, room.updated_at
  from public.chat_rooms room
  where room.id = target_room_id;
end;
$$;

create or replace function public.end_one_to_one_chat(target_room_id uuid)
returns void
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

  if not exists (
    select 1 from public.chat_rooms room
    where room.id = target_room_id
      and room.status <> 'ended'
      and actor_member_id in (room.requester_member_id, room.recipient_member_id)
  ) then
    raise exception '종료할 채팅방을 찾을 수 없습니다.';
  end if;

  delete from public.chat_messages message
  where message.room_id = target_room_id;

  update public.chat_rooms
  set status = 'ended',
      ended_at = now()
  where id = target_room_id;
end;
$$;

grant execute on function public.request_one_to_one_chat(uuid) to authenticated;
grant execute on function public.enter_one_to_one_chat(uuid) to authenticated;
grant execute on function public.end_one_to_one_chat(uuid) to authenticated;

create or replace function public.notify_chat_requested()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.requester_member_id;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    chat_room_id,
    type,
    title,
    message
  )
  values (
    new.recipient_member_id,
    new.requester_member_id,
    new.id,
    'chat_requested',
    '채팅 요청이 도착했습니다.',
    coalesce(actor_name, '회원') || '님이 1:1 채팅을 요청했습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_chat_requested on public.chat_rooms;
create trigger notify_chat_requested
after insert on public.chat_rooms
for each row execute function public.notify_chat_requested();

create or replace function public.notify_chat_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_record public.chat_rooms%rowtype;
  recipient_id uuid;
  actor_name text;
  preview text;
begin
  if new.message_type = 'system' then
    return new;
  end if;

  select *
  into room_record
  from public.chat_rooms room
  where room.id = new.room_id;

  if room_record.id is null or room_record.status <> 'active' then
    return new;
  end if;

  recipient_id := case
    when new.sender_member_id = room_record.requester_member_id then room_record.recipient_member_id
    else room_record.requester_member_id
  end;

  if exists (
    select 1
    from public.ot_notifications notification
    where notification.recipient_member_id = recipient_id
      and notification.chat_room_id = new.room_id
      and notification.type = 'chat_message_created'
      and notification.created_at >= now() - interval '30 minutes'
  ) then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.sender_member_id;

  preview := case
    when new.message_type = 'image' then '사진을 보냈습니다.'
    when char_length(new.body) > 10 then substring(new.body from 1 for 10) || '…'
    else new.body
  end;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    chat_room_id,
    type,
    title,
    message
  )
  values (
    recipient_id,
    new.sender_member_id,
    new.room_id,
    'chat_message_created',
    '새 채팅 메시지가 있습니다.',
    coalesce(actor_name, '회원') || ': ' || preview
  );

  return new;
end;
$$;

drop trigger if exists notify_chat_message_inserted on public.chat_messages;
create trigger notify_chat_message_inserted
after insert on public.chat_messages
for each row execute function public.notify_chat_message_inserted();

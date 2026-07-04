-- 채팅 답장과 채팅방 상단 공지 기능을 추가합니다.

alter table public.chat_messages
  add column if not exists reply_to_message_id uuid references public.chat_messages(id) on delete set null;

alter table public.chat_rooms
  add column if not exists notice_message_id uuid references public.chat_messages(id) on delete set null,
  add column if not exists notice_set_by_member_id uuid references public.otmember(id) on delete set null,
  add column if not exists notice_set_at timestamptz;

create index if not exists chat_messages_reply_to_idx
on public.chat_messages(reply_to_message_id);

create index if not exists chat_rooms_notice_message_idx
on public.chat_rooms(notice_message_id);

create or replace function public.touch_chat_room_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.requester_member_id is not distinct from new.requester_member_id
    and old.recipient_member_id is not distinct from new.recipient_member_id
    and old.status is not distinct from new.status
    and old.requested_at is not distinct from new.requested_at
    and old.activated_at is not distinct from new.activated_at
    and old.ended_at is not distinct from new.ended_at
    and old.notice_message_id is not distinct from new.notice_message_id
    and old.notice_set_by_member_id is not distinct from new.notice_set_by_member_id
    and old.notice_set_at is not distinct from new.notice_set_at
    and (
      old.requester_last_read_at is distinct from new.requester_last_read_at
      or old.recipient_last_read_at is distinct from new.recipient_last_read_at
      or old.requester_last_seen_at is distinct from new.requester_last_seen_at
      or old.recipient_last_seen_at is distinct from new.recipient_last_seen_at
    ) then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;

  return new;
end;
$$;

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

  if new.reply_to_message_id is not null and not exists (
    select 1
    from public.chat_messages original
    where original.id = new.reply_to_message_id
      and original.room_id = new.room_id
      and original.message_type <> 'system'
  ) then
    raise exception '답장할 메시지를 찾을 수 없습니다.';
  end if;

  new.sender_member_id := actor_member_id;
  new.body := trim(new.body);
  if new.message_type <> 'image' and char_length(new.body) = 0 then
    raise exception '메시지를 입력해 주세요.';
  end if;

  return new;
end;
$$;

create or replace function public.set_one_to_one_chat_notice(
  target_room_id uuid,
  target_message_id uuid
)
returns table (
  id uuid,
  status text,
  requester_member_id uuid,
  recipient_member_id uuid,
  requested_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz,
  notice_message_id uuid,
  notice_set_by_member_id uuid,
  notice_set_at timestamptz,
  requester_last_read_at timestamptz,
  recipient_last_read_at timestamptz,
  requester_last_seen_at timestamptz,
  recipient_last_seen_at timestamptz
)
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

  if target_message_id is not null and not exists (
    select 1
    from public.chat_messages message
    join public.chat_rooms room on room.id = message.room_id
    where message.id = target_message_id
      and message.room_id = target_room_id
      and message.message_type <> 'system'
      and room.status <> 'ended'
      and actor_member_id in (room.requester_member_id, room.recipient_member_id)
  ) then
    raise exception '공지할 메시지를 찾을 수 없습니다.';
  end if;

  update public.chat_rooms room
  set notice_message_id = target_message_id,
      notice_set_by_member_id = case when target_message_id is null then null else actor_member_id end,
      notice_set_at = case when target_message_id is null then null else now() end
  where room.id = target_room_id
    and room.status <> 'ended'
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);

  return query
  select room.id, room.status, room.requester_member_id, room.recipient_member_id,
         room.requested_at, room.activated_at, room.ended_at, room.updated_at,
         room.notice_message_id, room.notice_set_by_member_id, room.notice_set_at,
         room.requester_last_read_at, room.recipient_last_read_at,
         room.requester_last_seen_at, room.recipient_last_seen_at
  from public.chat_rooms room
  where room.id = target_room_id
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);
end;
$$;

grant execute on function public.set_one_to_one_chat_notice(uuid, uuid) to authenticated;

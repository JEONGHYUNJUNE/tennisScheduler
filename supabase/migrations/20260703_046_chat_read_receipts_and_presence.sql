alter table public.chat_rooms
    add column if not exists requester_last_read_at timestamptz,
    add column if not exists recipient_last_read_at timestamptz,
    add column if not exists requester_last_seen_at timestamptz,
    add column if not exists recipient_last_seen_at timestamptz;

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

create or replace function public.mark_one_to_one_chat_read(target_room_id uuid)
returns table (
  id uuid,
  status text,
  requester_member_id uuid,
  recipient_member_id uuid,
  requested_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz,
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

update public.chat_rooms room
set requester_last_read_at = case
                                 when actor_member_id = room.requester_member_id then now()
                                 else room.requester_last_read_at
    end,
    recipient_last_read_at = case
                                 when actor_member_id = room.recipient_member_id then now()
                                 else room.recipient_last_read_at
        end,
    requester_last_seen_at = case
                                 when actor_member_id = room.requester_member_id then now()
                                 else room.requester_last_seen_at
        end,
    recipient_last_seen_at = case
                                 when actor_member_id = room.recipient_member_id then now()
                                 else room.recipient_last_seen_at
        end
where room.id = target_room_id
  and room.status <> 'ended'
  and actor_member_id in (room.requester_member_id, room.recipient_member_id);

return query
select room.id, room.status, room.requester_member_id, room.recipient_member_id, room.requested_at,
       room.activated_at, room.ended_at, room.updated_at, room.requester_last_read_at,
       room.recipient_last_read_at, room.requester_last_seen_at, room.recipient_last_seen_at
from public.chat_rooms room
where room.id = target_room_id
  and actor_member_id in (room.requester_member_id, room.recipient_member_id);
end;
$$;

grant execute on function public.mark_one_to_one_chat_read(uuid) to authenticated;

create or replace function public.notify_chat_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
room_record public.chat_rooms%rowtype;
  recipient_id uuid;
  recipient_seen_at timestamptz;
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

  recipient_seen_at := case
    when recipient_id = room_record.requester_member_id then room_record.requester_last_seen_at
    else room_record.recipient_last_seen_at
end;

  if recipient_seen_at is not null and recipient_seen_at >= now() - interval '45 seconds' then
    return new;
end if;

select coalesce(member.display_name, member.username, '회원')
into actor_name
from public.otmember member
where member.id = new.sender_member_id;

preview := case
    when new.message_type = 'image' and new.image_path like 'chat-stickers/%' then '이모티콘을 보냈습니다.'
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

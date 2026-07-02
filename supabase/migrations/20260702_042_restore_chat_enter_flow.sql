-- 채팅방 입장 흐름을 초기 구현에 가깝게 복구하되, 입장 시스템 메시지는 중복 생성되지 않게 합니다.

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

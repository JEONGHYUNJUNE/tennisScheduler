-- 초대받은 회원 id를 명시해서 채팅 요청을 수락합니다.
-- 기존 enter_one_to_one_chat의 auth/member 판별이 어긋나는 경우를 방지합니다.

create or replace function public.accept_one_to_one_chat(target_room_id uuid, target_recipient_member_id uuid)
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
  actor_name text;
  updated_count integer := 0;
begin
  if target_recipient_member_id is null or not public.member_matches_auth(target_recipient_member_id) then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  update public.chat_rooms
  set status = 'active',
      activated_at = coalesce(activated_at, now())
  where chat_rooms.id = target_room_id
    and chat_rooms.status = 'requested'
    and chat_rooms.recipient_member_id = target_recipient_member_id;

  get diagnostics updated_count = row_count;

  if updated_count > 0 then
    select coalesce(member.display_name, member.username, '회원')
    into actor_name
    from public.otmember member
    where member.id = target_recipient_member_id;

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

  return query
  select room.id, room.status, room.requester_member_id, room.recipient_member_id, room.requested_at, room.activated_at, room.ended_at, room.updated_at
  from public.chat_rooms room
  where room.id = target_room_id;
end;
$$;

grant execute on function public.accept_one_to_one_chat(uuid, uuid) to authenticated;

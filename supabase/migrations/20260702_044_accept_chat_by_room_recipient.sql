-- 채팅방의 초대받은 사람이 입장하면 방 상태를 active로 전환합니다.
-- 프론트에서 회원 id를 넘기지 않고, DB가 room.recipient_member_id와 현재 auth를 직접 검증합니다.

create or replace function public.accept_one_to_one_chat(target_room_id uuid)
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
  accepted_room public.chat_rooms%rowtype;
  actor_name text;
begin
  update public.chat_rooms room
  set status = 'active',
      activated_at = coalesce(room.activated_at, now())
  where room.id = target_room_id
    and room.status = 'requested'
    and public.member_matches_auth(room.recipient_member_id)
  returning * into accepted_room;

  if accepted_room.id is not null then
    select coalesce(member.display_name, member.username, '회원')
    into actor_name
    from public.otmember member
    where member.id = accepted_room.recipient_member_id;

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

grant execute on function public.accept_one_to_one_chat(uuid) to authenticated;

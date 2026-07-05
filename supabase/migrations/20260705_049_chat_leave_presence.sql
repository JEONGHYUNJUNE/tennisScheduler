create or replace function public.leave_one_to_one_chat(target_room_id uuid)
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
    return;
  end if;

  update public.chat_rooms room
  set requester_last_seen_at = case
        when actor_member_id = room.requester_member_id then null
        else room.requester_last_seen_at
      end,
      recipient_last_seen_at = case
        when actor_member_id = room.recipient_member_id then null
        else room.recipient_last_seen_at
      end
  where room.id = target_room_id
    and room.status <> 'ended'
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);
end;
$$;

grant execute on function public.leave_one_to_one_chat(uuid) to authenticated;

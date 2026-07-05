create or replace function public.get_unread_one_to_one_chat_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with actor as (
    select public.current_otmember_id() as member_id
  )
  select count(*)::integer
  from public.chat_rooms room
  cross join actor
  where actor.member_id is not null
    and room.status <> 'ended'
    and actor.member_id in (room.requester_member_id, room.recipient_member_id)
    and (
      (
        room.status = 'requested'
        and room.recipient_member_id = actor.member_id
      )
      or (
        room.status = 'active'
        and exists (
          select 1
          from public.chat_messages message
          where message.room_id = room.id
            and message.message_type <> 'system'
            and message.sender_member_id is distinct from actor.member_id
            and message.created_at > coalesce(
              case
                when actor.member_id = room.requester_member_id then room.requester_last_read_at
                else room.recipient_last_read_at
              end,
              '-infinity'::timestamptz
            )
        )
      )
    );
$$;

grant execute on function public.get_unread_one_to_one_chat_count() to authenticated;

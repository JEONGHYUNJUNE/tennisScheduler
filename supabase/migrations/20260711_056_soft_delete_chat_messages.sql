alter table public.chat_messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_member_id uuid references public.otmember(id) on delete set null;

create index if not exists chat_messages_room_visible_created_idx
on public.chat_messages(room_id, created_at desc)
where deleted_at is null;

create or replace function public.soft_delete_chat_message(target_message_id uuid)
returns void
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

  select message.room_id
  into target_room_id
  from public.chat_messages message
  where message.id = target_message_id
    and message.sender_member_id = actor_member_id
    and message.message_type <> 'system'
    and message.deleted_at is null
    and public.is_chat_room_participant(message.room_id, actor_member_id);

  if target_room_id is null then
    raise exception '삭제할 메시지를 찾을 수 없습니다.';
  end if;

  update public.chat_messages message
  set deleted_at = now(),
      deleted_by_member_id = actor_member_id,
      body = '',
      image_path = null,
      image_name = null,
      image_mime = null
  where message.id = target_message_id;

  delete from public.chat_message_reactions reaction
  where reaction.message_id = target_message_id;

  update public.chat_rooms room
  set notice_message_id = null,
      notice_set_by_member_id = null,
      notice_set_at = null,
      updated_at = now()
  where room.id = target_room_id
    and room.notice_message_id = target_message_id;
end;
$$;

grant execute on function public.soft_delete_chat_message(uuid) to authenticated;

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
            and message.deleted_at is null
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

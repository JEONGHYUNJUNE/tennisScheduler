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
    when new.message_type = 'image'
      and (
        new.image_path like 'chat-stickers/%'
        or new.image_path like 'chat-custom-stickers/%'
      ) then '이모티콘을 보냈습니다.'
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

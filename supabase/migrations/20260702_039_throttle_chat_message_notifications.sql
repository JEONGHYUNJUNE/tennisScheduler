-- 채팅 메시지 푸시는 같은 채팅방/수신자 기준 30분에 한 번만 생성되게 제한합니다.

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

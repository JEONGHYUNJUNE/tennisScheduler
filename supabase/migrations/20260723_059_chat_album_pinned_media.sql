-- 채팅방 앨범에서 사진/동영상을 상단 고정할 수 있게 합니다.

alter table public.chat_messages
  add column if not exists media_pinned_at timestamptz;

create index if not exists chat_messages_media_pinned_idx
on public.chat_messages(room_id, media_pinned_at desc)
where media_pinned_at is not null
  and message_type in ('image', 'video')
  and deleted_at is null;

create or replace function public.set_chat_media_pinned(
  target_message_id uuid,
  should_pin boolean
)
returns table (
  id uuid,
  room_id uuid,
  sender_member_id uuid,
  message_type text,
  body text,
  image_path text,
  image_name text,
  image_mime text,
  reply_to_message_id uuid,
  media_pinned_at timestamptz,
  deleted_at timestamptz,
  deleted_by_member_id uuid,
  created_at timestamptz
)
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
    and message.message_type in ('image', 'video')
    and message.deleted_at is null
    and public.is_chat_room_participant(message.room_id, actor_member_id);

  if target_room_id is null then
    raise exception '고정할 앨범 항목을 찾을 수 없습니다.';
  end if;

  update public.chat_messages message
  set media_pinned_at = case when should_pin then now() else null end
  where message.id = target_message_id
    and message.room_id = target_room_id
    and message.message_type in ('image', 'video')
    and message.deleted_at is null;

  return query
  select message.id,
         message.room_id,
         message.sender_member_id,
         message.message_type,
         message.body,
         message.image_path,
         message.image_name,
         message.image_mime,
         message.reply_to_message_id,
         message.media_pinned_at,
         message.deleted_at,
         message.deleted_by_member_id,
         message.created_at
  from public.chat_messages message
  where message.id = target_message_id;
end;
$$;

grant execute on function public.set_chat_media_pinned(uuid, boolean) to authenticated;

create table if not exists public.chat_message_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  member_id uuid not null references public.otmember(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, member_id)
);

alter table public.chat_message_reactions
drop constraint if exists chat_message_reactions_reaction_check;

create index if not exists chat_message_reactions_member_idx
on public.chat_message_reactions(member_id, updated_at desc);

alter table public.chat_message_reactions enable row level security;

drop policy if exists "participants can read chat message reactions" on public.chat_message_reactions;
create policy "participants can read chat message reactions"
on public.chat_message_reactions for select to authenticated
using (
  exists (
    select 1
    from public.chat_messages message
    where message.id = chat_message_reactions.message_id
      and (
        public.is_chat_room_participant(message.room_id, public.current_otmember_id())
        or public.is_active_admin(auth.uid())
      )
  )
);

drop policy if exists "participants can upsert own chat message reactions" on public.chat_message_reactions;
create policy "participants can upsert own chat message reactions"
on public.chat_message_reactions for insert to authenticated
with check (
  member_id = public.current_otmember_id()
  and exists (
    select 1
    from public.chat_messages message
    where message.id = chat_message_reactions.message_id
      and message.message_type <> 'system'
      and public.is_chat_room_participant(message.room_id, public.current_otmember_id())
  )
);

drop policy if exists "participants can update own chat message reactions" on public.chat_message_reactions;
create policy "participants can update own chat message reactions"
on public.chat_message_reactions for update to authenticated
using (member_id = public.current_otmember_id())
with check (member_id = public.current_otmember_id());

drop policy if exists "participants can delete own chat message reactions" on public.chat_message_reactions;
create policy "participants can delete own chat message reactions"
on public.chat_message_reactions for delete to authenticated
using (member_id = public.current_otmember_id());

create or replace function public.set_one_to_one_chat_notice(
  target_room_id uuid,
  target_message_id uuid
)
returns table (
  id uuid,
  status text,
  requester_member_id uuid,
  recipient_member_id uuid,
  requested_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz,
  notice_message_id uuid,
  notice_set_by_member_id uuid,
  notice_set_at timestamptz,
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
  actor_name text;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = actor_member_id;

  if target_message_id is not null and not exists (
    select 1
    from public.chat_messages message
    join public.chat_rooms room on room.id = message.room_id
    where message.id = target_message_id
      and message.room_id = target_room_id
      and message.message_type <> 'system'
      and room.status <> 'ended'
      and actor_member_id in (room.requester_member_id, room.recipient_member_id)
  ) then
    raise exception '공지할 메시지를 찾을 수 없습니다.';
  end if;

  update public.chat_rooms room
  set notice_message_id = target_message_id,
      notice_set_by_member_id = case when target_message_id is null then null else actor_member_id end,
      notice_set_at = case when target_message_id is null then null else now() end
  where room.id = target_room_id
    and room.status <> 'ended'
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);

  if target_message_id is not null then
    insert into public.chat_messages (room_id, message_type, body, reply_to_message_id)
    values (
      target_room_id,
      'text',
      coalesce(actor_name, '회원') || '님이 공지로 등록했습니다.',
      target_message_id
    );
  end if;

  return query
  select room.id, room.status, room.requester_member_id, room.recipient_member_id,
         room.requested_at, room.activated_at, room.ended_at, room.updated_at,
         room.notice_message_id, room.notice_set_by_member_id, room.notice_set_at,
         room.requester_last_read_at, room.recipient_last_read_at,
         room.requester_last_seen_at, room.recipient_last_seen_at
  from public.chat_rooms room
  where room.id = target_room_id
    and actor_member_id in (room.requester_member_id, room.recipient_member_id);
end;
$$;

grant execute on function public.set_one_to_one_chat_notice(uuid, uuid) to authenticated;

create or replace function public.set_chat_message_reaction(
  target_message_id uuid,
  target_reaction text
)
returns table (
  message_id uuid,
  member_id uuid,
  reaction text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  target_room_id uuid;
  sticker_path text;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then
    raise exception '활성 회원 정보를 찾을 수 없습니다.';
  end if;

  if target_reaction is null or char_length(target_reaction) > 320 then
    raise exception '사용할 수 없는 반응입니다.';
  end if;

  select message.room_id
  into target_room_id
  from public.chat_messages message
  where message.id = target_message_id
    and message.message_type <> 'system'
    and public.is_chat_room_participant(message.room_id, actor_member_id);

  if target_room_id is null then
    raise exception '반응할 메시지를 찾을 수 없습니다.';
  end if;

  if target_reaction in ('❤️', '👍', '✅', '😄', '😮', '😢') then
    null;
  elsif target_reaction like 'sticker:chat-custom-stickers/%' then
    sticker_path := substring(target_reaction from char_length('sticker:') + 1);

    if not exists (
      select 1
      from public.chat_custom_stickers sticker
      where sticker.image_path = sticker_path
        and (
          sticker.owner_member_id = actor_member_id
          or (
            sticker.room_id = target_room_id
            and public.is_chat_room_participant(sticker.room_id, actor_member_id)
          )
        )
    ) then
      raise exception '사용할 수 없는 이모티콘 반응입니다.';
    end if;
  else
    raise exception '사용할 수 없는 반응입니다.';
  end if;

  insert into public.chat_message_reactions (message_id, member_id, reaction)
  values (target_message_id, actor_member_id, target_reaction)
  on conflict (message_id, member_id) do update
  set reaction = excluded.reaction,
      updated_at = now();

  return query
  select reaction_row.message_id, reaction_row.member_id, reaction_row.reaction,
         reaction_row.created_at, reaction_row.updated_at
  from public.chat_message_reactions reaction_row
  where reaction_row.message_id = target_message_id
    and reaction_row.member_id = actor_member_id;
end;
$$;

grant execute on function public.set_chat_message_reaction(uuid, text) to authenticated;

create or replace function public.notify_chat_message_reaction_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_record public.chat_messages%rowtype;
  actor_name text;
  preview text;
  reaction_label text;
begin
  select *
  into message_record
  from public.chat_messages message
  where message.id = new.message_id;

  if message_record.id is null
     or message_record.sender_member_id is null
     or message_record.sender_member_id = new.member_id then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
  into actor_name
  from public.otmember member
  where member.id = new.member_id;

  preview := case
    when message_record.message_type = 'image'
      and (
        message_record.image_path like 'chat-stickers/%'
        or message_record.image_path like 'chat-custom-stickers/%'
      ) then '이모티콘'
    when message_record.message_type = 'image' then '사진'
    when message_record.message_type = 'video' then '동영상'
    when char_length(message_record.body) > 10 then substring(message_record.body from 1 for 10) || '…'
    else message_record.body
  end;
  reaction_label := case
    when new.reaction like 'sticker:%' then '이모티콘'
    else new.reaction
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
    message_record.sender_member_id,
    new.member_id,
    message_record.room_id,
    'chat_message_reaction_created',
    '새 채팅 반응이 있습니다.',
    coalesce(actor_name, '회원') || '님이 "' || coalesce(preview, '메시지') || '" 말에 ' || reaction_label || ' 반응을 남겼습니다.'
  );

  return new;
end;
$$;

drop trigger if exists notify_chat_message_reaction_inserted on public.chat_message_reactions;
create trigger notify_chat_message_reaction_inserted
after insert on public.chat_message_reactions
for each row execute function public.notify_chat_message_reaction_changed();

drop trigger if exists notify_chat_message_reaction_updated on public.chat_message_reactions;
create trigger notify_chat_message_reaction_updated
after update of reaction on public.chat_message_reactions
for each row
when (old.reaction is distinct from new.reaction)
execute function public.notify_chat_message_reaction_changed();

-- Keep group-chat writes behind membership policies/RPCs, without changing 1:1 chats.
begin;
revoke all on public.group_chat_rooms, public.group_chat_members, public.group_chat_messages from anon;
revoke insert, update, delete, truncate, references, trigger on public.group_chat_rooms, public.group_chat_members from authenticated;
revoke update, delete, truncate, references, trigger on public.group_chat_messages from authenticated;
grant select on public.group_chat_rooms, public.group_chat_members to authenticated;
grant select, insert on public.group_chat_messages to authenticated;

create or replace function public.set_group_chat_message_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_member_id uuid;
begin
  actor_member_id := public.current_otmember_id();
  if actor_member_id is null then raise exception '활성 회원 정보를 찾을 수 없습니다.'; end if;
  -- System rows come from the create/leave RPCs, never the user insert policy.
  if new.message_type = 'system' then return new; end if;
  if not public.is_group_chat_member(new.room_id, actor_member_id) then
    raise exception '참여 중인 단체톡방에만 메시지를 보낼 수 있습니다.';
  end if;
  new.sender_member_id := actor_member_id;
  new.body := trim(new.body);
  if new.message_type = 'text' and char_length(new.body) = 0 then
    raise exception '메시지를 입력해 주세요.';
  end if;
  if new.message_type in ('image','video') and nullif(trim(new.image_path),'') is null then
    raise exception '첨부 파일을 찾을 수 없습니다.';
  end if;
  return new;
end;
$$;
commit;

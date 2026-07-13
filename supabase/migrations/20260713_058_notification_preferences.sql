-- 멤버별 푸시 알림 카테고리 설정을 저장합니다.
-- 브라우저/OS 푸시 권한은 기기 단위이고, 이 테이블은 서버 푸시 발송 직전에 카테고리별로 스킵할 때 사용합니다.

create table if not exists public.ot_notification_preferences (
  member_id uuid primary key references public.otmember(id) on delete cascade,
  schedule_enabled boolean not null default true,
  social_enabled boolean not null default true,
  diary_enabled boolean not null default true,
  inquiry_enabled boolean not null default true,
  chat_enabled boolean not null default true,
  general_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ot_notification_preferences enable row level security;

drop policy if exists "members can read own notification preferences" on public.ot_notification_preferences;
create policy "members can read own notification preferences"
on public.ot_notification_preferences for select to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can insert own notification preferences" on public.ot_notification_preferences;
create policy "members can insert own notification preferences"
on public.ot_notification_preferences for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can update own notification preferences" on public.ot_notification_preferences;
create policy "members can update own notification preferences"
on public.ot_notification_preferences for update to authenticated
using (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
)
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

create or replace function public.touch_ot_notification_preferences_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_ot_notification_preferences_updated_at on public.ot_notification_preferences;
create trigger touch_ot_notification_preferences_updated_at
before update on public.ot_notification_preferences
for each row execute function public.touch_ot_notification_preferences_updated_at();

create or replace function public.get_notification_category(notification_type text)
returns text
language sql
immutable
as $$
  select case
    when notification_type in (
      'attendance_created',
      'attendance_cancelled',
      'waiting_promoted',
      'event_created',
      'event_updated',
      'event_cancelled',
      'event_reminder_day_before',
      'event_reminder_today',
      'tennis_event_comment_created',
      'tennis_event_comment_reply_created',
      'tennis_event_comment_mention',
      'tennis_event_comment_liked'
    ) or notification_type like 'tennis_event_%' then 'schedule'
    when notification_type in (
      'free_opinion_created',
      'free_opinion_comment_created',
      'free_opinion_comment_reply_created',
      'free_opinion_comment_liked',
      'free_opinion_mention',
      'free_opinion_comment_mention'
    ) or notification_type like 'free_opinion_%' then 'social'
    when notification_type in (
      'tennis_diary_comment_created',
      'tennis_diary_comment_reply_created',
      'tennis_diary_liked',
      'tennis_diary_comment_liked',
      'tennis_diary_entry_mention',
      'tennis_diary_comment_mention',
      'tennis_diary_group_invited'
    ) or notification_type like 'tennis_diary_%' then 'diary'
    when notification_type in (
      'member_inquiry_created',
      'member_inquiry_replied',
      'member_inquiry_followed_up'
    ) or notification_type like 'member_inquiry_%' then 'inquiry'
    when notification_type in (
      'chat_requested',
      'chat_message_created',
      'chat_message_reaction_created'
    ) or notification_type like 'chat_%' then 'chat'
    else 'general'
  end;
$$;

create or replace function public.is_notification_category_enabled(
  target_member_id uuid,
  notification_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case public.get_notification_category(notification_type)
      when 'schedule' then preferences.schedule_enabled
      when 'social' then preferences.social_enabled
      when 'diary' then preferences.diary_enabled
      when 'inquiry' then preferences.inquiry_enabled
      when 'chat' then preferences.chat_enabled
      else preferences.general_enabled
    end,
    true
  )
  from (select target_member_id as member_id, notification_type as type) input
  left join public.ot_notification_preferences preferences
    on preferences.member_id = input.member_id;
$$;

create or replace function public.notify_tennis_diary_entry_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  target_title text := '새 다이어리가 있습니다.';
  target_message text;
begin
  if new.visibility = 'private' then
    return new;
  end if;

  select coalesce(member.display_name, member.username, '회원')
    into actor_name
  from public.otmember member
  where member.id = new.member_id;

  target_message := coalesce(actor_name, '회원') || '님이 새 다이어리를 남겼습니다.';

  if new.visibility = 'group' and new.group_id is not null then
    insert into public.ot_notifications (
      recipient_member_id,
      actor_member_id,
      tennis_diary_entry_id,
      tennis_diary_group_id,
      type,
      title,
      message
    )
    select
      group_member.member_id,
      new.member_id,
      new.id,
      new.group_id,
      'tennis_diary_entry_created',
      target_title,
      target_message
    from public.tennis_diary_group_members group_member
    join public.otmember member on member.id = group_member.member_id
    where group_member.group_id = new.group_id
      and group_member.status = 'accepted'
      and group_member.member_id <> new.member_id
      and coalesce(member.is_active, true) = true
      and public.is_notification_category_enabled(group_member.member_id, 'tennis_diary_entry_created');

    return new;
  end if;

  insert into public.ot_notifications (
    recipient_member_id,
    actor_member_id,
    tennis_diary_entry_id,
    type,
    title,
    message
  )
  select
    member.id,
    new.member_id,
    new.id,
    'tennis_diary_entry_created',
    target_title,
    target_message
  from public.otmember member
  where member.id <> new.member_id
    and coalesce(member.is_active, true) = true
    and public.is_notification_category_enabled(member.id, 'tennis_diary_entry_created');

  return new;
end;
$$;

drop trigger if exists notify_tennis_diary_entry_created on public.tennis_diary_entries;
create trigger notify_tennis_diary_entry_created
after insert on public.tennis_diary_entries
for each row execute function public.notify_tennis_diary_entry_created();

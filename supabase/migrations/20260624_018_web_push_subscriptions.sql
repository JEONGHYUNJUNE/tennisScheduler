-- Web Push 구독 정보를 저장합니다.
-- 실제 푸시 발송은 Supabase Edge Function(send-push-notification)이 담당합니다.

create table if not exists public.ot_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.otmember(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists ot_push_subscriptions_member_active_idx
on public.ot_push_subscriptions(member_id, is_active);

alter table public.ot_push_subscriptions enable row level security;

drop policy if exists "members can read own push subscriptions" on public.ot_push_subscriptions;
create policy "members can read own push subscriptions"
on public.ot_push_subscriptions for select to authenticated
using (public.member_matches_auth(member_id));

drop policy if exists "members can create own push subscriptions" on public.ot_push_subscriptions;
create policy "members can create own push subscriptions"
on public.ot_push_subscriptions for insert to authenticated
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can update own push subscriptions" on public.ot_push_subscriptions;
create policy "members can update own push subscriptions"
on public.ot_push_subscriptions for update to authenticated
using (public.member_matches_auth(member_id))
with check (
  public.member_matches_auth(member_id)
  and public.is_active_member(auth.uid())
);

drop policy if exists "members can delete own push subscriptions" on public.ot_push_subscriptions;
create policy "members can delete own push subscriptions"
on public.ot_push_subscriptions for delete to authenticated
using (public.member_matches_auth(member_id));

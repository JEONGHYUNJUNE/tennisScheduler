begin;
-- Brief private receipts preserve retry safety after non-ranking runs are deleted.
create table if not exists public.bukang_escape_receipts (
 token uuid primary key,
 response jsonb not null,
 expires_at timestamptz not null
);
alter table public.bukang_escape_receipts enable row level security;
revoke all on public.bukang_escape_receipts from anon,authenticated;
create index if not exists bukang_escape_receipts_expiry_idx on public.bukang_escape_receipts(expires_at);

create or replace function public.bukang_cleanup_records()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare ranked_deleted integer; expired_deleted integer; receipts_deleted integer;
begin
 perform pg_advisory_xact_lock(22804,20);
 with best as (
  select distinct on(lower(r.nickname)) r.id,r.duration_ms,r.registered_at
  from public.bukang_escape_runs r where r.nickname is not null and r.rules_version='harbor-hard-v1'
  order by lower(r.nickname),r.duration_ms,r.registered_at,r.id
 ), keep as (
  select id from best order by duration_ms,registered_at,id limit 20
 ) delete from public.bukang_escape_runs r where r.nickname is not null and not exists(select 1 from keep k where k.id=r.id);
 get diagnostics ranked_deleted=row_count;
 delete from public.bukang_escape_runs where nickname is null and started_at<clock_timestamp()-interval '45 minutes';
 get diagnostics expired_deleted=row_count;
 delete from public.bukang_escape_receipts where expires_at<clock_timestamp();
 get diagnostics receipts_deleted=row_count;
 return jsonb_build_object('ranking_deleted',ranked_deleted,'expired_runs_deleted',expired_deleted,'expired_receipts_deleted',receipts_deleted);
end;
$$;
revoke all on function public.bukang_cleanup_records() from public,anon,authenticated;

create or replace function public.bukang_start_run()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.bukang_escape_runs;
begin
 perform public.bukang_cleanup_records();
 insert into public.bukang_escape_runs default values returning * into r;
 return jsonb_build_object('token',r.token,'started_at',r.started_at,'rules_version',r.rules_version);
end;
$$;

create or replace function public.bukang_register_record(run_token uuid,player_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.bukang_escape_runs; clean_name text:=btrim(player_nickname); best_ms integer; place bigint; receipt jsonb; kept boolean;
begin
  perform pg_advisory_xact_lock(22804, 20);
  select response into receipt from public.bukang_escape_receipts where token=run_token and expires_at>clock_timestamp();
  if found then return receipt; end if;
  if clean_name is null or char_length(clean_name) not between 1 and 12 or clean_name !~ '^[가-힣a-zA-Z0-9_ ]+$' then raise exception 'INVALID_NICKNAME'; end if;
  select * into r from public.bukang_escape_runs where token=run_token for update;
  if not found or r.duration_ms is null then raise exception 'RUN_NOT_FINISHED'; end if;
  if r.nickname is null then
    update public.bukang_escape_runs set nickname=clean_name,registered_at=clock_timestamp() where id=r.id;
  else clean_name:=r.nickname;
  end if;
  with best as (
    select distinct on (lower(x.nickname)) x.nickname,x.duration_ms,x.registered_at,x.id
    from public.bukang_escape_runs x where x.nickname is not null and x.rules_version='harbor-hard-v1'
    order by lower(x.nickname),x.duration_ms,x.registered_at,x.id
  ), ranked as (
    select row_number() over(order by b.duration_ms,b.registered_at,b.id) as pos,b.nickname,b.duration_ms from best b
  ) select x.pos,x.duration_ms into place,best_ms from ranked x where lower(x.nickname)=lower(clean_name);
  perform public.bukang_cleanup_records();
  select exists(select 1 from public.bukang_escape_runs where id=r.id) into kept;
  receipt:=jsonb_build_object('nickname',clean_name,'rank',place,'duration_ms',r.duration_ms,'personal_best_ms',best_ms,'retained',kept,'top20',place<=20);
  insert into public.bukang_escape_receipts(token,response,expires_at) values(run_token,receipt,clock_timestamp()+interval '45 minutes');
  return receipt;
end;
$$;
select public.bukang_cleanup_records() as cleanup;
notify pgrst, 'reload schema';
commit;

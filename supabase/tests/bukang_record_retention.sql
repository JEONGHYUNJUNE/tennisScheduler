-- Always roll back fixtures and cleanup of any pre-existing rows.
begin;
do $$
declare n integer; result jsonb; test_token uuid; retry jsonb; active_token uuid;
begin
 for n in 1..25 loop
  insert into public.bukang_escape_runs(started_at,finished_at,duration_ms,nickname,registered_at)
  values(clock_timestamp()-interval '2 minutes',clock_timestamp(),15000+n,'보존검증'||n,clock_timestamp());
 end loop;
 insert into public.bukang_escape_runs(started_at,finished_at,duration_ms,nickname,registered_at)
 values(clock_timestamp()-interval '2 minutes',clock_timestamp(),16000,'보존검증1',clock_timestamp());
 insert into public.bukang_escape_runs(started_at) values(clock_timestamp()-interval '46 minutes');
 insert into public.bukang_escape_receipts values(gen_random_uuid(),'{}',clock_timestamp()-interval '1 minute');
 result:=public.bukang_start_run();active_token:=(result->>'token')::uuid;
 if (select count(*) from public.bukang_escape_runs where nickname is not null)>20 then raise exception 'TEST ranking cap failed'; end if;
 if exists(select 1 from public.bukang_escape_runs where nickname is null and started_at<clock_timestamp()-interval '45 minutes') then raise exception 'TEST expired runs remain';end if;
 if exists(select 1 from public.bukang_escape_receipts where expires_at<clock_timestamp()) then raise exception 'TEST expired receipts remain';end if;
 if not exists(select 1 from public.bukang_escape_runs where token=active_token) then raise exception 'TEST active race deleted';end if;
 -- A slow record is deleted but its response can be retried safely.
 result:=public.bukang_start_run();test_token:=(result->>'token')::uuid;
 update public.bukang_escape_runs set started_at=clock_timestamp()-interval '10 minutes' where token=test_token;
 perform public.bukang_finish_run(test_token);
 result:=public.bukang_register_record(test_token,'느린검증');
 if (result->>'top20')::boolean then raise exception 'TEST slow record qualified';end if;
 if exists(select 1 from public.bukang_escape_runs where token=test_token) then raise exception 'TEST slow record retained';end if;
 retry:=public.bukang_register_record(test_token,'다른닉네임');
 if retry<>result then raise exception 'TEST retry response changed';end if;
 -- A slower repeat of an existing nickname must preserve its best entry.
 result:=public.bukang_start_run();test_token:=(result->>'token')::uuid;
 update public.bukang_escape_runs set started_at=clock_timestamp()-interval '1 minute' where token=test_token;
 perform public.bukang_finish_run(test_token);
 result:=public.bukang_register_record(test_token,'보존검증1');
 if (result->>'personal_best_ms')::integer<>15001 then raise exception 'TEST faster personal record removed';end if;
 if (select count(*) from public.bukang_escape_runs where lower(nickname)=lower('보존검증1'))<>1 then raise exception 'TEST duplicate nickname retained';end if;
end $$;
select count(*) filter(where nickname is not null) as retained_rankings,
 count(*) filter(where nickname is null) as live_runs from public.bukang_escape_runs;
rollback;

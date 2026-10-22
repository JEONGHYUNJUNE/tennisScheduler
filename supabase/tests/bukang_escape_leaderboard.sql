-- Transactional integration checks. Always rolls back its own fixtures.
begin;
do $$
declare run jsonb; test_token uuid; result jsonb; place integer; elapsed integer;
begin
 run:=public.bukang_start_run();test_token:=(run->>'token')::uuid;
 begin perform public.bukang_finish_run(test_token);raise exception 'TEST expected early finish rejection';exception when others then if sqlerrm not like '%RUN_TOO_SHORT%' then raise;end if;end;
 update public.bukang_escape_runs set started_at=clock_timestamp()-interval '65 seconds' where bukang_escape_runs.token=test_token;
 result:=public.bukang_finish_run(test_token);elapsed:=(result->>'duration_ms')::integer;
 if elapsed<65000 or elapsed>66000 then raise exception 'TEST timing failed';end if;
 perform pg_sleep(.02);
 if public.bukang_finish_run(test_token)<>result then raise exception 'TEST finish must be idempotent';end if;
 begin perform public.bukang_register_record(test_token,'<script>');raise exception 'TEST invalid name allowed';exception when others then if sqlerrm not like '%INVALID_NICKNAME%' then raise;end if;end;
 result:=public.bukang_register_record(test_token,'순위검증');
 if (result->>'rank')::integer<1 then raise exception 'TEST rank missing';end if;
 if public.bukang_register_record(test_token,'다른이름')->>'nickname'<>'순위검증' then raise exception 'TEST duplicate registration changed nickname';end if;
 if not exists(select 1 from public.bukang_leaderboard() where nickname='순위검증') then raise exception 'TEST board missing';end if;
 run:=public.bukang_start_run();test_token:=(run->>'token')::uuid;
 update public.bukang_escape_runs set started_at=clock_timestamp()-interval '75 seconds' where bukang_escape_runs.token=test_token;
 perform public.bukang_finish_run(test_token);result:=public.bukang_register_record(test_token,'순위검증');
 if (result->>'personal_best_ms')::integer<>elapsed then raise exception 'TEST personal best replaced by slower run';end if;
 if (select count(*) from public.bukang_leaderboard() where nickname='순위검증')<>1 then raise exception 'TEST nickname appears twice';end if;
end $$;
set local role anon;
select count(*) as public_leaderboard_readable from public.bukang_leaderboard();
reset role;
rollback;

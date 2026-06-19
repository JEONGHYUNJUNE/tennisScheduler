-- 멤버 직책 컬럼 추가
-- 실행 방법: Supabase SQL Editor에서 이 파일 전체를 실행하세요.

alter table public.otmember
add column if not exists club_position text not null default '';

alter table public.otmember
drop constraint if exists otmember_club_position_check;

-- 멤버 직책을 자유 입력 값으로 관리하고, 일반 회원은 빈 문자열로 둡니다.

alter table public.otmember
add column if not exists club_position text not null default '';

alter table public.otmember
drop constraint if exists otmember_club_position_check;

alter table public.otmember
alter column club_position set default '';

update public.otmember
set club_position = ''
where club_position = '일반회원';

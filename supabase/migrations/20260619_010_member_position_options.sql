-- 멤버 직책을 정해진 선택지로 제한합니다. 일반 멤버는 빈 문자열로 둡니다.

alter table public.otmember
add column if not exists club_position text not null default '';

alter table public.otmember
drop constraint if exists otmember_club_position_check;

alter table public.otmember
alter column club_position set default '';

update public.otmember
set club_position = ''
where club_position is null
   or club_position = '일반회원';

alter table public.otmember
add constraint otmember_club_position_check
check (club_position in ('', '회장', '부회장', '총무', '경기이사'));

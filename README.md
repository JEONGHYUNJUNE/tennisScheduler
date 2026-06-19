# OT Tennis

Vite + React + Supabase 기반 테니스 일정 및 참석 관리 앱입니다.

## 로컬 환경 준비

Node.js 22 LTS를 설치하세요. macOS에서는 [Node.js 공식 다운로드](https://nodejs.org/) 또는 `nvm`을 사용할 수 있습니다.

```bash
nvm install
nvm use
npm install
cp .env.example .env
```

`.env`에 Supabase 프로젝트 값을 입력합니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_APP_URL=
```

`VITE_APP_URL`은 배포 환경에서 Google OAuth가 돌아올 주소를 고정하고 싶을 때만 입력합니다. 로컬 개발에서는 비워두면 현재 실행 중인 주소를 자동으로 사용합니다.

## Supabase 설정

현재 프로젝트는 기존 OT Tennis DB(`username`, `display_name`, `max_participants` 컬럼 사용)에 맞춰져 있습니다.

1. Supabase 프로젝트의 SQL Editor에서 아래 파일들을 순서대로 실행합니다.
   `supabase/migrations/20260616_001_apply_waiting_notifications.sql`
   `supabase/migrations/20260616_002_hide_self_attendance_notifications.sql`
   `supabase/migrations/20260616_003_enforce_active_members.sql`
   `supabase/migrations/20260616_004_block_past_event_dates.sql`
   `supabase/migrations/20260616_005_member_event_permissions.sql`
   `supabase/migrations/20260619_006_guest_attendance.sql`
   `supabase/migrations/20260619_007_google_account_linking.sql`
   `supabase/migrations/20260619_008_member_position.sql`
   `supabase/migrations/20260619_009_member_position_free_text.sql`
   `supabase/migrations/20260619_010_member_position_options.sql`
   `supabase/migrations/20260619_011_member_admin_update_policy.sql`
   `supabase/migrations/20260619_012_free_opinions.sql`
   `supabase/migrations/20260619_013_free_opinion_reads.sql`
2. Authentication > Providers > Email에서 **Confirm email**을 끕니다. 이 앱은 실제 이메일 대신 `아이디@ot-tennis.app`을 사용합니다.
3. Google 로그인도 사용할 예정이면 Authentication > Providers > Google을 활성화합니다. Google Cloud의 Authorized redirect URI에는 Supabase 콜백 주소(`https://YOUR_PROJECT.supabase.co/auth/v1/callback`)를 등록합니다.
4. Authentication > URL Configuration에서 **Site URL**을 실제 서비스 주소로 설정하고, **Redirect URLs**에 아래 주소를 추가합니다.
   `https://tennis-scheduler-cyan.vercel.app`
   `https://tennis-scheduler-cyan.vercel.app/**`
   커스텀 도메인을 연결했다면 해당 도메인도 같은 방식으로 추가합니다.
   로컬 개발용으로는 `http://localhost:5173`과 `http://localhost:5173/**`를 추가해도 됩니다.
5. 앱에서 최초 회원가입 후 SQL Editor에서 해당 회원을 관리자로 지정합니다.

```sql
update public.otmember set role = 'admin' where username = '관리자아이디';
```

이제 일반 회원도 일정 등록은 가능하고, 수정/삭제는 일정 작성자 본인 또는 관리자만 가능합니다. 관리자는 일정 상세 화면에서 게스트 참석도 직접 추가할 수 있고, Google 로그인 사용자는 첫 로그인 뒤 새 계정 가입 또는 기존 계정 연결을 선택할 수 있습니다. 멤버 직책과 이번 달 참석왕 랭킹도 제공합니다.

새 Supabase DB를 처음부터 만들 때만 `supabase/schema.sql`을 참고하세요. 지금 사용하는 기존 DB에는 `schema.sql`을 실행하지 않는 것을 권장합니다.

## 실행

```bash
npm run dev
```

프로덕션 빌드는 `npm run build`로 확인할 수 있습니다.

## Vercel 배포

Vercel 프로젝트의 Environment Variables에 아래 값을 등록합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

`VITE_APP_URL`에는 실제 접속 주소를 넣습니다.

```env
VITE_APP_URL=https://tennis-scheduler-cyan.vercel.app/
```

커스텀 도메인을 주로 쓸 거면 커스텀 도메인으로 바꿔도 됩니다.

```env
VITE_APP_URL=https://tennis-chung.app/
```

환경변수를 바꾼 뒤에는 Vercel에서 Redeploy 해야 적용됩니다.

## GitHub Pages 배포

GitHub 저장소를 만든 뒤 아래 순서로 진행합니다.

1. GitHub 저장소 Settings > Secrets and variables > Actions > Repository secrets에 값을 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. GitHub 저장소 Settings > Pages에서 Source를 **GitHub Actions**로 선택합니다.
3. 로컬에서 커밋 후 `main` 브랜치로 push하면 `.github/workflows/deploy.yml`이 자동 배포합니다.

GitHub Pages는 새로고침 시 라우팅 문제가 생길 수 있어 앱은 `HashRouter`를 사용합니다. 배포 URL은 보통 `https://계정명.github.io/저장소명/#/events` 형태입니다.

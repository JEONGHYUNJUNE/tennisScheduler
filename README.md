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
```

## Supabase 설정

현재 프로젝트는 기존 OT Tennis DB(`username`, `display_name`, `max_participants` 컬럼 사용)에 맞춰져 있습니다.

1. Supabase 프로젝트의 SQL Editor에서 `supabase/migrations/20260616_001_apply_waiting_notifications.sql` 파일 전체를 실행합니다.
2. Authentication > Providers > Email에서 **Confirm email**을 끕니다. 이 앱은 실제 이메일 대신 `아이디@ot-tennis.app`을 사용합니다.
3. 앱에서 최초 회원가입 후 SQL Editor에서 해당 회원을 관리자로 지정합니다.

```sql
update public.otmember set role = 'admin' where username = '관리자아이디';
```

새 Supabase DB를 처음부터 만들 때만 `supabase/schema.sql`을 참고하세요. 지금 사용하는 기존 DB에는 `schema.sql`을 실행하지 않는 것을 권장합니다.

## 실행

```bash
npm run dev
```

프로덕션 빌드는 `npm run build`로 확인할 수 있습니다.

## GitHub Pages 배포

GitHub 저장소를 만든 뒤 아래 순서로 진행합니다.

1. GitHub 저장소 Settings > Secrets and variables > Actions > Repository secrets에 값을 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. GitHub 저장소 Settings > Pages에서 Source를 **GitHub Actions**로 선택합니다.
3. 로컬에서 커밋 후 `main` 브랜치로 push하면 `.github/workflows/deploy.yml`이 자동 배포합니다.

GitHub Pages는 새로고침 시 라우팅 문제가 생길 수 있어 앱은 `HashRouter`를 사용합니다. 배포 URL은 보통 `https://계정명.github.io/저장소명/#/events` 형태입니다.

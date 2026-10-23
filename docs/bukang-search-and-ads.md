# 부캉이 검색 등록과 광고 연결

대표 사이트: https://bukang-chung.vercel.app/

## 준비된 내용

- 게임 홈페이지의 제목·설명, canonical, Open Graph, VideoGame JSON-LD.
- 정적 HTML 소개·조작법·FAQ: `/about.html`.
- 실제 저장 동작을 설명하는 개인정보·기록 안내: `/privacy.html`.
- `/sitemap.xml`과 `/robots.txt`. 테니스 쪽 복제 페이지도 대표 주소를 canonical로 사용.
- 광고는 소개 페이지의 독립 영역에만 준비. `site-config.js`의 `adsense.enabled`와 `approved`가 모두 true이고 유효한 게시자·광고 단위 ID가 있을 때만 광고 스크립트와 영역을 활성화한다. 기본값은 모두 비활성.
- 표시 이름·문의 이메일은 `site-config.js`의 creator/contactEmail을 입력하면 소개와 안내 페이지에 표시된다. 연락처를 지어 넣지 않는다.

## Google Search Console 등록 현황 (2026-10-23)

- URL 접두어 속성 `https://bukang-chung.vercel.app/` 등록 및 HTML 메타 태그 소유권 인증 완료.
- 인증 태그는 전용 배포 저장소 `bukang-game/src/index.html`에 유지한다. 삭제하면 인증이 해제될 수 있다.
- `https://bukang-chung.vercel.app/sitemap.xml` 제출 성공. Search Console에서 페이지 3개 발견 확인.
- 홈페이지 URL 검사: 발견됨 / 현재 색인이 생성되지 않음.
- 개별 ‘색인 생성 요청’은 Google의 ‘일일 할당량 초과’로 접수되지 않았다. Google 안내에 따라 다음 날 다시 요청 가능하다. 자동 재시도는 예약하지 않았다.
- 사이트맵 접수와 실제 검색 노출은 다르며, ‘부캉이’·‘부캉이 게임’ 검색의 노출 시점이나 순위는 보장되지 않는다.

공식 안내: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=ko

## 애드센스를 실제로 연결할 때

- 본인 애드센스 계정, 사이트 검토·승인, 실제 `ca-pub-…` 게시자 ID와 광고 단위 ID가 필요하다.
- Google이 요구하는 사이트 소유권 확인용 실제 메타 태그/코드 및 ads.txt가 있으면 그 값으로 추가한다. 가짜 게시자 ID나 ads.txt는 배포하지 않는다.
- 광고 서비스가 실제로 처리할 정보 및 필요한 이용자 선택 사항을 개인정보 안내에 먼저 반영한다. 필요한 경우 대상 지역에 맞는 동의 관리도 구성한다.
- 승인 확인 후에만 site-config.js의 광고 설정을 켠다. 게임 중 조작부, 시작 버튼, 기록 등록 버튼에는 광고를 넣지 않는다.
- 사이트 설명 페이지 및 안내 추가만으로 광고 승인을 보장하지 않는다.
공식 안내: https://support.google.com/adsense/answer/7584263?hl=ko
배치 정책: https://support.google.com/adsense/answer/1346295?hl=ko

## 검증

- `node tests/bukangSite.test.mjs`
- `node tests/bukangAssetPaths.test.mjs`
- `node tests/bukangEscape.test.mjs` (공개 기록 config 생성 후)

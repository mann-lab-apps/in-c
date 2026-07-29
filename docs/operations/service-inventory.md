# 외부 서비스 인벤토리

작성일: 2026-07-29

이 문서는 in C 운영에 연결된 외부 서비스와 책임 경계를 한곳에 모은다. 실제
콘솔 설정, 결제, secret 변경은 저장소 작업만으로 완료되지 않으며 사용자 승인과
수동 확인이 필요하다.

## 현재 서비스

| 서비스 | 용도 | 현재 상태 | 주요 설정 위치 | 운영 메모 |
| --- | --- | --- | --- | --- |
| GitHub Repository | 소스 코드, 이슈, PR, 릴리즈 기록 | 사용 중 | `mann-lab-apps/in-c` | 이슈/PR이 제품 결정과 검증 기록의 기준이다. |
| GitHub Actions | CI, 사이트 빌드, GitHub Pages artifact 생성 | 사용 중 | `.github/workflows/ci.yml`, `.github/workflows/site.yml` | `main` push와 PR 검증 기준을 분리해서 본다. |
| GitHub Pages | production 정적 사이트 hosting | 사용 중 | Repository Settings > Pages | `https://in-c.mannlab.app` 배포 대상. 서버 API나 secret 저장소로 쓰지 않는다. |
| AWS Route 53 | DNS hosted zone과 레코드 운영 | 사용 중으로 관리 | AWS Console > Route 53 | `in-c.mannlab.app`의 GitHub Pages 연결 레코드를 운영한다. 실제 authoritative NS는 콘솔에서 확인한다. |
| Gabia | 도메인 등록기관 또는 네임서버 위임 관리 | 사용 중으로 관리 | Gabia 도메인 관리 콘솔 | 도메인 소유권, 만료일, 네임서버 위임 상태를 확인한다. DNS 레코드 직접 운영 여부는 Route 53과 중복되지 않게 한다. |
| Supabase | Auth, Postgres, RLS, 향후 공개/비공개 데이터 backend | 부분 연결 | Supabase Dashboard, `site/.env.local`, GitHub Actions Variables | 프론트 Auth client/env는 준비됨. dev/prod project 분리, OAuth provider enable, migration/RLS 검증은 미완료다. |
| Google Cloud Console OAuth | Google 로그인용 OAuth client | 설정 진행 중 | Google Cloud Console > APIs & Services > Credentials | Client ID/Secret은 Supabase Google provider에 넣고, Supabase callback URL은 Google OAuth redirect URI에 등록한다. |
| Kakao Developers Auth | 카카오 로그인용 OAuth 앱 | 비즈앱 인증 대기 | Kakao Developers > 내 애플리케이션 > 카카오 로그인 | Supabase built-in provider가 `account_email`을 요청하므로 비즈앱 전환과 개인정보 동의 설정 권한 확보 전에는 실제 OAuth로 연결하지 않는다. |
| Google Analytics 4 | 공개 사이트 이벤트 관측 | 사용 중 또는 설정 가능 | `site/analytics-config.json`, GA4 Console | measurement ID가 비어 있거나 disabled이면 사이트 동작에는 영향이 없다. |
| Google Search Console | 검색 노출, sitemap, 색인 상태 확인 | 운영 후보 | Search Console | GA4와 달리 저장소 검증으로 완료할 수 없고 콘솔 수동 확인이 필요하다. |

## 인증 설정 관계

OAuth provider는 애플리케이션의 로그인 시작점과 Supabase Auth callback을 모두
알아야 한다.

| 대상 | 넣는 값 |
| --- | --- |
| Supabase Google provider | Google Cloud Console의 OAuth Client ID, Client Secret |
| Google Cloud Console OAuth client | Supabase Google provider 화면의 Callback URL |
| Supabase Kakao provider | Kakao Developers의 REST API key, Client Secret. `account_email` 권한 확보 전에는 비활성 또는 UI pending 상태로 둔다. |
| Kakao Developers redirect URI | Supabase Kakao provider 화면의 Callback URL |
| Supabase URL Configuration | `http://127.0.0.1:<port>/login.html`, `https://in-c.mannlab.app/login.html` |

Naver 로그인은 Supabase 기본 provider가 아니므로 Custom OAuth/OIDC 설정 검증 뒤
별도 이슈에서 다룬다.

## 환경 변수와 secret 원칙

- Vite public client에는 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`만
  주입한다.
- `SUPABASE_SERVICE_ROLE_KEY`, OAuth client secret, provider app secret은 정적
  사이트 번들에 들어가면 안 된다.
- 로컬 테스트 값은 `site/.env.local`에 두고 커밋하지 않는다.
- production 배포 값은 GitHub Actions Variables 또는 Secrets에 등록하되,
  dev/staging Supabase project 값을 production에 넣지 않는다.

## 수동 확인 체크리스트

- [ ] Gabia 도메인 만료일과 네임서버 위임 대상 확인.
- [ ] Route 53 hosted zone이 authoritative DNS인지 확인.
- [ ] GitHub Pages custom domain과 DNS 레코드가 일치하는지 확인.
- [ ] Supabase dev/staging project와 production project 분리 여부 확인.
- [ ] Google provider가 Supabase에서 enabled 상태인지 확인.
- [ ] Kakao는 비즈앱 전환과 `account_email` 권한 확보 전까지 OAuth 진입을 막는지 확인.
- [ ] OAuth redirect URL이 local/dev/prod 각각 등록되어 있는지 확인.
- [ ] service role key가 repository, 정적 site, Vite public env에 노출되지 않았는지 확인.

## 관련 문서

- [Hosting and Backend Strategy](hosting-and-backend-strategy.md)
- [Production Playbook](production-playbook.md)
- [Supabase Backend Plan](../product/supabase-backend-plan.md)
- [Login Account UX](../product/auth/login-account-ux.md)

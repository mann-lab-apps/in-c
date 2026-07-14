# Hosting and Backend Strategy

작성일: 2026-07-14
최근 검토: 2026-07-14

이 문서는 #311, #317, #316, #318의 1차 판단 기준을 한곳에 묶는다. 가격과 무료
한도는 서비스 정책 변경 가능성이 크므로, 실제 전환 전에는 공식 문서를 다시 확인한다.

## 결론

- 단기 production: GitHub Pages를 유지한다.
- 장기 정적 hosting 주요 후보: Cloudflare Pages.
- Next.js 또는 서버 렌더링 중심으로 전환할 때의 후보: Vercel Pro.
- Supabase는 MVP 백엔드 후보로 유지하되, 프로젝트 생성과 비용 발생 작업은 사용자
  승인 후 진행한다.
- Cloudflare Pages 이전은 아직 확정하지 않는다. 현재 결정은 "주요 후보로 올려
  비교한다"에 머문다.

## GitHub Pages 유지 조건

GitHub Pages는 현재 정적 사이트와 GitHub Actions 배포에 충분하다. 다만 공식
문서 기준으로 published site 1 GB, soft bandwidth 100 GB/month, deployment timeout
10 minutes, soft build limit 10/hour 같은 제한이 있다.

유지 조건:

- 사이트가 정적 HTML/CSS/JS 중심이다.
- 서버리스 함수, edge middleware, SSR이 필요 없다.
- 월 대역폭이 60 GB 미만이고 80 GB에 접근하면 이전 준비를 시작한다.
- 배포 artifact가 500 MB 미만이고 750 MB에 접근하면 asset 정리를 시작한다.
- 사업/결제/SaaS 성격의 민감 트랜잭션을 GitHub Pages에서 처리하지 않는다.

공식 문서:

- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Hosting 후보 비교

| 후보 | 무료/초기 한도 메모 | in C 판단 |
| --- | --- | --- |
| GitHub Pages | Published site 1 GB, soft bandwidth 100 GB/month, deployment timeout 10 minutes, soft build limit 10/hour | 지금 비용과 운영 복잡도가 가장 낮은 기본값 |
| Cloudflare Pages | Free: 1 concurrent build, 500 builds/month, 100 custom domains/project, unlimited sites/static requests/bandwidth | 정적 사이트와 custom domain 운영의 주요 이전 후보 |
| Vercel | Hobby는 non-commercial/personal use 제한, Pro는 월 $20 계열 | Next.js/full-stack 전환 시 Pro 후보 |
| Netlify | Free는 300 credits/month 기준, Pro는 월 $20 계열 | preview deploy UX가 필요하면 후보 |
| AWS Amplify | 2025-07-15 이후 신규 AWS 계정은 Free Tier credit 체계, 이후 사용량 과금 | AWS backend와 묶을 때만 검토 |

공식 문서:

- https://pages.cloudflare.com/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://www.netlify.com/pricing/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- https://aws.amazon.com/amplify/pricing/

## Frontend hosting 실행 검토

#319는 실제 이전 실행 이슈가 아니라 후보 검토 이슈다. Cloudflare Pages는 주요
후보로 올리되, 다음 질문을 통과할 때만 이전을 실행한다.

Cloudflare Pages가 적합한 경우:

- 정적 site hosting과 custom subdomain 운영을 GitHub Pages보다 더 예측 가능하게
  만들 필요가 있다.
- preview/production branch 배포와 rollback UI가 반복적으로 필요하다.
- `npm run site:build` 결과물인 `out/site`를 provider build 또는 GitHub Actions
  upload 방식으로 안정적으로 배포할 수 있다.
- 향후 Pages Functions, Workers, KV 같은 edge 확장 가능성이 실제 제품 로드맵에
  들어온다.
- bandwidth 비용 예측이 GitHub Pages나 Netlify/AWS 계열보다 중요하다.

GitHub Pages 유지가 더 적합한 경우:

- 현재처럼 정적 HTML/CSS/JS와 GitHub Actions 배포만으로 충분하다.
- custom domain, sitemap, canonical, analytics, download manifest 검증이 이미
  안정적으로 통과한다.
- Cloudflare 계정 연결, DNS 변경, Pages project 운영이 지금의 문제보다 더 큰
  운영 부담이다.
- frontend hosting보다 Supabase 백엔드, 콘텐츠, 테스트 안전망이 더 시급하다.

보류 후보 판단:

- Vercel은 Next.js, SSR, app router, edge function 중심 전환이 있을 때 다시 검토한다.
  Hobby의 non-commercial/personal 제한 때문에 서비스 성격이 커지면 Pro 기준으로 본다.
- Netlify는 deploy preview UX가 중요해질 때 다시 검토한다. credit 모델에서는
  bandwidth, production deploy, requests 사용량을 함께 계산해야 한다.
- AWS Amplify는 AWS backend와 한 번에 묶는 조직적 이유가 있을 때만 본다. 정적
  사이트 하나만 위해 도입하기에는 비용/권한/운영 복잡도가 크다.

실행 전 승인 필요 작업:

- Cloudflare Pages, Vercel, Netlify, Amplify project 생성.
- provider GitHub App/OAuth 연결.
- DNS, CNAME, nameserver, production URL 변경.
- GitHub Pages 비활성화.
- secret 또는 environment variable 등록.

현재 권장안:

- 2026-07-14 현재는 GitHub Pages를 유지한다.
- Cloudflare Pages는 장기 정적 hosting 주요 후보로 두되, 실제 이전은 preview
  deploy/rollback 필요가 반복되거나 GitHub Pages 제한에 근접할 때 실행한다.
- 이전 준비가 필요해지면 먼저 dry-run checklist와 rollback checklist를 작성하고,
  사용자의 명시 승인을 받은 뒤 project/DNS 작업을 진행한다.

## Hosting 전환 트리거

다음 중 하나가 2주 이상 반복되면 GitHub Pages 이전을 실행 이슈로 분리한다.

- 월 대역폭 예상치가 80 GB 이상이다.
- 이미지, 악보, 릴리즈 asset 때문에 published site 크기가 750 MB에 접근한다.
- preview deploy, branch deploy, rollback UI가 반복적으로 필요하다.
- 서버리스 함수, edge redirect, 인증 callback, webhook 수신이 public site와 같은
  hosting 경계에 필요하다.
- GitHub Pages 약관 또는 사용 제한이 서비스 운영 성격과 맞지 않는다.

## Supabase 무료 한도 기준

2026-07-14 공식 pricing 기준 Supabase Free plan은 다음 범위에서 MVP 검증에
충분하다.

- 2 active projects.
- Unlimited API requests.
- 50,000 monthly active users.
- 500 MB database size.
- 5 GB egress, 5 GB cached egress.
- 1 GB file storage.
- Free project는 1주 inactivity 후 paused.

Pro는 $25/month부터 시작하며 MAU, disk, egress, storage 포함량이 늘어난다.

공식 문서:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase

## Supabase 전환 트리거

무료 플랜으로 시작하되 다음 중 하나가 보이면 Pro 전환을 검토한다.

- DB가 350 MB를 넘거나 월 증가량이 100 MB 이상이다.
- 월 egress가 3 GB를 넘는다.
- Auth MAU가 25,000을 넘는다.
- inactivity pause가 운영 리스크가 된다.
- 백업, 지원, 운영 안정성 요구가 MVP 검증보다 중요해진다.

## 백엔드 1차 범위

Supabase는 처음부터 모든 기능을 맡지 않는다. 1차 범위는 공개 콘텐츠 관계를
보존하면서 계정 기반 기능을 붙일 수 있는 최소 구조다.

- 인증: 운영자/Creator/사용자 계정의 경계만 먼저 설계한다.
- 콘텐츠: works, columns, compositions, concerts, creators, classes의 관계 테이블.
- 피드백: Columns와 Concerts의 선택지 기반 비식별 응답.
- 운영: RLS는 공개 읽기와 관리자 쓰기부터 시작한다.

외부 계정에서 실행해야 하는 작업:

- Supabase organization/project 생성.
- 결제 수단 등록 또는 Pro 전환.
- production environment variable 등록.
- GitHub Pages 이외 hosting 이전.
- DNS 변경.

위 작업은 모두 별도 사용자 승인 후 진행한다.

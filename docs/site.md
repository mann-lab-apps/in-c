# 소개 및 다운로드 페이지

`site/`는 in C의 공개 소개, Columns, Compositions, 그리고 in C 앱의 Chromatics
편집 표면 다운로드 안내를 담당하는 정적 사이트다. 앱과 분리된 루트로 빌드하되
같은 저장소에서 릴리즈 정보와 문서를 함께 관리한다.

사이트의 제품 목표는 단순 다운로드 페이지가 아니라 솔직한 클래식 대화를 작게
검증하는 것이다. 사용자는 Columns에서 대화의 질문을 만나고, Compositions에서
작품과 악보를 확인하며, 필요하면 Chromatics로 MusicXML을 열어 직접 수정하거나
Chromatics 화면에서 PDF로 변환한다. 저품질 정적 PDF를 기본 다운로드로 앞세우지 않는다.

## 사이트 영역

- Columns: 클래식 감상, 작품, 형식, 장르, 악기, 공연 문화에 관한 핵심 콘텐츠.
- Compositions: 저작권 상태가 확인된 단선율 악보 라이브러리와 작품 탐색 입구.
- 공연 배너: 별도 탭이 아니라 홈/작품 흐름 안에서 노출되는 홍보 배너와 등록 후보 UI.
- Community: 감상 질문, 학습 후보, 향후 대화 흐름을 작품과 Columns 관계 안에 모으는 영역.
- Chromatics: in C 안에서 MusicXML과 단선율 사보를 담당하는 무료 창작/편집 표면.
- 클래스 내용은 Community 안에서 먼저 검증하고, 양이 많아지면 하위 탭으로 분리한다.

사이트 문구가 Chromatics 단독 제품처럼 흐르지 않도록
[`docs/brand/site-product-language-audit.md`](brand/site-product-language-audit.md)의
감사 기준을 함께 본다. 베타 모집과 첫 30명 성공 지표는
[`docs/product/beta-recruiting-scope.md`](product/beta-recruiting-scope.md)와
[`docs/product/beta-success-metrics.md`](product/beta-success-metrics.md)를 기준으로
사이트 노출 범위를 결정한다.

## Navigation

공통 header는 `Columns`, `Compositions`, `Community`, `앱 다운로드`
순서로 노출한다. 공연 홍보는 별도 상단 탭이 아니라 홈의 배너 슬롯과
작품 상세의 배너 후보 관계로 먼저 검증한다.

Compositions와 Community 페이지는 `site/product-data.js`를 공유한다. Supabase
연동 전까지는 이 파일과 `site/compositions-catalog.json`, `site/columns-data.js`가
공개 콘텐츠의 source of truth다.

첫 화면은 Chromatics 단독 다운로드 페이지처럼 보이지 않게 in C의 읽기와 악보
탐색 흐름을 먼저 설명한다. Chromatics는 in C의 악보 창작/편집 표면으로 표시하고,
Columns와 Compositions 동선이 첫 화면 CTA에서 바로 보이게 한다.

## 실행

```bash
npm run site:dev
npm run site:build
npm run test:components
npm run verify:analytics
npm run verify:site-content
npm run verify:site-seo
npm run verify:site-production
```

빌드 결과는 `out/site`에 생성된다.

`verify:analytics`는 `site/analytics-config.json`, 실제 사이트 이벤트, 문서화된
이벤트 목록, 개인정보 파라미터 guard를 네트워크 없이 확인한다.

`verify:site-content`는 사이트 빌드 산출물의 다운로드 manifest 포함 여부,
Compositions MusicXML/Chromatics asset, 작품/공연 배너/Community 관계를
확인한다.

`test:components`는 jsdom에서 앱 셸을 렌더링해 시작 화면, toolbar, 재생 컨트롤,
한국어 UI 용어가 기본 상태에서 노출되는지 확인한다.

`verify:site-seo`는 정적 HTML의 canonical, Open Graph, Twitter card,
sitemap, robots, social preview 이미지 파일을 공식 도메인 기준으로 확인한다.

`verify:site-production`은 `https://in-c.mannlab.app`의 주요 페이지, sitemap,
robots, 다운로드 manifest, GitHub Pages fallback redirect, TLS 인증서를 확인하는
배포 후 smoke test다. 다른 도메인을 임시로 확인할 때는 `PRODUCTION_SITE_URL`을
지정한다.

프로덕션 운영 절차는 [`docs/operations/production-playbook.md`](operations/production-playbook.md)에
정리한다. 배포 후에는 해당 플레이북의 15분 장애 판단 절차를 먼저 수행하고,
문제가 있으면 GitHub issue에 영향 범위, 확인 명령, 롤백 여부를 남긴다.

## 다운로드 데이터

페이지는 `site/download-manifest.json`을 읽어 운영체제별 다운로드 카드를
그린다. 첫 GitHub Release가 아직 없으면 각 플랫폼은 `available: false`를
유지하고 GitHub Releases 목록으로만 안내한다.

첫 prerelease가 게시되면 다음 항목을 실제 산출물에 맞춰 갱신한다.

- `releaseDate`
- `releasePublished`
- 각 플랫폼의 `available`, `size`, `url`
- `checksumsUrl`

존재하지 않는 설치 파일 URL을 먼저 노출하지 않는다.

## GitHub Pages

`.github/workflows/site.yml`은 pull request에서 사이트 빌드를 검증하고,
`main` push 또는 수동 실행에서 GitHub Pages artifact를 배포한다. 저장소
Settings > Pages에서 배포 source를 GitHub Actions로 설정해야 한다.

## Google Analytics

`site/analytics-config.json`에서 GA4를 켠다.

```json
{
  "provider": "ga4",
  "measurementId": "G-XXXXXXXXXX",
  "enabled": true
}
```

`measurementId`가 비어 있거나 `enabled`가 `false`이면 트래킹은 아무 동작도
하지 않는다. 페이지 렌더링과 다운로드 링크 이동을 막지 않는다.

GA는 KPI를 강요하기 위한 도구가 아니라 무슨 일이 일어났는지 발견하고 다음 질문을
만들기 위한 도구다. 예를 들어 어떤 Columns가 끝까지 읽히는지, 어떤 악보에서
Chromatics 열기와 MusicXML fallback 중 무엇이 선택되는지, 악보에서 Columns로
이동하는 사용자가 있는지 확인한다.

수집 이벤트와 네이밍 규칙은
[`docs/product/analytics-events.md`](product/analytics-events.md)에 정리한다.
개인 식별자, 쿠키 외 추가 사용자 속성, 앱 내부 사용 행동은 이 사이트 트래킹
범위에 포함하지 않는다.

GA4 콘솔에서 운영자가 직접 처리해야 하는 주요 이벤트 지정, event-scoped 맞춤
정의, Search Console 연결, Explore funnel 구성은
[`docs/product/analytics-operations.md`](product/analytics-operations.md)에
따른다. 콘솔 접근이 필요한 항목은 저장소 검증 스크립트로 완료할 수 없으므로
운영 메모에 수동 확인 결과를 남긴다.

공개 사용자 고지는 [`site/privacy.html`](../site/privacy.html)에 둔다. 현재
공개 사이트는 analytics 이벤트, 선택지 기반 피드백, GitHub issue 제보 경로만
안내하며, 계정·결제·커뮤니티 기능 전에는 별도 약관과 개인정보 처리방침을 다시
정리한다.

운영 중 GA를 끄려면 `site/analytics-config.json`의 `enabled`를 `false`로 바꾼다.
빈 measurement ID, `G-` 형식이 아닌 measurement ID, config fetch 실패는 모두
트래킹 비활성으로 처리되어야 하며 사이트 렌더링과 링크 이동을 막지 않는다.

배포 후에는 GA4 Realtime 또는 DebugView에서 다음을 한 번씩 확인한다.

- 첫 페이지 조회가 들어오는지.
- 랜딩 다운로드 클릭이 `download_primary` 또는 `download_platform`으로 잡히는지.
- Columns 선택과 끝까지 읽기가 `column_view`, `column_read_complete`로 잡히는지.
- Compositions 상세, Chromatics 열기, MusicXML fallback이 각각
  `composition_view`, `open_in_chromatics`, `composition_download`로 잡히는지.
- GitHub Releases, checksum, issue 링크가 위치 정보와 함께 잡히는지.

# 소개 및 다운로드 페이지

`site/`는 in C의 공개 소개, Columns, Compositions, Chromatics 다운로드 안내를
담당하는 정적 사이트다. 앱과 분리된 루트로 빌드하되 같은 저장소에서 릴리즈 정보와
문서를 함께 관리한다.

사이트의 제품 목표는 단순 다운로드 페이지가 아니라 솔직한 클래식 대화를 작게
검증하는 것이다. 사용자는 Columns에서 대화의 질문을 만나고, Compositions에서
작품과 악보를 확인하며, 필요하면 Chromatics로 MusicXML을 열어 직접 수정하거나
Chromatics 화면에서 PDF로 변환한다. 저품질 정적 PDF를 기본 다운로드로 앞세우지 않는다.

## 사이트 영역

- Columns: 클래식 감상, 작품, 형식, 장르, 악기, 공연 문화에 관한 핵심 콘텐츠.
- Compositions: 저작권 상태가 확인된 단선율 악보 라이브러리와 작품 탐색 입구.
- Concerts: 공연 전에 들을 지점을 보여주는 프리뷰 영역. 상세 페이지 전에는 홈의 제품군 지도에 연결한다.
- Creators: 작곡가, 연주자, 기획자를 작품과 콘텐츠로 연결하는 영역. 상세 페이지 전에는 홈의 제품군 지도에 연결한다.
- Classes: 감상 클래스와 레슨을 작품, Columns, Creator와 연결하는 영역. 상세 페이지 전에는 홈의 제품군 지도에 연결한다.
- Chromatics 앱: in C 전체가 아니라 MusicXML과 단선율 사보를 담당하는 무료 창작 도구.
- 향후 Concerts, Creators, Classes, Communities/Connects로 확장할 수 있는 관계 구조.

## Navigation

공통 header는 `Columns`, `Compositions`, `Concerts`, `Creators`, `Classes`,
`Chromatics 앱` 순서로 노출한다. 아직 독립 페이지가 없는 제품 표면은
`index.html#product-map`으로 연결해 404를 만들지 않는다.

첫 화면은 Chromatics 단독 다운로드 페이지처럼 보이지 않게 `in C` 제품군을 먼저
설명한다. Chromatics는 다운로드 가능한 앱이자 창작 표면으로 표시하고, Columns와
Compositions 동선이 첫 화면 CTA에서 바로 보이게 한다.

## 실행

```bash
npm run site:dev
npm run site:build
npm run verify:analytics
npm run verify:site-seo
npm run verify:site-production
```

빌드 결과는 `out/site`에 생성된다.

`verify:analytics`는 `site/analytics-config.json`, 실제 사이트 이벤트, 문서화된
이벤트 목록, 개인정보 파라미터 guard를 네트워크 없이 확인한다.

`verify:site-seo`는 정적 HTML의 canonical, Open Graph, Twitter card,
sitemap, robots, social preview 이미지 파일을 공식 도메인 기준으로 확인한다.

`verify:site-production`은 `https://in-c.mannlab.app`의 주요 페이지, sitemap,
robots, 다운로드 manifest, GitHub Pages fallback redirect, TLS 인증서를 확인하는
배포 후 smoke test다. 다른 도메인을 임시로 확인할 때는 `PRODUCTION_SITE_URL`을
지정한다.

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

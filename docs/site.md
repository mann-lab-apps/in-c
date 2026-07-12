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
- Download: Chromatics prerelease 설치와 체크섬 안내.
- 향후 Concerts, Creators, Classes, Communities/Connects로 확장할 수 있는 관계 구조.

## 실행

```bash
npm run site:dev
npm run site:build
```

빌드 결과는 `out/site`에 생성된다.

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

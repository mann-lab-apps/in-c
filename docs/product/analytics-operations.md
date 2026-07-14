# GA4 운영 체크리스트

이 문서는 `https://in-c.mannlab.app` 공개 사이트의 GA4 콘솔 설정과 배포 후
실시간 검증 절차를 정리한다. 저장소 코드가 수집 이벤트를 보장하더라도, 주요
이벤트 지정, 맞춤 정의, Search Console 연결, Explore 구성은 GA4 콘솔에서
운영자가 직접 확인해야 한다.

## 기본 속성

- GA4 measurement ID: `G-ZDBEX1JTKM`
- Web stream URL: `https://in-c.mannlab.app`
- 로컬 코드 검증: `npm run verify:analytics`
- 이벤트 사양: [`docs/product/analytics-events.md`](analytics-events.md)
- 공개 고지: [`site/privacy.html`](../../site/privacy.html)

## 배포 후 15분 실시간 확인

1. 시크릿 창 또는 모바일 네트워크에서 `https://in-c.mannlab.app`에 접속한다.
2. GA4 Realtime에서 접속자가 표시되는지 확인한다.
3. 홈에서 다운로드 CTA를 누르고 `download_primary` 또는 `download_platform`을 확인한다.
4. `columns.html`에서 칼럼을 열고 본문 끝까지 내려 `column_view`,
   `column_read_complete`, `feedback_open`, `feedback_submit` 중 가능한 이벤트를
   확인한다.
5. `compositions.html`에서 악보 상세를 열고 Chromatics 열기와 MusicXML fallback을
   각각 한 번 수행해 `composition_view`, `open_in_chromatics`,
   `composition_download`를 확인한다.
6. 이벤트가 보이지 않으면 `site/analytics-config.json`의 `enabled`,
   `measurementId`, 브라우저 네트워크 차단, GA4 Realtime 지연을 순서대로 확인한다.

## 주요 이벤트 지정

GA4 Admin의 Events 또는 Key events 화면에서 다음 이벤트를 주요 이벤트로 지정한다.
Google 문서 기준으로 GA4에서는 수집된 이벤트를 key event로 표시해 중요한 행동을
별도로 집계할 수 있다.

- `download_primary`
- `download_platform`
- `open_in_chromatics`
- `composition_download`
- `feedback_submit`

이벤트가 아직 목록에 없다면 먼저 프로덕션에서 해당 행동을 한 번 발생시킨 뒤 다시
확인한다.

## Event-scoped 맞춤 정의

GA4 Admin > Data display > Custom definitions에서 다음 custom dimension을
event scope로 등록한다. Google 문서 기준으로 event-scoped custom dimension은
custom event parameter를 보고서와 Explore에서 분석할 수 있게 해준다.

| Parameter | Dimension name | 목적 |
| --- | --- | --- |
| `content_type` | Content type | Columns, Compositions 등 콘텐츠 표면 구분 |
| `content_slug` | Content slug | 개별 칼럼/악보 식별 |
| `content_title` | Content title | 운영자가 읽을 수 있는 공개 제목 |
| `category` | Category | Columns 카테고리 |
| `reading_minutes` | Reading minutes | 칼럼 길이 비교 |
| `difficulty` | Difficulty | 악보 난이도 |
| `key` | Key | 악보 조성 |
| `meter` | Meter | 악보 박자 |
| `platform` | Platform | 다운로드 운영체제 |
| `file_name` | File name | 다운로드 파일 식별 |
| `location` | Location | 클릭 위치 |
| `answer` | Feedback answer | 미리 정의된 피드백 선택지 |

`link_url`, `link_text`는 링크별 cardinality가 높아질 수 있으므로 기본 맞춤 정의에는
넣지 않는다. 특정 외부 링크 운영 분석이 필요해질 때만 별도로 등록한다.

## Search Console 연결

Search Console property가 준비되면 GA4 Admin에서 Search Console link를 만든다.
연결 후에는 검색어, 노출, 클릭, 랜딩 페이지를 GA4/Looker Studio와 함께 보되,
초기 표본이 작을 때는 순위 최적화보다 색인 오류와 깨진 랜딩 페이지 확인을 우선한다.

수동 확인 항목:

- Search Console에서 `https://in-c.mannlab.app` property가 검증되어 있는가.
- GA4 property에서 Search Console link가 생성되어 있는가.
- `site/public/sitemap.xml`이 Search Console에 제출되어 있는가.
- 색인 제외나 404가 새 배포 직후 늘어나지 않았는가.

## 초기 Explore 구성

작은 숫자를 과하게 해석하지 않기 위해 funnel은 세 개만 만든다.

- 홈 → 다운로드: `page_view`(`/index.html` 또는 `/`) → `download_primary` 또는
  `download_platform`
- Columns 읽기 → 피드백: `column_view` → `column_read_complete` →
  `feedback_submit`
- Compositions → 창작 도구: `composition_view` → `open_in_chromatics` 또는
  `composition_download`

각 funnel은 7일 단위로 확인한다. 활성 사용자가 30명 미만이면 전환율 대신 이벤트가
0으로 떨어지는지, 특정 링크가 깨졌는지, 유입 경로가 갑자기 바뀌었는지만 본다.

## 내부 접속과 노이즈

초기에는 내부 접속 제외를 과하게 설정하지 않는다. 실제 사용자가 적을 때 내부
테스트가 지표를 흔들 수 있으므로, 배포 직후 검증 세션은 운영 메모에 남긴다.
반복적인 내부 QA가 많아지면 GA4 data filter 또는 비교 가능한 별도 운영 표식을
검토한다.

## 공식 참고 문서

- GA4 key events: https://support.google.com/analytics/answer/9267568
- GA4 custom dimensions and metrics: https://support.google.com/analytics/answer/14240153
- GA4 DebugView: https://support.google.com/analytics/answer/7201382
- Search Console with Google Analytics: https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console

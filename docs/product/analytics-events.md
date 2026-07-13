# Analytics Events

사이트 분석은 트래픽 숫자보다 다음 제품 질문을 만들기 위한 최소 이벤트만 수집한다.
개인 식별자, 앱 내부 편집 행동, 과도한 사용자 속성은 수집하지 않는다.

GA는 결론을 내려주는 도구가 아니다. 무슨 일이 일어났는지를 발견하고, 다음 질문을
만들기 위한 레이더다. 숫자가 사용자 목소리를 대체하지 않는다.

예를 들어 특정 Columns 체류 시간이 길거나, Chromatics 열기보다 MusicXML 다운로드가 많거나,
작품 페이지에서 공연 페이지 이동이 많다면 곧바로 정답으로 해석하지 않는다.
대신 왜 그런 행동이 일어났는지, 어떤 사용자에게 직접 물어봐야 하는지, 어떤
피드백 질문을 추가해야 하는지 결정한다.

## Naming Rules

- 이벤트 이름은 `area_action` 형태의 snake_case를 사용한다.
- 콘텐츠 이벤트는 `content_type`, `content_slug`, `content_title`을 우선 사용한다.
- 클릭 위치는 `location`으로 표현한다.
- 다운로드 파일 구분은 `file_name` 또는 `file_type` 역할의 값을 `file_name`에 담는다.
- URL은 사용자가 직접 클릭한 외부/다운로드 링크에서만 `link_url`로 보낸다.

## Implemented Events

| Event | Trigger | Key Params | Product Question |
| --- | --- | --- | --- |
| `column_view` | Columns에서 칼럼이 렌더링될 때 | `content_type`, `content_slug`, `content_title`, `category`, `reading_minutes` | 어떤 주제의 칼럼이 실제로 선택되는가 |
| `column_read_complete` | 칼럼 본문 끝에 도달했을 때 | `content_type`, `content_slug`, `content_title`, `category`, `reading_minutes` | 끝까지 읽히는 칼럼의 길이와 주제는 무엇인가 |
| `column_link` | Compositions 상세에서 관련 Columns 링크 클릭 | `content_type`, `content_slug`, `link_url`, `link_text` | 악보에서 읽기 콘텐츠로 넘어가는 흐름이 있는가 |
| `composition_view` | Compositions 상세가 렌더링될 때 | `content_type`, `content_slug`, `content_title`, `difficulty`, `key`, `meter` | 어떤 악보가 실제 관심을 받는가 |
| `composition_select` | Compositions 목록에서 상세 보기 클릭 | `content_type`, `content_slug`, `link_url`, `link_text` | 목록에서 어떤 악보를 눌러보는가 |
| `composition_download` | MusicXML fallback 다운로드 클릭 | `content_type`, `content_slug`, `file_name`, `link_url`, `link_text` | Chromatics 열기가 어려운 사용자가 fallback을 쓰는가 |
| `download_primary` | 랜딩 첫 화면 기본 다운로드 클릭 | `platform`, `file_name`, `location`, `link_url`, `link_text` | 사용자의 운영체제 추정과 기본 다운로드가 맞는가 |
| `download_platform` | 운영체제별 다운로드 카드 클릭 | `platform`, `file_name`, `link_url`, `link_text` | 플랫폼별 다운로드 수요가 어떻게 나뉘는가 |
| `release_link` | GitHub Releases 링크 클릭 | `location`, `link_url`, `link_text` | 직접 릴리즈 페이지로 이동하는 사용자가 있는가 |
| `checksum_link` | 체크섬 링크 클릭 | `location`, `link_url`, `link_text` | 설치 전 검증 문구가 실제 행동으로 이어지는가 |
| `github_link` | GitHub 저장소 링크 클릭 | `location`, `link_url`, `link_text` | 개발/소스 확인 의도가 있는 사용자가 있는가 |
| `github_issue_link` | GitHub 이슈 제보 링크 클릭 | `location`, `link_url`, `link_text` | 피드백 진입점이 사용되는가 |

## Deferred Events

| Event Candidate | Reason |
| --- | --- |
| `column_search` | 검색 UI가 아직 없다. 검색 기능을 추가할 때 검색어를 원문 그대로 저장할지, 정규화할지 먼저 결정한다. |
| `work_page_view` | 작품 페이지 구조가 아직 없다. 작품 ID, 작곡가, 저작권 상태, 관련 악보를 함께 보낼지 결정해야 한다. |
| `score_preview` | 웹 악보 미리보기 UX가 반복되면 추가한다. 미리보기와 다운로드 사이 전환을 보기 위한 이벤트다. |
| `open_in_chromatics` | Chromatics deep link 또는 앱 열기 흐름을 붙일 때 추가한다. PDF가 필요한 사용자는 이 흐름에서 직접 변환하도록 안내한다. |
| `performance_link` | 공연 페이지가 아직 없다. 외부 공연 페이지 이동 기능을 만들 때 `performance_id` 또는 외부 URL 정책을 정한다. |
| `feedback_open` | 피드백 UI가 아직 없다. 어떤 질문을 던질지 먼저 정한다. |
| `feedback_submit` | 정성 피드백 수집 UI가 생긴 뒤 추가한다. 개인 식별 정보를 받지 않도록 설계한다. |
| `session_duration` | GA4의 engagement 이벤트와 중복된다. 별도 체류 시간 계산은 Columns 품질 판단에 부족함이 확인된 뒤 추가한다. |

## Community And Promotion Events

커뮤니티와 홍보 기능은 계정 기반 행동이 생기더라도 개인식별 정보를 이벤트
payload에 직접 넣지 않는다. API 내부 사용자 ID가 필요하면 분석 저장소에서
해시 또는 익명 세션 기준으로 분리한다.

| Event | Trigger | Key Params | Product Question |
| --- | --- | --- | --- |
| `score_post_view` | 공개 악보 게시물 상세가 렌더링될 때 | `score_post_id`, `source_work_id`, `visibility`, `difficulty` | 어떤 악보 게시물이 발견되는가 |
| `score_post_open` | Chromatics 또는 웹 편집기에서 열기 클릭 | `score_post_id`, `open_target`, `location` | 다운로드보다 열기 흐름이 쓰이는가 |
| `score_post_download` | MusicXML/PDF 다운로드 클릭 | `score_post_id`, `file_type`, `location` | 어떤 파일 형식 수요가 있는가 |
| `score_post_share` | 공유 링크 복사 또는 공유 버튼 클릭 | `score_post_id`, `share_target` | 공유 가능한 악보가 늘고 있는가 |
| `score_post_bookmark` | 북마크 저장 또는 해제 | `score_post_id`, `action` | 다시 볼 악보로 저장되는가 |
| `promotion_impression` | 홍보 카드나 배너 노출 | `promotion_id`, `placement`, `promotion_type` | 어떤 placement가 실제 노출되는가 |
| `promotion_click` | 홍보 CTA 클릭 | `promotion_id`, `placement`, `promotion_type`, `target_type` | 홍보 노출이 행동으로 이어지는가 |
| `promotion_checkout_start` | 유료 홍보 결제 시작 | `promotion_id`, `plan_id` | 결제 전 이탈이 어디서 생기는가 |
| `promotion_payment_success` | 결제 성공 webhook 또는 성공 화면 | `promotion_id`, `plan_id`, `provider` | 유료 홍보 구매가 완료되는가 |
| `promotion_refund` | 환불 완료 | `promotion_id`, `reason` | 환불 사유가 반복되는가 |

## Dashboard Requirements

운영 대시보드는 실시간 숫자보다 검증 질문에 답하는 집계 화면을 우선한다.

- 악보: 조회, 열기, 다운로드, 공유, 북마크 전환율
- 홍보: placement별 노출, 클릭, 결제 시작, 결제 완료, 환불
- 검수: 대기 건수, 평균 처리 시간, 반려 사유 상위 항목
- 콘텐츠: Columns에서 작품/악보/공연으로 이동한 비율
- 피드백: 질문별 응답 수와 비식별 텍스트 검토 큐

첫 구현은 GA4와 API 집계 로그를 병행할 수 있지만, 결제와 검수처럼 운영 판단이
필요한 이벤트는 API 서버에 감사 가능한 로그로 남긴다.

## Feedback Questions

정량 이벤트 뒤에는 정성 질문이 따라야 한다.

- 이 글을 읽고 무엇이 가장 궁금해졌나요?
- 오늘 어떤 부분이 들렸나요?
- 공연에서 기억에 남은 것은 무엇인가요?
- 반복, 악기, 멜로디, 리듬 중 무엇이 가장 잘 들렸나요?
- 이 글을 읽기 전과 후에 작품이 다르게 들렸나요?
- Chromatics에서 바로 여는 흐름과 MusicXML 다운로드 중 무엇이 더 편했나요?
- 다음에 어떤 내용을 읽고 싶나요?

## Debug Checklist

1. `site/analytics-config.json`의 `enabled`가 `true`이고 `measurementId`가 `G-`로 시작하는지 확인한다.
2. `npm run site:dev`로 사이트를 열고 GA DebugView 또는 실시간 보고서를 확인한다.
3. 랜딩 다운로드, Columns 칼럼 선택, 칼럼 끝까지 읽기, Compositions의 MusicXML fallback을 각각 한 번씩 수행한다.
4. 이벤트가 보이지 않아도 페이지 렌더링과 링크 이동이 정상이어야 한다.

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

| Event | Trigger | Key Params | GA4 확인 위치 | Privacy |
| --- | --- | --- | --- | --- |
| `column_view` | Columns에서 칼럼이 렌더링될 때 | `content_type`, `content_slug`, `content_title`, `category`, `reading_minutes` | Realtime, Events, Explore by `content_slug` | 공개 콘텐츠 메타만 전송 |
| `column_read_complete` | 칼럼 본문 끝에 도달했을 때 | `content_type`, `content_slug`, `content_title`, `category`, `reading_minutes` | Explore funnel: `column_view` → `column_read_complete` | 공개 콘텐츠 메타만 전송 |
| `global_ad_banner_click` | 전역 공연 배너 모달의 CTA 클릭 | `location`, `link_url`, `link_text` | 전역 배너 CTA 탐색 | 공개 공연 링크와 클릭 위치만 전송 |
| `community_view` | Community 게시글 상세가 렌더링될 때 | `content_type`, `content_slug`, `content_title` | Community 게시글 조회 | 공개 게시글 메타만 전송 |
| `community_create` | Community 게시글 작성 완료 | `content_type`, `content_slug`, `content_title` | 게시글 작성 전환 | 공개 게시글 메타만 전송 |
| `community_update` | Community 게시글 수정 완료 | `content_type`, `content_slug`, `content_title` | 게시글 수정 완료 | 공개 게시글 메타만 전송 |
| `community_delete` | Community 게시글 삭제 완료 | `content_type`, `content_slug`, `content_title` | 게시글 삭제 완료 | 공개 게시글 메타만 전송 |
| `community_comment_create` | Community 댓글 작성 완료 | `content_type`, `content_slug`, `content_title` | 댓글 작성 전환 | 댓글 원문과 사용자 식별자는 전송하지 않음 |
| `community_comment_update` | Community 댓글 수정 완료 | `content_type`, `content_slug`, `content_title` | 댓글 수정 완료 | 댓글 원문과 사용자 식별자는 전송하지 않음 |
| `community_comment_delete` | Community 댓글 삭제 완료 | `content_type`, `content_slug` | 댓글 삭제 완료 | 댓글 원문과 사용자 식별자는 전송하지 않음 |
| `auth_social_start` | 소셜 로그인 시작 | `platform` | 로그인 provider 선택 | provider 키만 전송 |
| `auth_social_error` | 소셜 로그인 시작 실패 | `platform` | 로그인 시작 실패율 | provider 키만 전송 |
| `auth_social_pending` | 준비 중인 소셜 provider 클릭 | `platform` | provider 추가 수요 | provider 키만 전송 |
| `auth_sign_out` | 로그인 페이지 로그아웃 완료 | 없음 | 로그아웃 사용 여부 | 사용자 식별자 전송 없음 |
| `auth_sign_out_error` | 로그인 페이지 로그아웃 실패 | 없음 | 로그아웃 오류 발생 여부 | 사용자 식별자 전송 없음 |
| `auth_signed_in` | Supabase Auth signed-in 이벤트 수신 | 없음 | 로그인 완료 여부 | 사용자 식별자 전송 없음 |
| `auth_session_error` | 로그인 페이지 세션 확인 실패 | 없음 | 세션 복구 오류 | 오류 원문과 사용자 식별자 전송 없음 |
| `auth_callback_error` | OAuth callback 오류 수신 | 없음 | OAuth callback 오류 | 오류 원문과 사용자 식별자 전송 없음 |
| `promotion_interest_submit` | 클래식 연주회 홍보 관심 등록이 저장될 때 | `role`, `recital_status`, `help_count` | 관심 등록과 역할/상황 분포 | 이름, 연락처, 비고 원문은 전송하지 않음 |
| `utility_app_request_submit` | 무료 음악 도구 제안이 저장될 때 | `role`, `category`, `frequency`, `help_count` | 어떤 반복 문제가 도구 후보로 들어오는가 | 이름, 연락처, 자유 입력 원문은 전송하지 않음 |
| `utility_metronome_link` | 무료 도구 제안 페이지에서 in C Click 링크 클릭 | `location`, `link_url`, `link_text` | 도구 제안 페이지에서 실제 공개 도구로 이동하는가 | 공개 링크와 클릭 위치만 전송 |
| `metronome_start` | in C Click 시작 버튼 또는 Space로 재생 시작 | `category`, `meter` | 무료 메트로놈이 실제 사용되는가 | BPM과 개인 연습 내용은 전송하지 않음 |
| `metronome_stop` | in C Click 정지 버튼 또는 Space로 재생 정지 | `category`, `meter` | 시작 후 조작이 이어지는가 | BPM과 개인 연습 내용은 전송하지 않음 |
| `metronome_tap_tempo` | in C Click Tap tempo 클릭 또는 T 입력 | `category` | Tap tempo가 필요한 사용자가 있는가 | 탭 간격 원문은 전송하지 않음 |
| `metronome_utility_link` | in C Click 하단에서 무료 도구 제안 링크 클릭 | `location`, `link_url`, `link_text` | 도구 사용자가 추가 제안으로 이어지는가 | 공개 링크와 클릭 위치만 전송 |
| `download_primary` | 랜딩 첫 화면 기본 다운로드 클릭 | `platform`, `file_name`, `location`, `link_url`, `link_text` | Events by `platform`, landing CTA review | 추정 플랫폼과 공개 릴리즈 URL만 전송 |
| `download_platform` | 운영체제별 다운로드 카드 클릭 | `platform`, `file_name`, `link_url`, `link_text` | Events by `platform`/`file_name` | 사용자가 누른 공개 파일 정보만 전송 |
| `checksum_link` | 체크섬 링크 클릭 | `location`, `link_url`, `link_text` | Events by `location` | 공개 체크섬 링크만 전송 |
| `github_link` | 다운로드 영역의 GitHub 링크 클릭 | `location`, `link_url`, `link_text` | Events by `location` | 공개 외부 링크만 전송 |
| `feedback_open` | Columns 피드백 UI를 열 때 | `content_type`, `content_slug`, `content_title`, `location` | Events by `content_slug` | 공개 콘텐츠 메타만 전송 |
| `feedback_submit` | Columns 피드백 선택지를 제출할 때 | `content_type`, `content_slug`, `content_title`, `answer`, `location` | Events by `answer` and `content_slug` | 미리 정의한 선택지 값만 전송 |

## in C App Local Events

클래식 디스커버리 앱의 이벤트는 GA4 전송이 아니라 local-first 상태 저장,
추천 개선, 공연 promotion reporting을 위한 내부 로그로 시작한다.

| Event | Trigger | Required Properties | Reporting Rule |
| --- | --- | --- | --- |
| `external_platform_click` | YouTube, Spotify, Apple Music, Melon 등 외부 플랫폼 이동 | `providerId`, `linkId`, `linkType`, `fallback`, `url` | direct link와 search fallback을 분리 집계한다. |
| `recommendation_click` | 추천 shelf 작품 클릭 | `shelfId` | 추천 이유와 shelf 성능을 본다. |
| `promotion_impression` | sponsored 공연 card 노출 | promotion id | 화면 rebuild로 중복 집계되지 않아야 한다. |
| `promotion_click` | sponsored 공연 card 또는 공연 상세 진입 클릭 | promotion id | 예매처 이동과 분리해서 본다. |
| `promotion_dismiss` | sponsored 공연 card 숨김 | promotion id | 이후 우선순위 하락에 사용한다. |
| `concert_save` | 공연 저장 | concert id | 저장률은 aggregate만 광고주에게 제공한다. |
| `ticket_destination_click` | 예매처 destination 이동 | `concertId`, optional `destinationId`, optional `url` | 광고주는 개인 raw event가 아니라 집계 리포트만 본다. |

## Deferred Events

| Event Candidate | Reason |
| --- | --- |
| `column_search` | 검색 UI가 아직 없다. 검색 기능을 추가할 때 검색어를 원문 그대로 저장할지, 정규화할지 먼저 결정한다. |
| `column_link` | Compositions 상세와 Columns 연결 UI를 다시 노출할 때 추가한다. |
| `composition_view` | Compositions 상세 페이지를 다시 노출할 때 추가한다. |
| `composition_select` | Compositions 목록/상세 탐색 UI를 다시 노출할 때 추가한다. |
| `composition_download` | Compositions MusicXML 다운로드 UI를 다시 노출할 때 추가한다. |
| `open_in_chromatics` | Compositions에서 Chromatics 열기 흐름을 다시 노출할 때 추가한다. |
| `work_view` | Compositions 안의 작품 상세 UI를 다시 노출할 때 추가한다. |
| `work_link` | 작품 관계 링크를 다시 노출할 때 추가한다. |
| `promotion_click` | 홈/작품 상세의 정적 배너 후보 CTA를 다시 노출할 때 추가한다. |
| `score_preview` | 웹 악보 미리보기 UX가 반복되면 추가한다. 미리보기와 다운로드 사이 전환을 보기 위한 이벤트다. |
| `performance_link` | 외부 공연 페이지 이동 기능을 만들 때 `performance_id` 또는 외부 URL 정책을 정한다. |
| `session_duration` | GA4의 engagement 이벤트와 중복된다. 별도 체류 시간 계산은 Columns 품질 판단에 부족함이 확인된 뒤 추가한다. |

## Production Dashboard

초기 대시보드는 GA4 기본 보고서와 Explore 몇 개로 충분하다. 숫자가 작을 때는
증감률보다 “어떤 질문을 더 물어야 하는가”를 우선한다. 7일 기준 활성 사용자가
30명 미만이면 전환율을 결론으로 쓰지 않고, 반복되는 경로와 깨진 링크 여부만
본다. 30-100명 구간에서는 상위 랜딩 페이지와 다운로드/Columns/Compositions
흐름을 관찰한다. 100명 이상에서만 작은 UI 문구 차이 같은 최적화를 검토한다.

매일 확인할 항목:

- Realtime: 현재 접속 국가/지역, 랜딩 페이지, 이벤트가 정상 수집되는지 확인한다.
- Acquisition: Referral, Direct, Organic Search 비중이 갑자기 바뀌었는지 본다.
- Pages and screens: `/`, `/columns.html`, `/compositions.html`, 개별 Columns의 조회를 확인한다.
- Events: `download_primary`, `download_platform`, `composition_download`,
  `open_in_chromatics`, `feedback_submit`가 비정상적으로 0인지 확인한다.

매주 확인할 질문:

주간 결과는 [`GA4 주간 운영 리뷰 노트`](ga4-weekly-review-template.md)에 기록한다.

- 사용자는 홈에서 바로 다운로드하는가, Columns/Compositions를 먼저 보는가?
- 끝까지 읽히는 Columns는 어떤 카테고리와 길이를 가지는가?
- Compositions에서 Chromatics 열기와 MusicXML 다운로드 중 어느 흐름이 더 자연스러운가?
- `feedback_submit`이 없다면 피드백 요청 위치가 너무 늦거나 무거운가?

함께 볼 보조 지표:

- Google Search Console: 검색 노출, 클릭, 검색어, 색인 오류.
- GitHub Pages 또는 GitHub repository traffic: referral source와 clone/view가 GA와 크게 어긋나는지.
- GitHub Releases: artifact 다운로드 수와 `download_*` 이벤트의 방향이 맞는지.
- GitHub Actions Site workflow: 배포 직후 트래픽 하락이 배포 실패 때문인지.

GA4 콘솔에서 직접 처리해야 하는 주요 이벤트 지정, event-scoped 맞춤 정의,
Search Console 연결, Explore funnel 구성 절차는
[`docs/product/analytics-operations.md`](analytics-operations.md)를 기준으로
운영한다. 저장소 검증은 이벤트 이름과 privacy guard를 확인하지만, GA4 콘솔의
수동 설정 완료 여부는 운영자가 Realtime, DebugView, Admin 화면에서 직접 확인해야
한다.

## Operations Guardrails

- `site/analytics-config.json`의 `enabled`를 `false`로 바꾸면 사이트 기능은 그대로
  유지되고 이벤트 전송만 멈춰야 한다.
- 빈 `measurementId` 또는 `G-` 형식이 아닌 값은 무시한다.
- 이벤트 payload에는 `email`, `name`, `phone`, `user_id`, `ip`, `address` 같은
  직접 식별자나 자유 입력 원문을 넣지 않는다.
- `site/analytics.js`의 `allowedEventParams`에 없는 파라미터는 전송하지 않는다.
- 피드백은 자유 텍스트가 아니라 미리 정의한 선택지 값만 보낸다.
- 피드백의 허용 값, 접근 범위와 향후 보관·삭제 기준은
  [피드백 데이터 계약](feedback-data-contract.md)을 따른다.
- 운영 판단은 GA 숫자만으로 확정하지 않고, 실제 사용자 인터뷰나 직접 피드백과
  함께 본다.

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

1. `npm run verify:analytics`로 config, 이벤트 문서, 코드 이벤트, privacy guard를 확인한다.
2. `site/analytics-config.json`의 `enabled`가 `true`이고 `measurementId`가 `G-`로 시작하는지 확인한다.
3. `npm run site:dev`로 사이트를 열고 GA DebugView 또는 실시간 보고서를 확인한다.
4. 랜딩 다운로드, Columns 칼럼 선택, 칼럼 끝까지 읽기, Compositions의 Chromatics 열기와 MusicXML fallback을 각각 한 번씩 수행한다.
5. 이벤트가 보이지 않아도 페이지 렌더링과 링크 이동이 정상이어야 한다.

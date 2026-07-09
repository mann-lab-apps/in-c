# Analytics Events

사이트 분석은 트래픽 숫자보다 다음 제품 질문을 만들기 위한 최소 이벤트만 수집한다. 개인 식별자, 앱 내부 편집 행동, 과도한 사용자 속성은 수집하지 않는다.

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
| `composition_download` | PDF, MusicXML, Chromatics 링크 클릭 | `content_type`, `content_slug`, `file_name`, `link_url`, `link_text` | 사용자가 어떤 파일 형태를 원하고 있는가 |
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
| `performance_link` | 공연 페이지가 아직 없다. 외부 공연 페이지 이동 기능을 만들 때 `performance_id` 또는 외부 URL 정책을 정한다. |
| `session_duration` | GA4의 engagement 이벤트와 중복된다. 별도 체류 시간 계산은 Columns 품질 판단에 부족함이 확인된 뒤 추가한다. |

## Debug Checklist

1. `site/analytics-config.json`의 `enabled`가 `true`이고 `measurementId`가 `G-`로 시작하는지 확인한다.
2. `npm run site:dev`로 사이트를 열고 GA DebugView 또는 실시간 보고서를 확인한다.
3. 랜딩 다운로드, Columns 칼럼 선택, 칼럼 끝까지 읽기, Compositions 다운로드를 각각 한 번씩 수행한다.
4. 이벤트가 보이지 않아도 페이지 렌더링과 링크 이동이 정상이어야 한다.

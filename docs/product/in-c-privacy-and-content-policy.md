# in C Privacy And Content Policy

in C는 클래식 음원 스트리밍 서비스가 아니라 작품 발견과 공연 연결을 돕는 앱이다.

## Content

- 앱은 저작권 있는 음원 파일을 직접 host, cache, download하지 않는다.
- 전체 듣기는 YouTube, Spotify, Apple Music, Melon 같은 외부 플랫폼으로 link-out한다.
- preview는 provider가 공개적으로 허용한 preview URL 또는 embed만 사용한다.
- 검증되지 않은 direct link나 preview URL은 catalog에 추가하지 않는다.
- 검색 fallback은 사용자가 외부 플랫폼에서 작품을 찾도록 돕는 링크이며 direct listen link가 아니다.
- 악보/연습 링크는 IMSLP, Clef, Chromatics 등 외부/내부 목적지로 연결하되, 권리 상태를 별도로 확인한다.

## Personal Data

- 비로그인 사용자는 local-first 상태 저장을 기본으로 한다.
- 저장 작품, reaction, 선호 플랫폼, 지역, dismissed promotion은 개인화와 반복 청취 계산에 사용된다.
- 로그인 sync를 켜는 경우 서버에는 개인화 상태와 이벤트 로그가 저장될 수 있다.
- 광고주는 개인 사용자의 원본 이벤트 로그가 아니라 집계 리포트만 확인한다.
- soft launch feedback도 제품 품질 개선과 문제 분류에 사용하며, 광고주에게 개인 raw event 형태로 제공하지 않는다.

## Advertising

- 첫 수익화 후보는 공연 정보 광고다.
- 광고는 배너가 아니라 작품/작곡가/악기/지역 맥락 안의 관련 공연 card로 노출한다.
- sponsored label은 숨기지 않는다.
- 광고 card는 첫 청취 CTA보다 위에 배치하지 않는다.
- dismiss는 사용자의 명시적 신호로 기록하고 같은 promotion의 우선순위를 낮춘다.

## Analytics

- 이벤트 로그는 제품 품질, 추천 개선, 공연 promotion reporting 목적으로 사용한다.
- 주요 이벤트는 listening moment start/complete/cancel, preview play/pause/error, save, reaction, recommendation click, promotion impression/click/dismiss, ticket destination click이다.
- 출시 직후에는 app open, Today view, external platform click, My Music view, concert detail view, feedback submit을 launch week summary로 집계한다.
- 공개 출시 전 privacy notice와 앱 스토어 데이터 수집 고지를 최신 구현에 맞춰 확인한다.

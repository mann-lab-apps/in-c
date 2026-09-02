# in C V1 Release Checklist

목표: in C를 클래식 디스커버리 + 공연 연결 앱으로 공개 V1 배포 가능한 상태까지 검증한다.

## Product

- Today에서 오늘의 작품, 30초/3분 listening moment, 저장, reaction, 외부 플랫폼 열기가 동작한다.
- `악기가 궁금함` reaction이 관심 편성으로 이어져 Discover 추천을 바꾼다.
- 외부 플랫폼 click event는 provider, link type, fallback 여부, URL을 기록한다.
- 검색 기반 플랫폼 link는 `전체 듣기`가 아니라 `검색` CTA로 표시한다.
- Work Detail에서 작품명, 원어명, 작곡가, 시대, 편성, 길이, 악장, 작품 번호, 추천 shelf가 보인다.
- Discover에서 mood, 악기, 작곡가, 시대, 입문, 공연 전 shelf가 동작한다.
- My Music에서 저장 작품, 다시 들을 작품, reaction history, 선호 플랫폼 설정이 동작한다.
- Concerts에서 관심 작품/작곡가/악기/지역 기반 공연과 sponsored 공연 card가 보인다.
- Today와 Work Detail의 sponsored 공연 card는 click event 기록 후 Concert Detail로 진입한다.
- Concert Detail에서 프로그램 작품과 예매처 destination을 확인할 수 있다.
- 공연 card는 첫 청취 CTA보다 위에 노출되지 않는다.
- Sponsored 표기는 명확하며 일반 추천 공연과 구분된다.

## Catalog

- seed catalog는 최소 50개 이상의 작품으로 smoke test를 통과한다.
- V1 운영 목표는 300개 이상, 출시 후보 확장 목표는 500-1000개로 관리한다.
- 모든 작품은 한국어명, 원어명, 작곡가, 시대, 편성, 길이, catalog number 또는 빈 값, alias, tags, listening moments, external links를 가진다.
- 모든 listening moment는 작품 길이 안의 유효한 시간 범위를 가진다.
- 외부 링크, preview URL, embed URL, score link, ticket URL은 유효한 URL이다.
- 같은 composer 안에서 같은 catalog number가 중복되지 않는다.
- alias 중복은 validation warning으로 확인한다.

## Concerts And Promotions

- KOPIS fixture/import parser가 공연 row를 ClassicalConcert shape로 변환한다.
- 공연 raw program text와 matched work ids는 분리해서 저장한다.
- promotion과 concert는 분리 모델로 관리한다.
- promotion impression/click/dismiss, concert save, ticket destination click 이벤트가 기록된다.
- promotion reporting에서 CTR, save rate, dismiss rate, ticket clicks를 확인할 수 있다.

## Tech

- local-first 상태 저장이 동작한다.
- 로그인/Supabase sync는 conflict-safe codec과 merge 정책을 통과한다.
- Admin command reducer로 external link, score link, concert program raw text, promotion create/update/pause를 처리할 수 있다.
- 실제 preview playback은 provider preview URL이 있는 경우에만 시도한다.
- 앱은 음원 파일을 직접 host/cache/download하지 않는다.

## Verification

- `flutter test`
- `flutter analyze`
- 주요 화면 smoke test: Today -> Work Detail -> 추천 확장 -> 저장 -> My Music -> Concerts -> 예매처 link-out
- 기존 Clef 악보앱 주요 흐름 smoke test

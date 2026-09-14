# in C Privacy And Content Policy

in C는 클래식 음원 스트리밍 서비스가 아니라 작품 발견과 공연 연결을 돕는 앱이다.

## Current Implementation: 2026-09-13

- 2026-09-14 추가: My Music의 `추천에서 제외`에서 작곡가별 제외/해제를 기기에 저장한다. 검색·직접 열기·기존 저장 및 감상 기록은 삭제하지 않고 새 Daily/Discover/작품 추천 후보에서 제외한다. 같은 날 이미 고른 작품은 유지한다. 제외할 작곡가를 다른 사용자에게 기본 적용하지 않는다.
- 제외 ID 목록은 개인 기록 JSON/내부 백업에 포함되며 기존 preferencesUpdatedAt 최신값 우선 병합을 따른다. 같은 시각이나 시계 역행 뒤 수정 순서가 뒤집히지 않도록 논리적 수정 시각을 증가시킨다. 원격 동기화 완료를 뜻하지 않는다.
- `오페라의 노래` 제외 설정도 같은 로컬 저장·백업·병합 범위에 포함한다. 기본값은 꺼짐이다. 검수된 오페라 성악 발췌곡에 적용하며, 합창 교향곡·오라토리오·가곡·기악 서곡까지 자동으로 확대하지 않는다. 선율 선호만으로 회피 취향을 추정하지 않는다.

- 앱 내 안내: My Music의 `개인정보와 콘텐츠`. 문서에만 있던 안내를 실제 화면에 연결했다.
- 현재 계정 동기화와 원격 이벤트 전송은 연결되어 있지 않다. Supabase placeholder는 성공을 가장하지 않고 unsupported 오류를 반환한다.
- 최근 반응 80개, 일반 이벤트 200개, 실제 테스트/추천 미리보기 관찰 100개를 기기 안에 유지한다.
- 취향 입력 24개, Daily Pick 30개, 공연 프리뷰 경로 20개, 공연 회고 80개를 최근 기록으로 유지한다. 로컬 쓰기와 병합에서 같은 한도를 적용한다.
- 서로 다른 내용이 동일한 이벤트 ID를 가진 경우 충돌 표시를 보존하고 실제 사용자 평가 근거에서는 제외한다. 모의 기록을 관찰 기록으로 자동 승격하지 않는다.
- 작품별 감상 날짜와 마지막 반응은 최근 이벤트가 정리되어도 감상지도 유지를 위해 보존한다. 날짜는 점수나 객관적인 감상 능력 인증이 아니다.
- 테스트 관찰은 참가자 코드, 응답, 메모를 포함한다. 실명/연락처를 넣지 않으며 광고주에게 원본을 제공하지 않는다.
- `observed_preview`는 모의 추천에 대한 사람의 의견이다. 실제 청취/재방문/5명 실사용 증거와 합산하지 않는다.
- 외부 링크 이벤트는 URL과 provider/linkType/fallback/surface/workId를 포함하는 이동 시도다. 재생 성공 또는 청취 완료로 간주하지 않는다.
- seed 공연은 예시임을 명시하며 예매 이동을 제공하지 않는다. 실제 공연 재고나 광고 실적으로 인정하지 않는다.
- My Music의 내 기록 관리에서 현재 기록을 JSON으로 보고 복사하거나, 확인 후 in C 기록을 삭제한다. 삭제는 이 앱의 주 기록과 내부 백업을 대상으로 하며 Clef 악보는 건드리지 않는다. 별도로 복사한 자료, 외부 서비스와 OS/다른 기기의 백업은 삭제하지 않는다.
- 삭제 전에 알림 취소를 확인한다. 디스크 삭제 의도를 먼저 기록해 중단 후 재실행에서도 삭제를 마저 처리한다. 삭제 기준 시각은 이전 snapshot의 기록 복원을 막기 위해 남긴다. 원격 계정 삭제나 OS 백업 제거가 구현됐다는 뜻은 아니다.
- 앱 내부 백업은 직전의 유효한 저장값을 보관한다. 주 저장값이 없거나 잘못되어도 백업 복구를 시도하고 최근 변경이 빠질 수 있음을 알린다. 복구 실패 시 빈 기록으로 덮어쓰지 않는다. 이는 OS 백업 검증이나 원격 동기화를 뜻하지 않는다.
- My Music의 음악 연결 확인에서 잘못 연결된 작품을 수정하거나 해제할 수 있다. 입력 원문·연결 경위·수정 시각을 보존한다. 연결 해제는 원문이나 감상 기록 전체 삭제가 아니며, 해제한 연결의 추천 근거만 제외한다.
- 아래 sync 설명은 향후 기능 정책이며, 현재 원격 연결 완료를 뜻하지 않는다. 스토어 개인정보 고지는 실제 배포 빌드 기준으로 별도 검토해야 한다.

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

## Store Disclosure

- Store metadata와 screenshot은 `docs/product/in-c-store-metadata-public-v1-draft.md`를 기준으로 준비한다.
- 스토어 문구는 in C가 음원을 직접 제공하지 않고 외부 플랫폼으로 연결한다는 점을 숨기지 않는다.
- Catalog Ops, 내부 운영 용어, fake direct link, fake preview URL은 사용자-facing 스토어 이미지에 노출하지 않는다.

## Public V1 Hotfix Triggers

- 앱 crash 또는 launch blocker
- external platform link-out flow 중단
- 저장/reaction/local-first persistence 실패
- sponsored disclosure 누락 또는 첫 청취 CTA 위 노출
- provider direct/preview URL policy 위반
- store review rejection
- onboarding 또는 Today 첫 화면 이해 실패가 반복되는 feedback

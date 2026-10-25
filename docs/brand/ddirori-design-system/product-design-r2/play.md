# Play R2 · 녹음 탐색과 재생을 분리

[기존 서비스 계약](../specifications/services/play.md)·[R1](../product-design-r1/play.md) 유지. 대상 `apps/classical_local_library/lib/main.dart`, `presentation/library_home_components.dart`, `play_library_components.dart`, `play_playback_components.dart`, 실제 local_playback/controller.

## 범위와 위계

첫 구현 P02/P03: 작품 상세 맥락 → 녹음/악장 목록 → 현재 재생/큐. 기존 라이브러리·관리·감상·랜덤 재생 경로와 검색 범위를 제거하지 않는다. R2의3탭은 작품 상세의 조합 제안이며 기존4개 home navigation을 대체하는 명령이 아니다.

- 작품: 제목24, 작곡가·작품번호14, 긴 원어는 줄바꿈/상세로 접근 유지.
- 녹음: 표시명16/600, 연주자·연도14, 정보 없음은 ‘정보 없음/연도 미상’. 연주자 정보를 지어내지 않음.
- 악장: 순번24 폭 + 제목 + 파일 가용성 + 재생48. 현재 항목은 tint+‘현재 악장’, 재생 중 여부는 engine label로 별도 표시.
- 큐: 읽기 전용 순서·현재 항목. 같은 작품/녹음 맥락은 상단 요약으로 합치되 혼합 큐에서는 row별 구분 유지. 기존 filename/fileSource 정보를 상세로 접근 가능하게 남김. 큐 클릭/이동/삭제를 새 기능으로 추가하지 않음.
- now-playing: 현재 악장·녹음·player state → play/pause/next/stop → seek → 오류/재시도. 탐색 중 선택 색과 현재 재생 표시의 의미를 혼동시키지 않는다.

레이아웃: 넓음(작업 영역800 이상) 목록+재생340px; 중간은 가용 폭에 따라 분리. 모바일은 현재 재생을 축약해 탐색 위/하단 접근 영역에 두고 상세를 펼친다. R2 시안은 상단 전체 블록으로 내용량을 검토하며 sticky mini-player는 아직 목표 설계다. 실제 구현에서는 safe area와 겹침 검증 후 적용. 큰 글자는 재생정보·버튼·시간/slider를 줄로 나누고 고정 높이 금지. 목록을 끝까지 읽을 때 조작 접근을 잃지 않게 한다.

## 상태·adapter 계약

표시 모델은 앱 내부: browsingWorkId/recordingId, queueSnapshot/currentIndex, actualPosition/duration?, seekDraft?, commandPending/failure. 공통 UI가 queue index나 model을 저장하지 않는다.

| 상태 | 행동·보존 |
| --- | --- |
| 기본·선택 | 녹음 탐색/검색/filter/theme 변경은 재생 명령0회. 실제 재생 요청만 queue/engine 변경 |
| 빈 녹음 | 파일 가져오기/연결 진입. 자동 데모 없음. 바흐는 첫 빈 상태에만 선택 사용 |
| 파일 없음 | 해당 악장 재생 불가+사유. 파일 복구는 기존 관리 경로. 다른 유효 악장까지 disabled하지 않음 |
| loading/buffering/seeking | 작업명과 진행 표시; 같은 명령 중복 방지. 실제 상태를 optimistic playing으로 덮지 않음 |
| duration unknown | ‘길이 확인 전’; slider disabled, 0% 완료로 표시 금지 |
| seek draft | drag 중 UI만 변경, pointer/keyboard 확정 시 명령1회. 엔진 업데이트는 draft를 덮지 않음. 곡 변경은 draft 폐기 |
| failure | 원인·재시도. queue/원본 파일 보존. 실제 R1 retry는 queue reload 후 첫 항목 재생 정책이므로 실패 위치 자동 복귀를 새로 넣지 않음 |
| stop/pause | 실제 engine 반환 후 상태 표시. ‘현재 악장’은 pause에서도 유효하며 ‘재생 중’으로 오독시키지 않음 |

R2 memory slider의350ms는 테스트 예제일 뿐 엔진 타이밍 규칙이 아니다. 실시간 clock·수치·버퍼는 actual snapshot. 알림은 작업 상태 변화만, 매프레임 시간 낭독 없음. renderer teardown으로 background playback을 새로 허용/중단하지 않는다.

## 구성 분류

1. 공통 가능: Item.flat/trailing(Web)·DdiroriItem(Flutter), Tabs/Choices·Search·Button·상태·진행·Slider 표시.
2. 앱 adapter: 기존 PlayWork/Recording/Movement/QueueRow, PlayNowPlayingControls, seek draft·engine sync·file recovery, responsive current strip.
3. API 제안: 새 Transport 확장은 당장 불필요. 현재 busy/error/seek semantics를 adapter에서 합성. 두 실제 소비처가 같은 계약일 때만 추가.
4. 목표: 영속적인 탐색 중 재생 strip, 녹음/악장/큐의 새 composition. 지원하지 않는 queue editing/streaming 범위 밖.

## 수용·반환

- B를 탐색하면서 A가 재생되고 position이 유지됨. 현재 표시와 선택을 스크린리더도 구분.
- seek 중 pause/error/track change 정책이 실제 엔진과 일치; 실패 후 retry의 첫 항목 재생은 문구와 테스트로 명시.
- 320/390/1024, 큰 글자200%, light/dark에서 버튼48·시간·긴 작품명 겹침 없음. metadata await/busy/draft 회귀 유지.
- 기존 R1 product tests + library/playback/management 관련 회귀. 실제 decoder/파일/권한 검수는 별도 결과와 구분.
- `deployment/apps/classical-local-library/ios-metadata.yaml`을 AGENTS대로 갱신하고 `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/classical-local-library/ios-metadata.yaml mode:check`.
- 제품 구현은 [반환 규약](shared-and-handoff.md)으로 실제 commit/diff·revision·상태별 screenshot·검사·차이·미검수를 보고.

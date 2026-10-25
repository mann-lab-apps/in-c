# Play: 작품을 찾고 내 연주를 듣기

기존 [S-PLAY](../specifications/services/play.md), [screen-contract](screen-contract.md)를 따른다. 첫 범위는 라이브러리 위계 + 현재 재생 영역. 메타데이터 dialog 계약은 이미 적용된 것을 보존한다.

## 현재 소스·책임

`apps/classical_local_library/lib/main.dart`, `presentation/library_home_components.dart`(main의 part), `play_library_components.dart`, `play_playback_components.dart`. 실제 package exports/이름과 controller 콜백을 시작 시 대조한다.

| 분류 | 구성 |
| --- | --- |
| 1 공통 재사용 | DdiroriItem/Button/Input/Banner/Progress, 검색·선택·빈 상태의 공통 형태 |
| 2 앱 adapter | PlayWorkRow/RecordingRow/MovementRow/QueueRow/AudioFileRow, PlayNowPlayingControls, 파일 권한/scan·metadata 저장·repository |
| 3 공통 검토 | 긴 재생 설명과 부가 행동이 같은 계약인 여러 소비처가 있을 때만 Transport 확장 검토 |
| 4 목표 | 관리 기능을 유지한 홈 재배치, 재생 영역 반응형·dark 개선. 제안 도식의 녹음 진입점은 미연결 |

## 정보 구조와 반응형

기본 홈: 제목·가져오기/관리 → 검색 → 작품 필터·정렬 → 작품 목록 → 현재 재생. 통계6개를 홈의 큰 카드로 반복하지 않는다. 스캔·등록 폴더·데모·정리 필요·랜덤 재생은 기존 기능을 삭제하지 않고 이름 있는 관리/재생 메뉴에서 접근 가능하게 한다. 구현 전 현재 경로→변경 경로 매핑 표를 작성한다. 중요한 파일 복구 상태는 관리 메뉴 안에 숨기지 않는다.

320–599 한 열, 재생 영역은 읽는 작품을 가리지 않게 하단 safe area/inset 확보. 큰 글자는 고정 mini-player 높이 금지; 현재 정보와 조작을 두 줄로 wrap. 태블릿은 작품/녹음과 재생의 두 영역 가능, 키보드/터치 읽기 순서 유지. 데스크톱은 라이브러리 넓이 우선, 현재 재생 패널을 과도한 큰 앨범 카드로 만들지 않는다.

작품 row는 작곡가·작품번호·녹음 수. 녹음 row는 연주자·녹음 정보, 악장은 순서·재생/파일 상태. 세 엔터티를 한 `Track`으로 합치지 않는다. 데이터 ID와 정렬 기준은 repository에 그대로 남긴다. 제목이 길면 줄바꿈, 파일 절대경로/개인정보는 주 설명으로 노출하지 않는다.

## 상태·비동기·데이터

- 기본: 현재 큐/작품/녹음/악장 정보를 실제 engine state에서 읽는다. filter·화면 이동·theme 변경이 큐를 다시 만들지 않는다.
- 빈 catalog: 첫 가져오기(바흐64), 데모 자동 seed 금지. 검색 없음은 캐릭터 없이 검색/필터 초기화.
- scan/import: 실제 task명, 분모 없으면 불확정 progress. 취소는 실제 backend 지원 범위만 노출, 단순히 UI를 닫고 작업 취소됐다고 표시하지 않는다.
- 재생 준비 중: state.isBusy 또는 commandRunning이면 중복 명령 방지. UI만 playing=true로 바꾸지 않는다. 파일/디코딩 오류는 실제 원인·복구/재시도, 이미 유효한 큐는 보존.
- duration unknown은 0% 완료가 아니다. current item·duration>0·!busy일 때 seek. 드래그 draft와 engine position 분리, drag end에 실제 명령, 실패하면 실제 position으로 복귀. 무의미한 재생 progress animation 금지.
- metadata dialog: title 아래 오류가 스크롤 밖으로 숨지 않음. 실제 await save, busy readonly/Back/취소 제어, 실패 draft 보존, 성공 뒤만 닫기·알림. theme 변경으로 draft 재생성 금지.
- unavailable: 누를 수 없는 파일 row는 사유 표시, 재연결/삭제는 별도 기존 행동. disabled 색만으로 사유 설명 금지.

## 접근성·검증

제목→검색→목록→현재 재생 순서. 작품과 secondary action 별도 accessible name. Play/Pause label을 실제 상태와 일치. 현재 악장 표시·시간은 고빈도 live announcement 금지. slider 값·단위·키보드 seek 계약 유지. 전체 화면 스크롤 시 재생 버튼 접근 가능, 터치48.

수용: `flutter analyze`, 기존 library/playback/metadata/brand pilot 관련 테스트; 320/390/1024·200%·light/dark 실제 위젯 캡처. 실제 기기의 파일 선택·권한·재생/seek/중단 후 복구는 별도 수행/미실행 표기. OS background playback/streaming/계정 기능을 새로 주장하지 않는다.

iOS 변경은 `deployment/apps/classical-local-library/ios-metadata.yaml`의 pending/reviewed false·영향 scenes/steps/assertions·release notes/manual을 AGENTS에 따라 갱신. `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/classical-local-library/ios-metadata.yaml mode:check`.

범위 밖: 오디오 엔진 교체·데이터 마이그레이션·권한 추가·앱명/런처/최종색 확정. [handoff-review](handoff-review.md)로 반환.

# Play 대기열·즐겨찾기·IMSLP 고도화

후속 로컬 구현·최종 검증은 [2026-11-11 기록](classical-local-library-music-actions-2026-11-11.md)에서 완료했다. 아래 미완료/부분 결과는 11-03 중단 시점의 역사적 기록이며 현재 검증 상태가 아니다. 새 기능은 계속 미커밋·미배포다.

기준은 기존 library-context 작업 트리의 미커밋 변경과 schema17/541테스트다. 내부0.1.0(4)는 보존하며 이번 작업은 배포하지 않는다.

| 기능 | 현재 지원 | 사용자 불편 | 이번 변경 | 증거 |
| --- | --- | --- | --- | --- |
| 곡·앨범·검색·재생목록 | 즉시 재생/저장 목록 담기 | 현재 큐를 유지하며 예약할 수 없음 | 공통 지금/바로 다음/마지막 행동 | controller/native/widget |
| 현재 큐 | 셔플/반복·읽기 전용 | 남은 곡 순서 변경·제거 불가 | 미래 occurrence만 편집, 현재/과거는 보호 | 순열/경합/native/복원 |
| 즐겨찾기 | 없음 | 목록을 만들지 않고 표시할 수 없음 | file ID 저장·조회·백업·현재 재생 동기화 | SQLite/backup/widget |
| 메뉴·뒤로 | 맥락 메뉴·완료 후 보기 | 곡 행동이 화면별로 다름 | 재생→보관→정보 순서, 저장 후 원래 화면 | widget/capture |
| 가져오기·누락 | 직접 재생·결과·파일 복구 | 외부 자료 탐색과 분리 | 기존 완료/복구 재사용, IMSLP에서 가져오기 진입 | import/IMSLP 통합 |
| IMSLP | 등록 작품 검색/연결·직접 URL 다운로드 | 작품 없는 보관함에서 탐색 불가 | 독립 검색/공식 페이지→Files 가져오기 | fixture/loopback/widget |
| IMSLP 자료 | 다운로드/등록 기반 | 검색 작품과 음원·권리/완료를 혼동 가능 | 자료 종류·단계·오류/재시도/출처 확인 | fixture/취소/등록 실패 |

수용 표의 최종 상태는 실제 실행 증거로 갱신한다. 자동 파일 수집·권리 추정·실기기 통과는 포함하지 않는다.

## 보존과 정책

- 큐 편집은 현재 이후만 허용하고 현재/과거 제거·이동을 거부한다. 일시정지·position·원본 파일·저장된 재생목록을 유지한다.
- 빈 큐 추가는 ready, 완료 큐 추가는 새 항목을 준비하고 자동 재생하지 않는다. 지금 재생은 명시적 큐 교체다.
- 셔플 중 예약은 실제 다음 순서에 반영한다. 새 occurrence의 원본 위치는 원본 끝이며 셔플 off 때 원본+추가 순서로 돌아간다. 수동 재정렬의 실제 순서는 다시 셔플하기 전까지 유지한다.
- 기존 한 곡/전체 반복·3초 이전·중복 occurrence·복원 no-autoplay·진단 소유권·interruption no-autoresume를 보존한다.
- 즐겨찾기는 file ID에 붙으며 누락 상태에도 보존하고 명시적 파일 제거/초기화에서는 함께 정리한다. 파일 재연결은 ID를 유지한다.
- IMSLP 공식 검색 결과는 음원 파일 목록이 아니다. 공식 파일 API가 확인되지 않으면 공식 페이지 확인→사용자 Files 저장→기존 가져오기를 완성한다. 외부 페이지 열기는 다운로드 완료가 아니다.

## 검증 상태

대기열 / 즐겨찾기 / IMSLP / 전체 회귀·캡처 / native / metadata: 미완료. 사용자의 2026-11-03 중단 요청으로 실행을 종료한다. 완료 판정이나 새 배포는 없다.

## 중단 체크포인트

- 대기열: 선택적 `PlaybackQueueEditor`의 enqueue(items,next:bool), removeQueueItem(index), moveQueueItem(from,to), clearUpcoming와 fake/native/직렬화 초안. 상태 isEditingQueue/queueEditError 추가. 기존 모드23테스트 통과. 신규 큐 편집·경합·rollback·native/복원 검증은 미작성이다.
- UI: 공통 곡 메뉴·앨범/재생목록 예약·미래 큐 행 편집·즐겨찾기 화면/현재 재생 조작을 main/presentation에 연결한 초안. 최신 UI 회귀는 미실행. queueEditError 표시와 편집 상태 root rebuild, 현재 곡의 file ID가 없을 때 즐겨찾기 숨김, 재생 도구 화면과 상세의 동등성, 즐겨찾기 변경/삭제/초기화/복원 후 refresh를 점검해야 한다.
- 즐겨찾기: `LocalFavoritesRepository`, Memory/Sqlite store와 additive schema18, 논리 백업/구버전 호환, 삭제/초기화 정합성 구현. 관련103테스트 통과(전체 앱 테스트 수가 아님). main 주입/뷰 통합은 추가 검증 필요하다. load(), setFavorite(id,bool), lastSaved를 제공하며 change notifier는 없다.
- IMSLP: 작품 없는 독립 검색·응답 guard·공통 UI·가져오기 callback 초안, 단계/cancel/형식 검증과 sidecar journal 추가. 기존16테스트 중14통과/2실패. 작품 등록 선행 기대와 지역 제한 자료 화면 검사를 조사해야 한다. main의 onImportLocalFiles/onShowImportedFiles/onPlayImportedFiles/onAssociateSource는 아직 연결하지 않았다. 직접 URL dialog draft/공통 컴포넌트, journal 복구 UI와 rename~journal crash 구간도 미완료다.
- 중간 flutter analyze는 컴파일 오류 없이17개 lint/warning(불필요한 nullable format fallback 등)을 보고했다. 이후 병행 변경이 있었으므로 최종 검사로 사용할 수 없다. 전체 test/analyze·fixture·native·캡처·metadata 최종 검증은 수행하지 않았다. 중단 시 git diff --check는 통과했다.
- 기준 스냅샷은 `apps/classical_local_library/build/music_actions_baseline/`에 lib/test/integration_test/tool을 보존했다. 비교용이며 되돌리기/복사 기준이 아니다. 기존 셔플·반복 완료 증거는 별도 playback-modes 기록을 보존한다.

다음 실행은 이 체크포인트와 현재 diff를 다시 읽고 실패/경합 테스트부터 보강한다. 배포·커밋·푸시·버전 증가·기존 TestFlight0.1.0(4) 변경은 하지 않는다.

2026-11-11 재개 시 임시 작업 폴더와 위 build baseline은 소실되어 Git index·기록된 편집 패치로 소스를 복구했다. 이 문서는 당시 중단 기록으로 보존하며, 현재 구현·새 검증·지속 보관 snapshot은 [11-11 후속 기록](classical-local-library-music-actions-2026-11-11.md)을 따른다. 과거 캡처/로그를 이번 증거로 재사용하지 않는다.

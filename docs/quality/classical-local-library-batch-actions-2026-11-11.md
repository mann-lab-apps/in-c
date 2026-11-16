# Play 다중 선택·대기열 재생목록 저장

2026-11-11, 지속 worktree `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-library-context-20261031`, 브랜치 `feature/ddirori-play-library-context-20261031`, 기준 HEAD `f57602c18ce55031833faabf37a073da437453b9`에서 작업했다. 원본 저장소와 다른 앱 변경을 건드리지 않았다. 이번 소스·문서는 미커밋/미배포이며 기존 TestFlight0.1.0(4)에 없다. schema18·feedback schema2·버전0.1.0+4·의존성과 공통 UI API는 그대로다.

## 구현 계약

곡/즐겨찾기의 `여러 곡 선택`은 방문별 UI 상태이며 file ID를 보관한다. 행 탭은 선택만 바꾼다. 검색 밖 선택을 개수로 안내하고 `현재 결과 모두 선택`은 생성된 행과 무관한 필터 전체 결과다. 실행 시 현재 전체 목록의 정렬 순서로 ID를 복사한다. 사라진 ID도 제외 대상으로 남겨 조용히 대상을 바꾸지 않는다. 선택은 DB에 저장하지 않는다.

재생만 큐를 교체한다. 다음/마지막 예약은 기존 controller를 사용하며 paused/current/position·셔플/반복·native 부분 편집 오류 정책을 유지한다. 재생/목록에는 가용한 지원 형식만 담고 실제 처리/제외를 안내한다. 즐겨찾기는 일시적으로 누락된 파일 ID를 보존하는 기존 정책이며 `setFavorites`가 입력 복사·직렬화·단일 저장·transaction rollback을 담당한다. 실패나 취소는 선택을 유지한다. 저장 성공 뒤 재조회 실패는 저장된 상태를 유지하고 재조회만 안내한다.

전체 재생의 `대기열을 재생목록으로 저장`은 전체/현재 곡부터를 선택한다. 대화상자를 열 때 실제 `state.queue` 순서와 현재 인덱스를 고정하고 shuffle canonical 원본과 혼동하지 않는다. 직접 ID와 클래식 링크를 보관함 file ID로 해석하며 첫 중복만 보존한다. 가용성/지원 형식/해석 불가와 중복 개수를 표시한다. 확인 직전 저장소를 다시 읽어 파일 상태가 바뀌면 저장을 거부하고 이름 draft를 유지한다. 기존 목록 순서는 보존하고 새 ID만 뒤에 붙인다. 중복 진입과 중복 저장을 막는다.

공통 Item의 선택·버튼·메뉴·Dialog/Sheet·상태/진행을 조합했다. 음악별 정책은 Play의 `library_batch.dart`와 adapter에 있다. 원본/태그·catalog·파일 링크·엔진·데이터 모델을 변경하지 않는다. modal의 취소/저장/보기는 재생 명령이 아니며 생성 후 자동 이동하지 않는다.

## 수용 항목과 증거

| 항목 | 회귀 증거 | 결과 |
| --- | --- | --- |
| ID 선택·검색 밖 개수·정렬·전체 결과/지연 행 | `library_batch_test.dart`, `library_batch_ui_test.dart`: 180곡 결과·행35개 미만 | 대상 검사 통과 |
| 선택 재생과 paused 예약 구분 | UI의 큐 실제 순서·position7초·paused/playing assertion | 대상 검사 통과 |
| batch 즐겨찾기 원자성·중복·실패·재조회 | memory 대기/입력 변경, SQLite trigger rollback/unknown ID, UI busy/선택 유지 | 대상 검사 통과 |
| 큐 snapshot 전체/남은·중복·혼합·제외 | 순수 도메인·셔플 순열·완료/빈 큐·미지원/누락 검사 | 대상 검사 통과 |
| 생성 실패 이름 유지·최종 파일 검증·취소/종료 | UI write/refresh 실패·파일 삭제·late response·중복 dialog | 대상 검사 통과 |
| 목록 순서·재시작·백업 | schema18 재연결·논리 backup round-trip | 대상 검사 통과 |
| 실제 오디오 재생 중 예약·큐 저장·SQLite 재연결 | `music_actions_flow_integration_test.dart` 새 native scenario | 최종 runner 통과 |
| 크기/글자/테마·선택 semantics·터치 | UI 320/390/1024 × 1/2x × light/dark, reduced motion, safe area | 최종12조합·두 저장 행동 hit-test·새 캡처 통과 |

## 검증과 새 산출물

최종 실행은 `build/batch_actions_final_20261111/run-FrEPlA`이며 [실제 report](evidence/play-batch-actions-20261111/report.json)는17항목 모두 passed다. [실행 로그/이미지 hash](evidence/play-batch-actions-20261111/files.sha256.json), [소스별 SHA-256](evidence/play-batch-actions-20261111/source-files.json), [환경·인계](evidence/play-batch-actions-20261111/handoff.json)를 함께 보관한다. 실행 전/후와 현재 live source fingerprint는 `e4a913630b3805d8c1bfedb221f5da4d8d4a936880e51b577dd974f3315ddb55`로 일치한다. 과거726/14/61은 비교용 이력이다.

| 실행 | 최종 결과 |
| --- | --- |
| `dart format lib test integration_test tool` 및 runner의 변경 없음 검사 | 179파일·변경0 |
| `flutter test --no-pub --reporter expanded` | 752개 통과: 기존726 + 신규26 |
| `flutter analyze` / fixture `--check` | 통과 |
| decoder signal·audio capabilities·large/stress library·large/stress search | 통과; host 성능을 물리 성능으로 표현하지 않음 |
| widget capture 대상 회귀 재실행 | 100개 통과;752에 중복 합산하지 않음 |
| iOS native library / system-scenes / music-actions / formats / background | 1 / 5 / 4 / 3 / 2 = 고유15개 통과 |
| OS 앱 전환 background runner | 실제 inactive/hidden/paused/resumed, 요청6초·큐0→3→완료12·위치 저장, 자동 검증 통과 |
| 메타데이터 Ruby / Fastlane check | 13테스트·40 assertion·실패0 / exit0 |
| 새 캡처·PNG/hash 검사 | widget64 + native3 =67장 |
| `git diff --check` | 통과 |

5000곡 UI 회귀는 viewport6행과 position tick 행 재빌드0을 확인했다. 이미지 파일을 열어 검수한 것은 `batch-selection`/`batch-save-queue`의390/1x/light,320/2x/light,1024/2x/dark6장과 native 생성 완료·재생목록 상세2장이다. 좁은 큰 글자에서 저장 버튼 두 개·취소가 보이고 선택 상태/미니·넓은 재생 영역이 유지된다. 이 fixture 캡처는 App Store 검수 승인이나 물리 청감 증거가 아니다.

개발 native 검사에서 DB 재연결 전에 widget의 비동기 플레이어 dispose를 기다리지 않아 `database_closed`가 재현됐다. 기존 native 테스트와 같은 명시적 dispose/완료 대기 순서로 수정한 뒤 두 scenario가 통과했다. 제품 DB/엔진 정책은 바꾸지 않았다.

첫 전체 QA `build/batch_actions_20261111/run-LWeh1L`은 host751통과/표지 테스트1실패였다. 표지 파일의 독립 실행14개는 통과했다. 기존 real image/filesystem 비동기를 80회 펌프(약1.6초)로 제한하던 테스트 대기를10초 wall-clock deadline으로 바꿨다. 같은 predicate와 최종 assertion을 유지한다. 당시 다른 앱의 Flutter 검사도 병렬 실행 중이었다. 소스 고정 재검증을 위해 첫 runner를 native-library 시작 뒤 중단했고 그 report/images는 최종 PASS 증거로 사용하지 않는다.

두 번째 `build/batch_actions_verified_20261111/run-Y6oMEj`는 host752개와 캡처100회귀·native-library가 통과했다. 그러나 캡처를 직접 열어320px/200%에서 긴 설명이 저장 버튼을 첫 화면 아래로 밀어내는 문제를 확인했다. 0건/반복 문구를 줄이고 공통 설명을 행동 아래로 옮겼으며 전체/현재부터 버튼의 실제 hit-test 가능 여부를12조합 assertion에 추가했다. 이 실행도 native-system-scenes 도중 중단하고 최종 증거로 재사용하지 않는다. 수정 후 대표 캡처에서 두 저장 행동·취소가 바로 보이는 것을 확인하고 위 최종 전체 runner를 통과했다.

## 물리 검수와 인계

- native 환경은 전용 iPhone17Pro iOS26.5 simulator, Xcode26.5다. fixture picker/상태/event 주입과 실제 Files/iCloud·OS 버튼·물리 출력은 다르다. 실제 Xs·VoiceOver 발화/읽기 순서·잠금 청감·Bluetooth·interruption은 미검수다.
- MP3 encoder·이전 OS runtime 부재는 기존 capability 기록을 따른다. 새 환경 없이 부재를 재조사하지 않았다. position 증가/decoder/시뮬레이터를 실제 들림으로 표현하지 않는다.
- [Xs 5분 점검표](classical-local-library-physical-device-checklist.md)의 다중 선택·큐 보관 동선으로 사용자 확인한다. 개인 곡명·경로·음원은 수집하지 않는다.
- iOS YAML은 pending/reviewed false이며 기능·release notes·심사/테스트 동선·관련 scene과 manual 근거를 갱신했다. 버전/이전 source commit은 바꾸지 않았고 pin/촬영 승인/배포 승인을 만들지 않았다.
- 커밋·푸시·archive·서명·업로드는 하지 않는다. 다음 작업은 지속 worktree의 미커밋 diff를 확인하고 시작한다. 이번 목표 범위를 추가 기능으로 늘리지 않는다.
- 소스/diff·새 evidence·문서를 복구하는 로컬 체크포인트는 `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-snapshots/20261111-batch-actions/`에 둔다. 앱 배포용 archive와 별개인 tar 백업이다. 원본 index를 변경하지 않고 기준 HEAD에 patch가 적용되는지 임시 index로 검사하며 파일별 hash와 archive SHA는 해당 `snapshot.json`에서 확인한다.

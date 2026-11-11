# Play 오류 복구·접근성·포맷·피드백 후속

## 기준과 범위

2026-11-11, `/tmp/ddirori-play-library-context-20261031` / `feature/ddirori-play-library-context-20261031` / HEAD `cb29d398321d3b1ac84e4ce90d619e3da7af574b`에서 직전 미커밋 작업을 이어받았다. 기존 evidence의 파일별 소스223개와 내구성 백업 archive SHA-256을 확인했고 원본 작업 트리는 수정하지 않았다. 비교용 diff/status/source registry는 앱 `build/reliability_baseline_20261111`에 저장했다. [이전 완료 기록](classical-local-library-music-actions-2026-11-11.md)은 이력이며 새 실행 결과로 덮어쓰지 않는다.

이번 범위는 기존 동작의 복구와 검증이다. SQLite18·큐/파일 ID·재생목록·원본 음원·태그·공통 UI/API·의존성·iOS 최소15.0·버전0.1.0+4를 유지한다. 커밋·푸시·archive·업로드·배포는 하지 않는다.

| 수용 항목 | 증거/계획 | 상태 |
| --- | --- | --- |
| 저장 성공/재조회 실패 구분과 재시도 | 저장 후 read 실패 주입 UI·repository 회귀 | 통과: 저장 상태 보존·재조회 write 추가0·오류 해제 |
| 실제 semantics·명령·disabled·선택·터치 | 12크기/글자/테마 조합·slider semantics action·queue/IMSLP | 통과: host semantics14건. 실제 VoiceOver/읽기 순서는 별도 |
| draft/route와 첫 큐·알림·폭/테마 전환 | 기존 layout 회귀에 실제 폭/테마 변경 추가 | 통과: query·완료 안내·큐/playing 유지 |
| native WAV/AAC/ALAC/FLAC 및 혼합/오류 복구 | 기존 audio integration+신규 mixed integration | 통과: 실제 native3건. MP3 양성/이전 OS/가청 출력 미검증 |
| 비식별 사용자/자동 결과와 회귀 후보 | feedback schema2·schema1 호환·strict validator | 통과: 단위 회귀와 별도 synthetic CLI6건 |
| 새 캡처·전체 QA·metadata·내구성 백업 | 새 output과 hash registry | 통과: runner17검사·앱726개·고유 native14개·새61장. 백업/복원은 아래 기록 |

## 실제 변경

- 즐겨찾기 write 성공 뒤 read 실패를 저장 실패로 처리하던 결함을 새 테스트로 먼저 재현했다. 실제 저장된 snapshot으로 선택 상태를 확정하고 ‘저장은 완료했습니다. 즐겨찾기 목록을 다시 불러와 주세요.’를 표시한다. 재조회는 추가 toggle/write를 하지 않으며 성공 뒤 관련 오류 안내만 지운다. 기존 늦은 응답·reset/restore generation 경계를 보존한다. idempotent desired-state 확인도 확인한 persisted snapshot을 lastSaved에 기록한다.
- 재생 오류의 ‘재생 다시 시도’가 큐를 다시 로드하고 첫 항목부터 재생하는 기존 정책임을 공통 Play controls에 명시했다. 별도의 자동 재개나 복구 정책을 만들지 않는다. 부분 편집 오류에서는 미래 메뉴의 semantic tap도 차단되며 명시적 retry 경로를 검사한다.
- 실제 Flutter semantics node의 버튼 역할, 선택/disabled, tap 유무, 진행 위치 값·increase 명령과 단 한 번의 seek 요청을 검사한다. busy 중 명령 차단·한국어 진행 안내, 현재/과거 큐 보호, mini 현재 곡과 탐색 곡 구분, Escape 뒤 살아 있는 focus, IMSLP IME 검색 실패/재시도·draft·live region·취소를 검증한다. host semantics 결과를 VoiceOver 발화/실사용 읽기 순서로 승격하지 않는다.
- feedback schema2는 고정 enum의 musicActions(사용자8항목)와 automaticChecks(자동4항목)를 분리한다. 누락 응답은 notChecked이며 v2 wire contract는 모든 정해진 항목을 요구한다. v1 문서를 계속 읽고 v1로 round-trip하며 새 항목은 미확인이다. 알 수 없는 중첩 필드·잘못된 schema/값·개인정보·16KiB 초과를 거부한다. 자동 결과 선언은 증거에 대한 인증이 아니며 물리 listening/사용자 응답을 채우지 않는다. validator는 문제 enum을 synthetic 회귀 후보 ID로 출력하고 ‘P0/P1 신고 없음’을 출시 승인이라고 표시하지 않는다.

## 포맷·OS 검증 경계

기존 fixture는 자체 합성 mono22,050Hz/2.4초 PCM과 macOS afconvert 파생 AAC/ALAC/FLAC이다. 새 오디오를 외부에서 수집하지 않는다. `report_audio_capabilities.dart`가 실제 codec/container/hash/생성법·도구 버전·runtime을 기록한다. host decoder PCM의 marker/quiet/clipping 검사는 실제 iOS 출력 녹음이 아니다.

로컬 ffmpeg/flac/lame encoder는 없으며 afconvert의 MPG3/.mp3와 .mp3@44100 출력은 실제 `fmt?` 오류로 실패했다. MP3의 ‘형식 목록 표시’를 encoder 성공으로 해석하지 않는다. MP3 양성 재생 검증은 unavailable이고 잘못된 .mp3 바이트 오류 복구 검사는 별개다. 바이너리/패키지/runtime을 다운로드하지 않는다.

설치된 runtime은 iOS26.5(23F77)뿐이다. 2026-11-11 [Apple iOS18 호환 목록](https://support.apple.com/en-us/104985)에 Xs가 있고 [Apple iOS26 호환 목록](https://support.apple.com/guide/iphone/iphone-models-compatible-with-ios-26-iphe3fa5df43/26/ios/26)은 별도다. Xs용 이전 OS native 실행은 미검증이며 최신 simulator 통과를 대신 쓰지 않는다. project의 deployment target15.0과 기존 MediaPlayer/음악 audio session 설정은 유지한다.

혼합 fixture의 2.4초 파일은 기존 production position policy의 ‘남은10초 이내 완료’에 해당한다. 따라서 해당 짧은 파일은 재시작 시 같은 항목의0초/ready로 복원하는 것이 기존 계약이다. 이를700ms 복원으로 오인한 신규 테스트의 기대를 실제 정책 확인 뒤 수정했고 완료 record도 assertion으로 확인한다. 긴 fixture의 위치 보존은 기존 실제 큐/SQLite 재시작 통합에서 계속 검사한다.

## 사용자 확인

새 후보가 별도로 제공된 뒤 [사용자 점검표](classical-local-library-physical-device-checklist.md)의5~10분 동선을 사용한다. 기존 TestFlight4에는 이번 기능이 없다. 실제 Xs OS·VoiceOver·Files/iCloud·MP3·스피커/유선/Bluetooth·전화·개인 대형 보관함은 자동 fixture로 통과 처리하지 않는다. 개인 곡명/경로/음원/계정/기기 식별자/로그 전문 수집과 자동 전송은 추가하지 않는다.

## 최종 실행·증거

최종 실행은 `build/reliability_qa_20261111/run-ikB3ro`이며 [report](evidence/play-reliability-20261111/report.json)의17검사 모두 exit0/passed다. source fingerprint는 전후 및 별도 live 재검산 모두 `a458146dbaaa3fbba9bb535d88bb7cecbc973c30c6d3f71d50391e8fafa734a2`다. [파일별 source226개](evidence/play-reliability-20261111/source-files.json), [산출물 해시](evidence/play-reliability-20261111/files.sha256.json), [handoff](evidence/play-reliability-20261111/handoff.json)에 실제 상태를 기록했다. 재현했던 저장/재조회 실패와 짧은 fixture의 잘못된 복원 기대 로그는 diagnostics에서 최종 통과와 구분해 보존한다.

| 명령/범위 | 실제 결과 |
| --- | --- |
| `dart format lib test integration_test tool` | 175파일·변경0 |
| `flutter test --no-pub --reporter expanded` | 726개 통과. capture/targeted 재실행 수를 더하지 않음 |
| `flutter analyze` | No issues found |
| fixture check·host decoder signal | 통과. WAV/AAC/ALAC/FLAC PCM의 marker/quiet/clipping 검사 |
| audio-capabilities | probe 실행 통과. MP3 encoder unavailable·이전 runtime 미설치가 명시된 결과이지 모든 codec 통과가 아님 |
| 5k/20k host 보관함·검색 benchmark | 통과. 실기기 성능 보증 아님 |
| 실제 Flutter widget 캡처 | 새58장. 저장 후 refresh 오류1장 추가 |
| native 보관함/가져오기·실제 캡처 | 1개 통과·새3장 |
| native 시스템/scene/검색/셔플·반복 | 고유5개 통과 |
| native 큐 편집·IMSLP 가져오기/즐겨찾기/복원 | 고유3개 통과 |
| native 포맷 | 고유3개 통과: FLAC, 기존 WAV/AAC/ALAC·이력, 혼합 포맷/복원/손상 후 복구 |
| native OS background 전환 | 고유2개 통과·index0→3→완료12·position 저장·no-auto-resume |
| metadata unit/check | 13 runs/40 assertions·실패/오류0, Fastlane mode:check exit0 |
| `git diff --check`, 소스 TODO/FIXME/Flutter Demo/Counter 검색 | diff 오류/검색 결과 없음 |

`dart run tool/run_local_qa.dart --library-ux --captures --simulator 38B3F034-2212-4566-B09B-AC5DFEEB1187 --output build/reliability_qa_20261111`로 실행했다. 같은 simulator에서 native 작업을 병렬 실행하지 않았다. Flutter3.47.2/Dart3.13.2·Xcode26.5(17F42)·전용 iPhone17 Pro iOS26.5(23F77) 환경이다. 버전0.1.0+4·SQLite18·기존 build ID·metadata pending/reviewed false를 유지한다.

새 PNG61개의 구조·hash를 검사하고 그중 저장 후 refresh 오류390/light, 즐겨찾기320/200%, 큐 메뉴1024/200%/dark, IMSLP320/200%, native 재생목록 상세5장을 실제로 열어 검수했다. 저장된 하트 선택과 새로고침 안내, 한글/아이콘·긴 제목·조작부·미니플레이어를 확인했다. widget 이미지는 실제 제품 위젯/fake controller이고 native 이미지는 simulator다. 어느 것도 스토어 승인·실기기 청감 증거가 아니다.

[synthetic CLI6사례](evidence/play-reliability-20261111/cli-results.json)는 unverified-v2, 자동/사용자 결과 분리, 명시적 P1, private/unknown 필드 거부, legacy-v1, 크기 초과를 실제 프로세스로 검사했다. 예제 JSON의 OS18/0.0.1(1)은 합성 protocol 입력이며 물리 사용자 응답/OS18 실행/배포 버전이 아니다. 사용자에게 JSON 작성을 요구하지 않고 번호별 통과/문제/미확인 응답을 허용한다.

## 내구성 인계와 남은 범위

로컬 필수 구현·검증·문서/YAML 작업을 완료했다. 미커밋 상태와 실제 HEAD/브랜치는 위 기준 그대로이며 원본 저장소·다른 앱 변경을 보존했다. 새 의존성·공통 API·권한·클라우드·원본 태그 변경은 없다.

새 snapshot은 `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-snapshots/20261111-reliability/play-worktree-final.tar.gz`, 같은 폴더의 `snapshot.json`/`restore-check.json`을 사용한다. 기존20261111 백업을 덮어쓰지 않는다. tracked binary diff, 변경/untracked 파일, 이전/이번 evidence(ignored log 포함), baseline/recovery 기록을 포함하고 제품 build 산출물·사용자 음원·.git·자격 증명은 넣지 않는다. archive/file별 SHA-256을 검사하고 별도 임시 Git index를 HEAD로 만든 뒤 `git apply --cached --check`로 tracked patch 복원을 검증한다. 실제 dirty index를 변경하지 않는다. 별도 깨끗한 worktree에서만 복원한다.

MP3 encoder·이전 runtime 부재, 실제 VoiceOver·포커스/읽기 사용성·Files/iCloud·스피커/유선/Bluetooth·전화·실사용 라이브러리는 대체 통과시키지 않았다. 새 후보 제공 후 사용자5~10분 검수 대상으로 남긴다. 자동 피드백 선언과 host/native PASS로 물리 사용자 응답을 채우지 않는다. 이번 작업은 빌드4 설치·신규 TestFlight·metadata pinning·공개 출시를 의미하지 않는다.

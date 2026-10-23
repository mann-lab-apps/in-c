# 띠로리 플레이 자체 QA 고도화

날짜: 2026-10-23 KST. 제품 0.1.0+1, SQLite schema v14 유지.
환경: macOS 26.6.2, Xcode 26.5 (17F42), Flutter 3.47.2 stable, Dart 3.13.2.

## 범위 변경

사용자 요청으로 배포·공개 페이지·스토어 입력·서명·pinning·최종 아이콘은 보류했다.
디자인 자산과 공통 토큰은 별도 디자인 작업의 소유로 유지한다. 이 실행은 데이터 초기화,
큐 저장 복구, 진단 신뢰성과 로컬 검증을 다룬다. 제출 준비 완료를 의미하지 않는다.

## 수정과 수락 기준

| 항목 | 재현과 검증 |
| --- | --- |
| 전체 초기화 | 초기화 후 `PlaybackQueueSnapshot`이 남는 실패를 먼저 확인. 삭제 목록에 큐 추가, 정지/빈 큐/위치·이력 drain을 삭제 전에 수행 |
| 큐 저장 오류 | 동일 값의 실패 재시도, pending write 뒤 clear, 초기 idle에서 기존 snapshot 보존 테스트 |
| 초기화 순서 | 준비 실패 시 delete 미실행 widget test. 실제 iOS SQLite와 저장 동작을 모사하는 fake player로 stop/dispose 이후 위치·큐·이력 비재생성 확인 |
| 진단 신뢰성 | 재실행 시 청감 응답 초기화, runner 예외의 경로 비노출·재시도 widget test |
| 좁은 화면 | 390px 빈 화면의 실제 3px overflow 재현 후 감상 도구 Wrap 수정. 320px/200%에서는 제목과 도구를 세로 배치 |
| 시각 검수 | Pretendard + Material Icons로 widget PNG 생성. 밝은 phone/tablet, 어두운 320px/200% 이미지를 직접 열어 확인. 디자인 최종 승인·스토어 촬영이 아님 |
| 디코더 | 자체 생성 WAV/AAC/ALAC/FLAC을 macOS afconvert로 디코딩. 고정 기준과 음소거/clipping/잘못된 marker/잘못된 RIFF mutation tests |
| 대형 라이브러리 | 실제 iOS SQLite에 파일→카탈로그 순서로 5000트랙 저장, load·검색·스크롤·5악장 큐 순서와 RSS 측정 |
| 실행기 | 명령 exit code·시간·로그 hash 수집. 실패 뒤 독립 검사 계속, 도구 없음·timeout·실행 중 소스 변경은 PASS 금지 |

## 증거 등급

| 영역 | 자동 검증 | 남는 경계 |
| --- | --- | --- |
| VoiceOver | 이름·상태·행 순서 semantics, 좁은 폭/큰 글씨 widget 회귀 | 실제 발화와 손가락 탐색은 미검증 |
| Files/iCloud | picker 결과 fixture, 복사·취소·중복·재시작·원본 보존 회귀 | 실제 제공자 UI·인증·네트워크 파일 UX 미검증 |
| 오디오 | host decoder PCM + iOS Simulator native transport | 스피커·유선·Bluetooth와 사람 청감 미검증 |
| interruption | fake event 정책 회귀 | 실제 전화·앱 경쟁·장치 분리 미검증 |
| 데이터 | fixture SQLite transaction/재개방/백업/relink/초기화 | 사용자 실제 컬렉션·OS 백업 복구는 별도 |
| 성능 | Dart host query + iOS debug Simulator 동선/RSS | release 기기 성능, 프레임별 jank, 장시간 누수는 별도 |

호스트 PCM 검사에서 4개 형식 모두 2400ms, clipping 0개였고 WAV/ALAC/FLAC의 중앙
무음 RMS는 0, AAC는 약 91.6 PCM16 units였다(상한 100). marker 허용 오차는 45Hz,
marker RMS는 6500~10000으로 고정한다. 이 값은 fixture 회귀 기준이며 청감 품질 기준이 아니다.
`physicalOutputVerified`는 항상 false다. stereo 분리와 전환 gap은 측정하지 않았다.

MP3는 기존 ffmpeg/lame 실행 파일이 없고 시스템 afconvert의 MP3 인코딩이 지원되지 않아
추가하지 않았다. 외부 바이너리를 내려받거나 개인 음원을 복사하지 않았다. FLAC fixture는
기존 합성 PCM의 파생물이며 저작권 있는 녹음은 사용하지 않는다.

## 재실행과 로그

앱 디렉터리에서 `dart run tool/run_local_qa.dart`를 실행한다. iOS는 개인 데이터가 없는
`DDIRORI-QA-` 이름의 전용 simulator를 새로 boot하고 `--simulator <UUID>`를 전달한다.
물리 기기와 일반 이름의 simulator는 runner에서 거부한다. 기존 사용자 simulator는
초기화하지 않는다. SDK 의존성 확보 이후 fixture 검증에는 유료 서비스가 필요 없다.

`build/local_qa/run-*/report.json`은 중간에도 저장하며 미완료 실행은 running으로 남는다.
각 로그의 SHA-256과 테스트 소스·자산·앱 native 설정·공통 UI의 전후 fingerprint를 확인한다.
보고서 hash는 로컬 무결성 확인용이며 외부 공증이나 임의 편집 방지 서명이 아니다.
원시 개발 로그는 checkout 경로를 포함할 수 있어 자동 공유하지 않는다. 사용자 익명
피드백 schema와 혼동하지 않는다.

초기 실행 `run-wlxoxZ`는 기존 overflow와 새 통합 fixture 경로 오류를 기록했다.
`run-275rL1`은 새 성능 테스트의 load 인자·foreign key fixture 준비 문제를 기록했다.
두 실행 모두 수정 중 소스가 바뀌어 sourceChanged이며 최종 PASS로 사용하지 않는다.
실패를 숨기거나 예전 로그를 새 실행 증거로 덮어쓰지 않는다.

실제 기기는 `xcrun devicectl list devices`에서 발견되지 않았다. 사용자가 배포를 재개할
때 [짧은 물리 점검](classical-local-library-physical-device-checklist.md)의 5~10분 동선만
우선 실행하고, 없는 장치/미실행 항목은 미확인으로 남긴다.

## 최종 실행

`apps/classical_local_library/build/local_qa/run-P1eIvW/report.json`: **14개 검사 PASS**.
실행 전후 source SHA-256은 모두
`2d10ade7ee23650c59aa2cee9ee1b53af7c430ce671e9718a6b7ddd2d7c68bca`다.

주의: 이 일괄 실행 종료 후 별도 디자인 작업에서 공통 components/theme/generated tokens와
자산을 갱신했다. 위 14개 PASS는 해당 hash 시점의 증거이며 변경된 공통 UI의 최신 증거로
승격하지 않는다. 후속 확인 결과는 아래에 별도로 기록한다.

- `dart format lib test integration_test tool`: 113 files. 최종 check 변경 없음.
- `flutter test --machine`: 320 passed, 0 failed, 0 skipped.
- `flutter analyze`, fixture `--check`, 호스트 decoder 4종 신호 검사: PASS.
- `flutter build ios --simulator --no-codesign`: PASS.
- 전용 iPhone 17 Pro / iOS 26.5: startup·상세 2, native audio 2, 초기화 1,
  5000트랙 1, 가져오기 1, 독립 scene 계약 1로 통합 테스트 총 8개 PASS.
- 실제 시뮬레이터 앱 DB는 schema v14와 `PRAGMA integrity_check = ok`를 확인했다.
- 실제 글꼴 widget 렌더링 5개, 디자인 token/geometry `build.mjs --check`: PASS.
- metadata `mode:check`: source pending 상태에서 PASS. 공개/서명/스토어 작업은 실행하지 않음.
- TODO/FIXME/Flutter Demo/Counter, ATS/cleartext 전면 허용 검색: 매치 없음.
- `git diff --check`: PASS. 앱이 기존부터 untracked이므로 이 명령만으로 모든 신규 파일을
  검사했다고 간주하지 않는다. 신규 Dart는 format/analyze/test로 별도 확인했다.

최종 iPhone debug Simulator의 5000트랙 측정은 SQLite load 78.7ms, widget startup
760.8ms, debounce·pump 포함 검색 1439.7ms, 상세 스크롤 1009.3ms, 큐 행동 463.7ms다.
프로세스 RSS는 화면 시작 전 593,051,648 bytes, 동선 후 684,015,616 bytes였으며
최대 RSS는 716,472,320 bytes다. debug runtime와 테스트 harness를 포함한 값이며
누수 검증·release 성능 목표·물리 기기 메모리 보증으로 해석하지 않는다.
호스트 순수 Dart 검색은 190.7ms였다. 환경이 달라 두 수치를 직접 비교하지 않는다.

초기화 wiring 통합 테스트의 player와 queue snapshot은 fake/memory이고 position store는
실제 iOS SQLite다. SQLite 큐 테이블 삭제와 history 상태 전이는 별도 unit test에도 근거한다.
이 검사를 실제 출력 중의 물리 기기 초기화나 원본 보존 실측으로 확대 해석하지 않는다.

배포 관련 작업은 사용자 요청대로 보류하며 코드 변경에 필요한 메타데이터 유지 관리만
수행했다. 실제 스토어 촬영·pinning·외부 게시·계정 조회·서명·업로드·제출·버전 변경·커밋은 없다.

## 공통 디자인 변경 후 추가 확인

`build/local_qa/run-JDFoSA/report.json`은 호스트 7개 검사를 다시 실행해 모두 통과했다.
320개 테스트, analyze, format, fixture, decoder와 대형 query 검사를 포함한다.
실행 전후 hash는 `6f03a6466b0b819ffd41744c0bde5b6a5109c660e847beb125716ee414641ffe`로
동일했다. 종료 후 공통 UI 작업이 계속되어 최종 조회 hash는
`dd45c47f73c28d865661ade17ddcfdc376ec0893986481f00f21ca08204f1b4e`였다.
따라서 현재 작업 트리 전체가 위 일괄 실행과 일치한다고 주장하지 않는다.

- `iphone-scenes-current-theme.log`, `ipad-scenes-current-theme.log`: 각 화면 동선 계약
  1개 PASS. 이는 통합 테스트이며 스토어 캡처·검수 승인 증거가 아니다.
- 전용 iPad Pro 13 M5 / iOS 26.5의 `ipad-smoke.log` 2개, `ipad-reset.log` 1개,
  `ipad-scenes.log` 1개 PASS. 물리 iPad 검증이 아니다.
- 실제 글꼴을 사용하는 `brand_pilot_test.dart` 재실행: 5개 PASS.
  `build/qa_render_current/`의 320px/200% 어두운 빈 화면과 밝은 tablet PNG를 열어
  제목·도구 배치와 overflow를 확인했다. 디자인 최종 승인은 별도 작업에 남긴다.
- native audio·대형 SQLite 통합 검증의 근거는 앞선 14개 일괄 실행이다.
  공통 UI 변경 뒤 이를 다시 실행했다고 표현하지 않는다.

디자인 작업과 검증 결과의 시점 혼동을 막기 위해 후속 변경을 덮어쓰거나 기존 PASS를
최신 승인으로 재사용하지 않는다. 디자인 checkpoint가 안정되면 동일 runner로 전체를
재검증할 수 있다. 이번 실행은 배포 목표 완료가 아닌 독립 고도화 작업의 검증 기록이다.

## Git 체크포인트 준비

사용자의 후속 커밋·푸시 요청에 따라 호스트 검사를 다시 수행했다.
`build/local_qa/run-WAVLUZ/report.json`의 7개 검사는 모두 PASS이며, 실행 전후 hash는
`dd45c47f73c28d865661ade17ddcfdc376ec0893986481f00f21ca08204f1b4e`로 일치했다.
플레이 테스트 320개와 format/analyze/fixture/decoder/host 대형 라이브러리를 포함한다.
이 추가 실행은 앞서 확인한 공통 UI 변경을 포함하지만 native 통합 검사를 새로 수행한
것은 아니다. metadata check도 pending 상태에서 통과했다.
앞 절의 커밋 없음은 배포 보류 당시 실행에 대한 기록이며, 후속 Git 체크포인트와 구분한다.

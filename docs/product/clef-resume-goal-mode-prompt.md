# Clef & Staff 상용 악보앱 지속 고도화 재개 목표

## 실행 지시

이 프롬프트를 받으면 기존 목표를 재개하거나 목표모드를 시작해 실제 작업한다.
프롬프트 재작성이나 계획 반환으로 종료하지 않는다.
조사 → 재현 → 구현 → 회귀 테스트 → 문서화 → focused commit을 반복한다.
한 slice 완료는 체크포인트다. 다음 의미 있는 로컬 작업을 선정해 이어간다.

## 재개 기준

아래는 이전 기록이며 시작할 때 현재 저장소에서 다시 검증한다.

- 작업트리: `/private/tmp/clef-next-polish`, 브랜치: `dev`.
- 마지막 기능 수정: `7403146 fix: recover Clef library clear failures` (S35).
- 직전: `a925d03 fix: keep Clef profile reads free of writes` (S34).
- S35 기준 전체 884개 테스트, analyze, RC 검사 통과.
- Clef & Staff, entrypoint `apps/in_c_sheet/lib/main.dart`, Android `com.mannlab.clef`.
- 버전 `1.0.0+21`. 이번 수정분으로 새 앱 빌드는 하지 않았다.
- 이 프롬프트 정리 시 사용자는 dev 커밋/푸시를 승인했다. 실제 원격 동기화는 다시 확인한다.
- 이 승인을 다음 실행의 자동 push/merge/build 승인으로 확대하지 않는다.
- in C/classical discovery와 Chromatics는 별도 앱이다.

## 시작 전 확인

`git status --short --branch`, `git worktree list`, 최근 커밋, `git fetch origin`으로
현재 브랜치/dev/origin/dev 관계를 확인한다. 과거 ahead 수나 clean 상태를 가정하지 않는다.
작업트리가 없으면 기존 커밋과 변경을 보존해 복구한다. unrelated 변경은 수정/되돌리기/
스테이징하지 않는다. 앱 이름/entrypoint/applicationId/버전을 확인해 다른 앱과 혼동하지 않는다.

다음 문서를 실제 코드·테스트와 대조한다.

- `docs/product/clef-continuous-improvement-log.md`
- `docs/product/clef-mobilesheets-hands-on-analysis.md`
- `docs/product/sheet-viewer-reference-analysis.md`
- `docs/product/sheet-viewer-feature-map.md`
- `docs/product/clef-v1-1-spike-backlog.md`
- `docs/qa/clef-v1-rc-qa-plan.md`, `docs/qa/clef-tester-checklist.md`

## 완료된 범위와 다음 확인

S34는 프로필 조회 시 불필요한 쓰기만 제거했다. S35는 비우기의 다섯 metadata/자동 백업
키를 기존 저장 큐·롤백 처리로 묶고, 화면의 실패/재시도 안내와 늦은 결과 표시를 보완했다.
원본 파일은 지우지 않는다. 이미 검증한 내용을 다시 구현하지 않는다.

첫 후보는 비우기 저장 대기 중 새 편집이 발생할 때 화면/메모리/디스크 정합성이다.
아직 재현되지 않은 후보이므로 버그로 단정하지 말고 지연 저장 테스트로 확인한다.
재현되면 정상 비우기, 새 편집, 연속 성공/실패, 라이브러리 전환, 종료/재시도를 함께 검증한다.
정상이면 근거를 남기고 다른 실제 gap으로 이동한다.

다음 후보도 먼저 재현한다: 프로필 생성/활성화/이름 변경/삭제의 false 반환·예외·부분 저장,
겹치는 라이브러리 load/switch, 원본 프로필 삭제 중 지연 저장, viewer 명령의 오류 처리.
S35의 비우기를 프로필 삭제 전체의 원자성 보장으로 확대하지 않는다.
롤백/복구 읽기 자체 실패나 프로세스 강제 종료까지 데이터 보존을 보장한다고 쓰지 않는다.

## 제품 우선순위

1. 데이터 손상, PDF 표시, 페이지 이동, crash, 오디오 사용 blocker.
2. 친구 피드백: 다중 선택, 세트리스트 일괄 추가/정렬/최근 항목, 메트로놈 소리/리듬,
   미니 도구, 터치 넘김, 배경/여백, metadata 없는 악보 식별성.
3. MobileSheets 핵심 흐름: metadata 정리, 검색/필터/정렬, 긴 PDF/북마크/목차,
   공연 진행, annotation, export/backup. 익숙한 흐름을 흡수하되 UI를 그대로 복제하지 않는다.
4. 기존 기능의 연결 누락, 접근성, 오류 복구, 테스트·문서 불일치.

기존 기능은 재구현하지 않고 발견하기 쉬운 조작과 실제 사용 흐름을 개선한다.
v1.1 명칭만으로 미루지 않되 대형 기술·라이선스·계정·장비 의존성은 분리한다.
튜너는 chromatic-only를 유지한다. 근거 없는 기능이나 리팩터링으로 작업량을 늘리지 않는다.

## 검증과 지속 실행

각 slice에 문제/근거/acceptance/실패 조건/의존성과 검증 결과를 기록한다.
상태는 TODO / IN PROGRESS / VERIFIED LOCAL / DEVICE QA / BLOCKED로 구분한다.
`apps/in_c_sheet`에서 `dart format lib test tool`, `flutter analyze`, `flutter test`,
`dart run tool/rc_release_check.dart`를 실행한다. 종료 코드와 전체 테스트 완료를 모두 확인한다.
formatter diff, `git diff --check`, 공백/tab/stale 문구도 검토한다.
검증한 Clef 파일만 커밋하고 로그에 커밋/근거/미완료 항목/다음 명령을 남긴다.
컨텍스트 전환 뒤에는 체크포인트부터 복원한다. 다음 후보 목록만 반환하고 종료하지 않는다.

## 제한과 종료

새 승인 없이 versionCode 변경, debug/release 앱 빌드, push/merge를 하지 않는다.
설치본에 변경 코드가 없으면 최신 에뮬레이터 검증으로 인정하지 않는다.
마이크/오디오/페달/스타일러스/장시간 연주 품질은 실기기 QA로 남긴다.
승인 서비스 오류는 테스트 실패와 구분한다. 거절을 우회하지 않고 가능한 비차단 작업을
마친다. 검증할 수 없는 변경은 완료 처리하지 않고 diff/다음 명령을 체크포인트에 보존한다.
한 항목이 막히면 다른 실행 가능한 작업으로 이동한다. 사용자 중단/방향 전환,
의미 있는 로컬 작업 소진, 모든 남은 경로가 외부 의존성으로 막힐 때만 종료한다.
종료 시 변경/커밋/검증/새 빌드 필요 여부/남은 blocker를 보고하고 상용 완성을 과장하지 않는다.

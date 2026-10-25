# 공유 기준 검증 · 2026-10-25

현재 작업 결과와 커밋 정보를 기록하는 위치다. 이전 evidence는 덮어쓰지 않는다.

시작 HEAD: `44f8b2a5`. 기존 미커밋 DS 코드·명세·카탈로그·Score 적용·메타데이터를 검토해 포함한다. 당시 파일별 SHA-256과 worktree 목록은 `out/ddirori/shared-baseline/start.json`에 보존했다. 다른 Chromatics 작업 트리는 유지한다.

## 수용 조건

| 계약 | 증거 |
| --- | --- |
| 같은 저장소에서 실제 패키지 연결 | root file dependency, Studio production build, React/Flutter starter |
| Play 실패 draft·재시도·중복·취소·복귀 | library_management_test, metadata_edit_dialog_test |
| Studio 자동/0·IME·Escape·단일 commit·undo | SpanProperties.test, 실제 App.test의 geometry/native history |
| 공통 상태·키보드·popup | shared package tests, basic-set browser run |
| Score 영향 | 전체 Score analyze/test |
| 정본 일치 | token check, API snapshot, specifications, catalog build |
| 배포 계약 | Play/Score YAML check; 스토어·기기 촬영 미실행 |

## 확정한 로컬 결과

공통 시스템 commit `2588a075`, 실제 제품 checkpoint `4c01f7c1`. 이 디렉터리를 포함하는 후속 검증/CI commit까지 같은 브랜치에서 받는다: `feature/chromatics-expanded-v1-checkpoint-20260913`. 미래 hash는 기입하지 않는다. iOS metadata는 pending을 유지하며 출시 checkpoint로 승인하지 않는다.

| 실행 | 결과 |
| --- | --- |
| React 공통 typecheck/test | 53 tests / 5 files 통과, 도입 예제 실패·재시도 포함 |
| Flutter 공통 analyze/test | 33 tests 통과 |
| Flutter 예제 analyze/test/build web | 기본 54 + starter 1 통과, web build 통과 |
| Score analyze/test | 전체 507 통과 |
| Play analyze/실제 편집 회귀 | library management 16 통과; 소비 컴포넌트+dialog 18 통과 |
| Studio typecheck/build/실제 App+SpanProperties | 137 통과; native project 저장·undo 회귀 포함 |
| Electron built renderer | 패널 공통 CSS·compact 입력32px·명시적0/undo→자동·넘침 없음; Electron runtime API 확인 |
| Chrome 카탈로그 | 145 checks 통과: Select 탐색·commit·취소, popup/dialog, focus, 390px/200%, dark/light |
| 토큰·API·문서 | 39 계약/6서비스/194 token rows, React63/Flutter60 API, 예제 타입·생성물 일치 통과 |
| 팔레트 | 대비300쌍·중립/선택/음악 의미 불변12항목 통과 |
| 브랜드 자산 기존 계약 | 466 export hashes·18 rasters 통과; 런처 미교체 |
| Play/Score iOS metadata | 각각 mode:check 통과; 새 metadata_edit scene 촬영 미실행 |

[로그·이미지 해시](manifest.json), [Electron 결과](studio-electron.json), [실제 제품 렌더](studio-electron.png), [브라우저 결과](browser/browser.json), [명세 검사](specifications.json). Electron 검사는 격리된 userData의 실제 빌드/fixture이며 파일 bridge·오디오 장치를 연결하지 않았다. 처음 hidden-window 자동화에서 blur가 전달되지 않는 문제를 확인하여 focusout을 명시적으로 전달했고 제품의 undo 테스트를 약화하지 않았다.

Flutter web build는 사용되지 않는 CupertinoIcons font family 경고를 출력했다. 현재 표시하는 MaterialIcons와 starter 빌드는 성공했으며 전체 Cupertino 위젯 지원을 주장하지 않는다. 실제 Cupertino icon을 추가할 때 assets/pubspec 등록 후 재검수한다.

## 재현과 원격 CI

[워크플로](../../../../../.github/workflows/design-system.yml)는 PR와 모든 branch의 관련 경로 push에서 동작한다. source·패키지·토큰/문서·메타데이터·검증 script 변경을 포함한다. React 공통·실제 Studio test/build/Electron, Flutter 공통·예제·Score 전체·Play 편집 회귀를 실행하고 결과를 artifact로 남긴다. 화면 촬영과 실제 보조기기 검수는 별도다.

원격 실행 결과는 [Design system contracts](https://github.com/mann-lab-apps/in-c/actions/workflows/design-system.yml)에서 해당 commit을 선택한다. 이 문서의 로컬 통과표를 원격 성공으로 해석하지 않는다. push 이후 결과는 최종 작업 보고에서 별도 확인한다.

첫 원격 실행 [40185725380](https://github.com/mann-lab-apps/in-c/actions/runs/40185725380)에서 Linux 절대 경로가 React API snapshot에 포함되는 문제와 web job의 Dart formatter 누락을 발견했다. API 경로 정규화·macOS/Linux 회귀 테스트를 추가하고 web job에도 같은 Flutter/Dart 도구를 설치한다. 검사 생략으로 우회하지 않는다. 후속 Play 검토에서는 오류 banner를 스크롤 밖 제목 아래로 이동해 오류가 실제 화면에 보이는지 검증했다(`play-final.log`: 19 통과). 기존 checkpoint 결과와 이 후속 수정은 구분한다.

두 번째 원격 실행에서는 Electron 동작 검사는 통과했으나 가상 화면 capturePage에서 UnknownVizError가 발생했다. 검증용 격리 창을 visible/software compositor로 변경하고 글꼴·paint 완료 뒤 캡처한다. 제품 렌더링 설정 변경이나 캡처 검사 생략은 아니다.

브라우저 검사 도구는 독립 Playwright 설치를 사용한다. 재현 시 임의 QA 폴더에서 `npm init -y`, `npm install playwright` 후 `DDIRORI_QA_PACKAGE=<QA폴더>/package.json`, `DDIRORI_BROWSER_PATH=<Chrome실행파일>`, `DDIRORI_CATALOG_URL=http://127.0.0.1:8088/`, `DDIRORI_EVIDENCE_DIR=<새 출력폴더>`로 `tools/verify-basic-set.mjs`를 실행한다. 개인 `/tmp` 경로를 필수 설치로 간주하지 않는다. 내장 browser 제어 도구가 세션에 없어 격리된 Chrome으로 수행했다.

실기기·Safari·VoiceOver·TalkBack·실물 IME는 [수동 검수](../../support-matrix.md)를 따른다. Figma는 대응표만 존재한다. Stage/Talk/Utilities 신규 서비스, 엔진/파일 포맷·계정·출시 작업은 추가하지 않았다. 다른 worktree 목록은 시작과 동일하며 다른 작업을 reset/stash/삭제하지 않았다.

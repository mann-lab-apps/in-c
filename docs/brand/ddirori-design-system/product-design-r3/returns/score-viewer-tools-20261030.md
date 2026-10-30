# Score · 연습 도구 공통 UI 후속 적용

## 기준과 보존

- 시작 checkpoint: `01b337e5`. 기존 제품 lib/test에는 변경이 없었다.
- 현재 기준은 `service-theme-contract.md`, `shared-baseline.md`, 실제 `packages/ddirori_ui` API다. R3는 이전 탐색 이력으로 보존한다.
- 다른 앱·브랜드·공통 패키지와 기존 iOS YAML 변경을 보존한다. 이번 제품 변경은 `apps/in_c_sheet`에 한정한다.
- 현재 pubspec은 `1.0.0+14`, Android applicationId는 `com.mannlab.inc`다. YAML의 출시 식별자와 다른 사실은 기존 `manual.build_selection` 기록대로 유지하며 버전·식별자를 바꾸지 않는다.

## 자동 스크롤

- 실제 경로: fixture PDF → 연습 → 자동 스크롤.
- 공통 `showDdiroriSheet`가 제목·safe area·스크롤을 소유한다. 내부에 별도 세로 스크롤이나 중복 PageHeader를 만들지 않는다.
- 연주 시간·쪽별 속도·시작 큐·페이지 범위·pause marker·반복 구간·cue point는 `DdiroriSection`으로 구분한다. 숫자 조정은 공통 설정 행/아이콘 버튼, 선택은 Choices, 실행은 Button/AdaptiveActions를 사용한다.
- native Slider와 삭제형 InputChip은 공통 Material 테마를 소비한다. scroll 계획·timer·설정 저장은 기존 Score adapter를 재사용한다.
- acceptance: 390/840px 및 840×390 가로, 200% 글자, light/dark에서 하단 설정 접근·끝 페이지 저장/복원·닫기 뒤 PDF identity/현재 쪽 보존. 마이크·오디오·페달·VoiceOver는 자동 검증 대상에 포함하지 않는다.
- 실행 로그: `/private/tmp/score-auto-scroll-20261030.log`. 전체 검증 결과는 작업 마무리 시 아래에 기록한다.

## 메트로놈·튜너 공통 sheet

- 실제 경로: PDF → 연습 → 메트로놈/튜너. 공통 sheet가 제목·safe area·단일 scroll을 소유하고, child는 Stack/Banner/AdaptiveActions로 현재 행동을 표시한다.
- 튜너 마이크는 tooltip에만 의존하던 아이콘 대신 `마이크 켜기/끄기` 동작명이 보이는 Button이다. 음정/드론 시각화·감지 프로필·native 입력과 출력은 기존 adapter를 유지한다.
- acceptance: 390/840px·840×390 가로, 200% 글자·light/dark에서 도구 접근/닫기와 PDF identity/현재 쪽 보존. 메트로놈 BPM·박자·소리 설정을 저장하고 무음 시작/정지·실행 중 닫기/재진입을 검사한다.
- focused 로그: `/private/tmp/score-practice-sheets-20261030.log`. 실제 오디오 청감·마이크/권한·VoiceOver 검수는 별도다.
- focused 6 tests PASS. RC 첫 실행의 전체 576 tests는 PASS였지만 unused style 변수 때문에 analyze가 실패했다. 해당 변수를 제거한 최종 RC는 analyze·전체 576 tests·fixture·scan 모두 PASS, 종료 코드 0 (`/private/tmp/score-practice-rc-final-20261030.log`).
- 영향 scene에 공통 행동 위젯 assertion을 추가한 metadata check PASS (`/private/tmp/score-practice-metadata-20261030.log`).

## 검증과 남은 범위

- 자동 스크롤 focused PDF widget 검사: 세 viewport 조건 모두 PASS. 처음에는 재진입 테스트가 연습 패널을 다시 열지 않아 실패했고, 실제 제품 진입 순서로 수정했다. section 제목과 값의 중복을 허용하는 느슨한 assertion 대신 정확한 시간 값을 검사한다.
- `dart format lib test tool`: PASS. RC 내부 analyze·전체 572 tests·fixture·공백/tab/stale/debug 검사 PASS, 종료 코드 0 (`/private/tmp/score-rc-20261030.log`).
- `prepare_ios_metadata ... mode:check`: PASS, source pending (`/private/tmp/score-metadata-20261030.log`). 실제 화면 캡처·기기 청취·OS provider·VoiceOver 검수는 미실행이다.
- 다음 후보: 악보 메모의 저장 완료 전 닫힘과 실패 draft 복구, 남은 viewer 옵션의 실제 중복 조사.

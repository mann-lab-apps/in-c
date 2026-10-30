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

## 검증과 남은 범위

- 자동 스크롤 focused PDF widget 검사: 세 viewport 조건 모두 PASS. 처음에는 재진입 테스트가 연습 패널을 다시 열지 않아 실패했고, 실제 제품 진입 순서로 수정했다. section 제목과 값의 중복을 허용하는 느슨한 assertion 대신 정확한 시간 값을 검사한다.
- `dart format lib test tool`: PASS. RC 내부 analyze·전체 572 tests·fixture·공백/tab/stale/debug 검사 PASS, 종료 코드 0 (`/private/tmp/score-rc-20261030.log`).
- `prepare_ios_metadata ... mode:check`: PASS, source pending (`/private/tmp/score-metadata-20261030.log`). 실제 화면 캡처·기기 청취·OS provider·VoiceOver 검수는 미실행이다.
- 다음 후보: 메트로놈/튜너의 바깥 sheet 계약과 남은 viewer 옵션의 실제 중복 조사.

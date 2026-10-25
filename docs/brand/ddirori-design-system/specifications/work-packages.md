# 구현 작업 패키지

각 패키지는 이 파일과 연결된 명세를 함께 전달하면 독립 작업의 시작점이 된다. 초기 문서 작업 이후 실제 적용을 진행했다. 아래 범위 설명과 현재 완료 상태를 구분한다. 순서는 공통 계약의 위험 해소 → Score의 작은 실제 흐름 → Play/Studio 확대를 권한다. 전체 화면을 한 번에 재작성하지 않는다.

## 2026-10-24 현재 이행 상태

근거: [실제 적용·검증 기록](../adoption-pilot.md).

| 작업 | 이번 결과 | 남은 범위 |
| --- | --- | --- |
| W-REACT | 숫자 확정·IME, async confirm 세션/중복/오류, disabled Item, 선택 hover, range 터치 영역 보완 | 새 name/ref/readOnly API는 실제 소비 요구 이후 |
| W-FLUTTER | submit 중복/IME, 중립 보조 버튼, checkbox 접근성 이름, Accordion 정렬 | native overlay·실기기 입력/보조기술 검수 |
| W-SCORE | S-SCORE-01~03 실제 악보함, 검색/정렬/필터/선택·bulk 오류 복구·뷰어 진입 | S-SCORE-04~06 뷰어·연습 전체 이행 별도 |
| W-PLAY | 공유 UI 변경 소비 회귀 15개 확인 | 라이브러리 metadata 편집의 다음 작은 흐름 |
| W-STUDIO | 공통 React 전문 패널 6색 비교 | 실제 Electron inspector 하나의 adapter 도입 |
| 기타 서비스 | API/문서 계약 유지 | 별도 제품 작업으로 단계적 이행 |

## 모든 작업의 공통 계약

1. 루트 AGENTS와 해당 경로의 추가 지침, git status, [감사](audit.md), [차이](decisions.md)를 먼저 읽는다. 기존 미커밋 변경과 다른 워크트리를 보존한다.
2. 현재 API와 목표 API를 구분한다. 제품 엔진/저장/라우팅 상태는 앱 소유. 새 auth·딥링크·클라우드·오디오 기능을 디자인 이행에 포함하지 않는다.
3. 기본값은 현재 토큰과 중립 작업 면. 대표색 미확정, 임시 라임/6색 전환 보존. 새 토큰은 원본에 추가한 뒤 생성하며 생성 파일만 수동 수정하지 않는다.
4. 변경 대상의 최소 성공·실패·비활성·확대 흐름을 먼저 수용 조건으로 적는다. 구현 후 실제 검사 결과와 미검증 플랫폼을 기록한다.
5. 호환 변경을 우선한다. 이름/인자 변경 시 이전 사용처 목록·adapter·폐기 기간을 정하고 한 번에 중복 이벤트를 연결하지 않는다. 되돌림은 해당 adapter/화면 경계로 제한하며 작업 전 사용자의 변경을 덮어쓰지 않는다.
6. 제품 UI/기능에 영향이 있으면 `deployment/apps/*/ios-metadata.yaml`의 `source.path`로 해당 앱을 찾는다. 없으면 template에서 준비한다. source.state=pending/content.reviewed=false, 영향받은 manual pending, 실제 기능·심사 경로·screenshots.scenes/steps/assertions 갱신. 첫 출시가 아니면 release_notes 반영. 버전·미래 commit·촬영 결과를 만들지 않는다.
7. 해당 manifest마다 `cd deployment` 후 `bundle exec fastlane prepare_ios_metadata manifest:apps/<app>/ios-metadata.yaml mode:check`. 문서만 바뀌거나 소비하지 않는 앱은 제품 변경으로 처리하지 않는다. 스토어 업로드·출시·commit/push는 별도 지시가 없으면 하지 않는다.
8. 완료 보고: 바뀐 계약/소비 화면/검사 명령·결과/남은 한계/되돌릴 파일. 명세·API snapshot·evidence를 실제 상태로 갱신한다.

## W-REACT 공통 React 보완

**목표:** `packages/ddirori_web/src`의 공통 UI를 C01~C39 계약에 맞춰 보완한다. 첫 묶음은 D03 숫자 commit, D04 range hit area, D08 toolbar 역할, D09 Select form/ref, D13 disabled subtree, D14 selected/hover다. 후속 API 제안은 [결정 목록](decisions.md)을 따른다.

**읽기:** [React 플랫폼](platforms.md#react), [공통 규칙](component-rules.md), 대상 C 문서/API, src/basic.test.tsx·components.test.tsx, catalog/basic-set.tsx. MUI를 설치하거나 DOM 외형을 통째로 복제하지 않는다.

**단계:**
- 재현 테스트를 먼저 선택한다. 숫자 Enter→blur가 같은 변경을 두 번 알리는지, 한글 조합 중 Enter가 확정되는지 실제 계약에 맞게 검사한다.
- `onChange`/`onCommit` 의미를 구분하는 경우 호환 adapter와 사용처를 동시에 갱신한다. Select 탐색/확정/취소 계약을 유지한다.
- 터치 최소 영역·focus·selected 겹침은 styles와 실제 브라우저로 확인한다. 모든 container에 role=toolbar를 일괄 추가하지 않는다.
- 카탈로그에 변경 전 문제의 경계 상태를 재현할 수 있게 한다. 신규 컴포넌트는 실제 사용 요구가 있는 것만 추가한다.

**수용:** IME 보존, 확정당 이벤트1, disabled action0, Select label/required/Tab/Escape 유지, popup viewport 대응, theme/density 상속. 타입·관련 회귀·브라우저 카탈로그 검사. API snapshot check와 문서 검사. **되돌림:** 추가 API adapter/해당 CSS를 한 묶음으로 되돌리고 기존 호출 계약 유지.

## W-FLUTTER 공통 Flutter 보완

**목표:** `packages/ddirori_ui/lib`의 실제 wrapper와 Material 합성 지침을 일치시킨다. 네이티브 Checkbox/Radio/Switch/Slider/Dropdown을 없는 자체 wrapper처럼 문서화하지 않는다.

**읽기:** [Flutter 플랫폼](platforms.md#flutter), [native recipes](native-recipes.md), API, components_test/basic_test, example/lib/basic_set.dart. D02/D04/D05/D06/D07/D10/D12 차이를 확인한다.

**단계:** 숫자 입력 확정 정책과 controller lifecycle, required 검증 책임, modal confirm→host async 흐름을 명확히 한다. 일관된 native Theme/label/error/disabled/empty recipe를 카탈로그에 유지한다. 필요성이 확인된 wrapper만 설계·추가한다. theme extension/text scaling·route 상속을 유지한다.

**수용:** null callbacks 비활성, controller 교체·dispose 누수0, 선택값 소멸/빈 Dropdown 안전, 큰 글자 overflow0, popover 닫힘 focus 복귀, 예외 후 host 복구. analyze·widget tests·example 검증, VoiceOver/TalkBack 미실행은 별도 표시. **되돌림:** 앱 adapter는 기존 native 경로를 유지하고 공통 wrapper만 교체 가능하도록 한다.

## W-SCORE 첫 실제 적용

**목표:** `apps/in_c_sheet/lib/main.dart`의 악보함 검색·정렬·목록/그리드·선택 흐름을 S-SCORE-01~03에 따라 앱 내부 presentation adapter로 분리한다. 그 다음 별도 변경 묶음으로 ViewerChrome/AnnotationBar/PracticePanel을 이행한다.

**선행:** W-FLUTTER에서 이 흐름에 필요한 입력/선택 계약만 해결. 앱 전체 선행 재작성 불필요.

**읽기:** [Score 명세](services/score.md), 실제 _ScoreTile/_ScoreGrid/_LibraryViewBar 및 SheetLibraryController, 기존 테스트. 기존 max-width/breakpoint 예외는 우선 유지한다.

**수용:** 가져오기 취소/실패, 긴 제목/빈 결과, 필터와 선택 독립, row 열기와 checkbox/menu 독립, 삭제된 파일 복구. 확대/좁은 화면에서 동작 보존. 뷰어 단계는 page/half-page/rotation/hidden mapping, 문서 좌표·색·undo 저장이 같아야 한다. 연습 단계는 엔진 시계·권한·seek를 그대로 연결한다. 실제 앱 tests/analyze와 대표 화면 확인. `deployment/apps/clef/ios-metadata.yaml` 갱신/check.

**되돌림:** presentation adapter와 호출부만 되돌릴 수 있게 엔진/데이터 형식 변경을 섞지 않는다. 각 단계별 완료 상태를 adoption에 적는다.

## W-STUDIO 사보 작업 공간

**목표:** 실제 Electron React `src/renderer/src`에 S-STUDIO의 command toolbar/inspector를 먼저 적용한다. catalog/studio는 참고 fixture이며 제품 이행 근거가 아니다.

**선행:** W-REACT의 Number commit/IME·focus 계약. **읽기:** [Studio 명세](services/studio.md), App.tsx·SpanProperties.tsx·score-core, 실제 product tests.

**단계:** 없음/단일/혼합 선택 DTO → draft fields → 검증 → domain command 한 번. selection과 입력 설정 분리, 기존 keyboard shortcut 우선순위와 undo 유지. dock/command search는 다음 작은 단계로 분리한다.

**수용:** mixed 값을0으로 바꾸지 않음; Enter/blur 중복 transaction0; Escape draft 취소; IME/입력 focus 중 전역 shortcut 실행0; undo/redo·저장 dirty 상태 보존. `npm run typecheck`, 변경 관련 App/속성 회귀 테스트, 실제 Electron 화면의 keyboard/dock/resize 확인. 사보 renderer/파일 엔진 회귀는 그 경계를 바꿀 때만 확대한다. iOS 제품이 아니므로 임의 metadata 생성 없음.

**되돌림:** 표시 adapter/공통 UI 호출 경계 단위. 문서 모델/렌더러의 치수 단위(sp)와 CSS px 변환을 UI 이행에 섞지 않는다.

## W-PLAY 음원 라이브러리

**목표:** `apps/classical_local_library`에서 이미 사용 중인 공통 UI 위에 S-PLAY 표시 adapter를 정리한다. Work/Recording/Movement model을 공통 패키지에 이동하지 않는다.

**선행:** W-FLUTTER Transport/seek 차이 확인. **읽기:** [Play 명세](services/play.md), 현재 presentation/play_*와 NowPlayingControls, 기존 파일·queue 테스트.

**단계:** 라이브러리 row·빈/오류·검색 조합 → 상세 recording/movement → NowPlaying/queue 순. 가상 목록·stable key와 파일 접근은 현재 앱 소유. 테마 변경으로 작품 art/태그/주석 의미색을 덮지 않는다.

**수용:** 작품→녹음→악장 재생 흐름 보존, 파일 unavailable에서 허위 play0, seek preview와 commit 단위 검증, reorder 후 queue ID 보존, 실패 후 재시도·diagnostic 위치 유지. 실제 앱 analyze/test 및 대표 흐름 검증. `deployment/apps/classical-local-library/ios-metadata.yaml` 갱신/check.

**되돌림:** 화면 그룹별 기존 adapter 경로 유지; player/library/metadata 저장 형식 변경 제외.

## W-STAGE 공연 서비스

**목표:** [Stage 명세](services/stage.md)에 따라 공개 `site/`와 Score 내부 Flutter discovery prototype을 서로 다른 소비자로 취급한다.

**선행:** 정적 사이트는 공통 React runtime 도입 여부를 이 작업의 전제로 두지 않는다. 토큰/CSS·접근성 계약을 우선 활용한다.

**단계·수용:** 공개 사이트의 정보/메일 홍보 동선과 날짜·장소·promoted/취소 표시 개선. 존재하지 않는 예약·유료결제·통합 로그인 CTA 없음. `npm run site:build`, 관련 `verify:site-content`/`verify:site-seo` 및 keyboard/mobile 확인. Flutter prototype 변경 시 실제 경로와 영향 앱 metadata를 따로 갱신한다.

**되돌림:** 사이트 표면과 prototype 변경을 별도 묶음으로 관리한다. 서버/인증 신규 기능은 범위 밖.

## W-TALK 커뮤니티

**목표:** `apps/classical_community`의 local prototype을 S-TALK의 Post/Composer/Comment 표시 구성으로 개선한다.

**선행:** W-FLUTTER 입력/피드백/overlay 계약. **읽기:** [Talk 명세](services/talk.md), 현재 local repository와 화면.

**수용:** 긴 글/이미지 실패/빈 feed/보존 draft, 취소와 저장 분리, 실패 후 입력 유지. 외부 게시가 없는 기능은 local 문구로 표현. 신고·차단·서버 업로드는 승인된 제품 범위가 없으면 실행 버튼을 만들지 않는다. app analyze/test + metadata source.path 확인/준비/check.

**되돌림:** UI adapter만 되돌리며 local persistence를 변경하지 않는다.

## W-UTILITIES 클릭·차임

**목표:** `apps/in_c_click`, `apps/in_c_chime`의 화면을 [Utilities 명세](services/utilities.md)에 맞춘다. 배포 형태는 D01의 미결정 상태를 유지하고 자동 통합/삭제하지 않는다.

**선행:** W-FLUTTER numeric/beat/theme. **수용:** 실제 controller의 BPM/Hz 범위 유지, 시작 요청과 실제 재생 상태 구분, 오류 중복 실행0, 정지 후 오래된 강조0. 사운드 엔진·백그라운드 동작을 시각 timer로 치환하지 않는다. Chime에 microphone tuner 기능을 가정하지 않는다. 각 앱 analyze/test 및 실제 오디오 확인 범위를 나눠 기록. source.path로 해당 metadata 확인/준비/check.

**되돌림:** 두 앱을 독립 adapter로 유지해 한 앱의 채택이 다른 앱의 배포를 강제하지 않는다.

## 작업 결과 기록 양식

```text
작업 ID / 변경한 C·S ID:
기준 source commit + 시작 시 미커밋 변경:
현행→목표 차이와 API 호환 방식:
실제 적용 경로·화면 / 카탈로그만 바꾼 경로:
검사 명령·환경·결과·evidence:
수동 확인 / 미확인:
iOS manifest 영향·check 결과 또는 N/A 근거:
남은 결정 / 되돌림 경계:
```

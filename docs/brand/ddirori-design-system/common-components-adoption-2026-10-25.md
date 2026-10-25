# 공통 컴포넌트 우선 반영

기준 HEAD: `6bb5f027`. 페이지 설계 전에 공유 UI를 정리하는 작업이다.
[실행 목표 프롬프트](common-components-goal.md), [공유 기준](shared-baseline.md), [C01~C39 명세](specifications/README.md)를 함께 읽는다.
이번 코드는 미커밋이며 아래 테스트는 현재 작업트리에서 수행한다. 기존 evidence를 이번 결과로 재사용하지 않는다.

## 구현 조사

API snapshot의 React 63 / Flutter 60은 타입·함수·열거형을 포함한 공개 선언 수다. 컴포넌트 수나 제품 이행률이 아니다.

| 영역 | 실제 Web 구현 | 실제 Flutter 구현·차이 |
| --- | --- | --- |
| 기초 | Text, Density, Stack, Container; 생성 CSS/TS 토큰 | Theme/Style, TextRole, Stack/Container; 생성 Dart 토큰 |
| 실행 | Button, IconButton, ToggleButton, Group, Toolbar | Button/IconButton, Toolbar/AdaptiveActions, native 선택 컨트롤 |
| 입력 | Field, Input/Search, Textarea, NumberControl, Slider, Checkbox/Switch/RadioGroup, Select | Input/Search/Number, Choices/Segments; Checkbox/Switch/Slider/Dropdown은 Material 합성 |
| 탐색 | Tabs, Navigation, AppHeader, Accordion | Tabs, PageHeader, Accordion; route와 앱 탐색은 제품 소유 |
| 자료 | Item/List, Card/Section, Table, Badge/StatusBadge, Avatar, SettingsRow | Item/List, Section, StatusBadge, Avatar, Metric/MetricGroup, SettingsRow |
| 피드백 | Banner/StatePanel, Progress/Skeleton, InlineMessage/Toast | Banner/StatePanel, Skeleton/InlineMessage, Material progress/snackbar 합성 |
| 일시적 UI | Dialog/ConfirmDialog, Menu/Popover/Tooltip | dialog/sheet helpers, MenuButton/Popover, Material Tooltip; async 저장은 host 소유 |
| 음악 표시 | PageControls, Transport, TunerMeter, BeatIndicator | PageControls, Transport/PlaybackProgress, AnnotationTools, TunerMeter/BeatIndicator |
| 브랜드 | Mark, Bach, ProductGlyph/Signature, ServiceLink | Mark, BachVector, ProductGlyph/Signature, ServiceLink |

소스: `packages/ddirori_web/src/{index,basic}.tsx`, `packages/ddirori_ui/lib/src/{components,basic,music,brand,brand_family,theme}.dart`.
현재 public API 전체 목록과 인자는 생성된 [React](specifications/api-react.md) / [Flutter](specifications/api-flutter.md)를 따른다.

## 실제 소비와 미도입 구분

- Score: `apps/in_c_sheet/lib/presentation/score_library_components.dart`가 Item/IconButton/MenuButton/Accordion 등을 합성한다. 뷰어와 연습 엔진은 앱에 남아 있다.
- Play: `apps/classical_local_library/lib/presentation/play_library_components.dart`, `play_activity_components.dart`, `play_playback_components.dart`가 목록·상태·재생 표시를 소비한다.
- Studio: `src/renderer/src/SpanProperties.tsx`가 Text/Input/IconButton과 공통 CSS를 소비한다. Item은 현재 제품에서 사용하지 않는다.
- Stage/Talk/Utilities: 서비스 명세가 있다고 해서 공통 패키지 이행 완료로 간주하지 않는다. 현재 pubspec의 직접 공통 Flutter 의존은 Score와 Play다.

## 이번 반영

R1의 평평한 행·독립 행동 요구를 공통 계약으로 먼저 수용했다.

- Web `Item.flat`과 `Item.trailing` 추가. 기존 기본 카드와 아래 `actions`는 유지.
- trailing은 제목 옆에서 시작하고 좁거나 글자가 커지면 다음 줄로 이동한다. 열기·선택·보조 버튼을 중첩하지 않는다.
- disabled는 trailing도 inert 처리하며 flat 행은 흐리게 표시한다. 사용 불가 이유는 subtitle 등으로 host가 제공한다.
- 기존 기본 카탈로그에 trailing 예제를 연결했다. 독립 `catalog/item-states.html`은 Score/Play 형태의 메모리 fixture로 제품 상태와 무관하다.
- Flutter는 이미 flat/trailing이 있으므로 제품 코드는 변경하지 않았다. 320px/200%·두 테마·두 밀도의 회귀 4개를 추가했다.
- 생성 API snapshot과 C19 계약을 갱신했다. 디자인 토큰·대표색·제품 페이지는 변경하지 않았다.

## 검증

초기 회귀: Web 신규 테스트 3개 중 2개 실패(flat/trailing 미구현) → 구현 후 3개 통과.
Web 전체 56개, Flutter 전체 37개 통과. 양쪽 typecheck/analyze 통과.
브라우저는 현재 도구에 in-app browser 실행 도구가 노출되지 않아 기존 저장소 방식의 standalone Playwright/Chrome을 사용했다.
24조합(320/840/1440 × light/dark × compact/comfortable × 100/200%)에서 넘침·겹침·선택 전후 크기·키보드 순서·inert와 터치 target을 검사한다.
최종 검사 개수·소스 변경·개발 컴파일 결과는 아래 마무리 기록을 따른다.

```sh
npm --prefix packages/ddirori_web run typecheck
npm --prefix packages/ddirori_web test
npm --prefix packages/ddirori_web run dev -- --port 8093 --strictPort
# 별도 터미널. Playwright 경로/Chrome 경로는 로컬 환경에 맞게 지정한다.
DDIRORI_PLAYWRIGHT_PATH=/tmp/ddirori-brand-tools/node_modules/playwright/index.mjs \
DDIRORI_BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
node docs/brand/ddirori-design-system/tools/verify-item-browser.mjs
```

미리보기: `http://127.0.0.1:8093/catalog/item-states.html`.
캡처·실행 결과: `out/ddirori-common-items/`. 스크린샷은 제품/실기기 검증이 아니다.
Flutter 검증은 `packages/ddirori_ui`에서 `flutter analyze`, `flutter test --reporter expanded`.
API/토큰 검사는 snapshot-spec-api --check, verify-specifications, build --check를 사용한다.

## 보존과 후속

기존 미커밋 `catalog/main.tsx`, product-review.tsx/css, product-design-r1과 작업 중 별도로 변경된 README/system-review는 편집·스테이징하지 않았다.
서비스 페이지·엔진·파일 저장·배포 설정은 변경하지 않았다. iOS 소비자는 기존 Flutter 코드 그대로이고 Studio의 현행 Input/Text/IconButton도 불변이므로 iOS 메타데이터 변경은 이번에 해당하지 않는다.

다음은 각 페이지 설계 확정 후 Score/Play의 앱 adapter에서 순차 적용하는 일이다. 공통 구현 완료와 제품 디자인 전체 적용 완료를 구분한다.
v8 ProductGlyph는 정본 문서상 아직 후보이며 기존 7개 서비스 family와 3개 제품 후보의 범위가 다르다. 승인·fallback·두 플랫폼 자산 변환을 정한 뒤 별도 반영한다.
VoiceOver/TalkBack·Safari·실제 파일/오디오와 페이지 전체 회귀는 이번 수행 범위가 아니다.
버전 변경·릴리즈 빌드·커밋·push/merge·배포는 하지 않는다.

## 마무리 검증 기록

- Web package: 6파일 / 56 tests PASS, typecheck PASS.
- Flutter package: 37 tests PASS, analyze PASS. 제품 Dart 코드는 변경 없음.
- standalone Chrome: 218 assertions PASS, 캡처 4장. 320px/200%와 1440px/100%의 light/dark 화면을 직접 확인했다.
- 개발용 카탈로그 compile: PASS. 출력은 `/private/tmp/ddirori-common-components-build-20261025`로 격리하여 기존 preview를 덮어쓰지 않았다.
- API snapshot --check, 명세 검사(39계약/6서비스/843링크), 토큰 생성물 --check, git diff --check: PASS.
- 현재 `catalog/main.tsx`의 기존 페이지 시안 연결을 포함한 package 통합 compile 결과다. 기존 미커밋 페이지 작업의 독립 제품 검증을 의미하지 않는다.
- 실행 도구: `tools/verify-item-browser.mjs`; 캡처는 자동 생성하며 보고서 `out/ddirori-common-items/report.json`에 브라우저 버전과 개별 assertion을 기록한다.

검증 대상 SHA-256:

```text
packages/ddirori_web/src/index.tsx
dc4f192c1088ae1286696039fe86867e1a8aba65220c134c9738b84343967db7
packages/ddirori_web/src/styles.css
286c6ae0d1f43aa046bf1732968521911ab46b09abf3ee5c7a85d79329a7b675
packages/ddirori_ui/test/item_contract_test.dart
596a7fb15b615ecbb0af243b89ecf6ae20632938c328778d80caec08047add03
```

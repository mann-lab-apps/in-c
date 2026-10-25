# 기본 컴포넌트 세트

2026-10-24 실제 적용 후속: [공통 동작 보완·악보함 적용·검증 및 색 비교](adoption-pilot.md). 이전 날짜별 기록은 이력으로 유지한다.

후속 구현 계약은 [39개 상세 명세](specifications/README.md)에서 관리한다. 아래 기본 세트의 구현 상태·과거 검사와 새 명세의 목표 상태를 구분한다.

2026-10-24. 현재 사용자가 수용한 중립 면·가벼운 조작부를 유지하며 기본 세트를 확장했다. 대표색은 미확정이다. 기존 [기초 규칙](foundations.md)은 값의 기준이며, 이 문서는 기본 세트의 범위·상태·플랫폼 대응을 정한다.

[React 카탈로그](http://127.0.0.1:8058/?components) · Flutter 예제 `?components` · [검증 기록](evidence/basic-set/core.json) · [브라우저 증거](evidence/basic-set/browser.json)

## 레퍼런스와 채택 판단

2026-10-24 공식 자료 확인. 아래 역할과 수치는 띠로리의 결정이며 레퍼런스 제품의 비공개 디자인 수치를 추정한 것이 아니다.

| 근거 | 채택 | 적용 경계 |
| --- | --- | --- |
| [SEED List](https://seed-design.io/react/components/list) | 행의 본문·앞뒤 요소와 구분선을 조합 | 일반 목록은 List + Item; 개별 파일 모델은 앱에 유지 |
| [SEED Text Field Input](https://seed-design.io/react/components/text-field-input) | 필드와 입력을 구분하고 label·설명·오류를 연결 | 현재 Input 호환 유지, Textarea/Select는 Field 합성 |
| [SEED Segmented Control](https://seed-design.io/react/components/segmented-control) | 한 값을 고르는 좁은 선택 그룹 | 필터 Chip의 다중 선택 및 Tab의 패널 전환과 분리 |
| [SEED Tabs](https://seed-design.io/react/components/tabs) | trigger와 content를 연결한 같은 위계 탐색 | React 자동/수동 활성화, Flutter 자동 활성화 |
| [MUI 컴포넌트 분류](https://mui.com/material-ui/all-components/) | 실행·입력·표시·피드백·표면·탐색의 누락 확인 | DataGrid·날짜·트리·고급 combobox는 이번 범위 밖 |
| [MUI themed components](https://mui.com/material-ui/customization/theme-components/) | 기본값·slot·variant를 공통 소유 | 패키지를 설치하거나 MUI 기본 외형을 복제하지 않음 |
| [MUI Menu](https://mui.com/material-ui/react-menu/) | 메뉴 표면과 항목의 역할 분리 | 임의 폼은 Popover, 명령 목록만 Menu |
| [MUI Tabs](https://mui.com/material-ui/react-tabs/) | 선택과 키보드 포커스, 패널을 연결 | Flutter는 native focus/semantics를 사용하며 DOM ARIA를 그대로 이식하지 않음 |

Excalidraw의 조밀한 작업 도구는 사보 예제에, 카카오·네이버의 제품군 연결은 기존 ProductSignature/ServiceLink에 유지한다. 장식적 손그림·노란 배경·매 행의 카드·과도한 모서리를 추가하지 않는다.

## 구현 상태표

상태: **재사용**은 기존 API, **보완**은 호환되는 선택적 확장, **신규**는 새 공개 API, **네이티브 합성**은 `ddiroriTheme()` 아래에서 실제 플랫폼 위젯을 사용하는 제공 방식이다. 네이티브 합성을 별도 자체 구현으로 집계하지 않는다.

React 공개 진입점은 `packages/ddirori_web/src/index.tsx`, 신규 본체는 `src/basic.tsx`, Flutter는 `packages/ddirori_ui/lib/ddirori_ui.dart`와 `lib/src/basic.dart`다. 양 플랫폼의 예제는 각각 `catalog/basic-set.tsx`, `example/lib/basic_set.dart`다.

| 역할 | React | Flutter | 디자인·사용 계약 |
| --- | --- | --- | --- |
| Button / IconButton | 재사용 Button / IconButton | 재사용 DdiroriButton / DdiroriIconButton | label·선택 icon·pending; primary/secondary/quiet/danger; 실행과 독립 토글만 |
| Toggle / Group | 신규 ToggleButton / Group | 재사용 selected 버튼 + Wrap/FocusTraversalGroup | controlled bool; 그룹 이름; 탭·필터 대용 금지 |
| Field / TextInput | 재사용 Input, 신규 Field | 보완 DdiroriInput, native InputDecoration | label/help/error/required/readOnly; 오류 우선 설명 연결 |
| Textarea | 신규 Textarea | 보완 DdiroriInput(maxLines:3) | 긴 내용은 여러 줄, value는 host 소유, IME 조합 중 가공 금지 |
| Search | 재사용 Search | 재사용 DdiroriSearch | 검색 query와 결과 계산은 host; 지우기 callback |
| Checkbox | 신규 Checkbox | 네이티브 Checkbox/ListTile | mixed 시 indeterminate/tristate; 여러 항목의 독립 선택 |
| RadioGroup | 신규 RadioGroup | 네이티브 RadioGroup/RadioListTile | native 한 값 선택·방향키, label과 group 연결 |
| Switch | 신규 Switch | 네이티브 Switch/ListTile | 즉시 변경하는 bool; 제출 폼의 다중 선택에는 checkbox |
| Select | 신규 Select | 네이티브 InputDecorator + DropdownButton | 단일 값, React 공통 listbox·disabled, Flutter native 메뉴; 자동완성/다중선택 제외 |
| Number / Stepper | 재사용 NumberControl | 재사용 DdiroriNumber | 유효 범위 검증, plus/minus·숫자 입력; 실제 BPM 엔진 없음 |
| Slider | 신규 Slider | 네이티브 Slider + label/semanticFormatterCallback | 단일 수치·범위·step; valueText로 단위 안내 |
| FilterChip | 재사용 Choices | 재사용 DdiroriChoices | 여러 선택값 보존; pill·check; 비어도 되는 필터 |
| Segmented | 신규 SegmentedControl | 재사용 DdiroriSegments | 한 값, React roving/disabled/Home/End; Flutter native SegmentedButton |
| Tabs / Panel | 신규 Tabs | 신규 DdiroriTabs | 같은 위계 콘텐츠 전환; inactive content의 focus 차단 |
| Typography | 재사용 Text | 재사용 ddiroriTextStyle/TextTheme | 외형 역할과 제목 의미 별도; 10역할 |
| Icon | 신규 Icon | 네이티브 Icon | 장식은 숨김, 의미는 label; 기보 glyph는 별도 |
| Avatar | 신규 Avatar | 신규 DdiroriAvatar | 48 원형, 이름·이미지·실패 대안; 이미지를 유일한 식별자로 쓰지 않음 |
| Badge / StatusBadge | 신규 Badge / StatusBadge | 네이티브 Badge, 재사용 DdiroriStatusBadge | count/짧은 상태; 상태는 기호+글자, live를 기본 적용하지 않음 |
| Divider | 신규 Divider | 네이티브 Divider | 중립 1px 선; 간격만으로 충분하면 생략 |
| List / Item | 신규 List, 보완 Item.disabled | 신규 DdiroriList, 보완 Item.flat | 평면 목록, 제목 열기·선택·보조 행동 독립 |
| Card / Section | 신규 Card / Section | 네이티브 Card, 재사용 DdiroriSection | 독립 묶음만 카드; Flutter Section은 기존 surfaceMuted 구성 유지 |
| Accordion | 신규 Accordion | 신규 DdiroriAccordion | controlled open; 보조 정보; 숨긴 입력은 focus 대상 아님 |
| Table | 신규 Table | 네이티브 DataTable + 가로 ScrollView | 헤더/빈 상태/정렬 안내; 정렬 계산은 host, 좁은 폭은 표만 스크롤 |
| Banner / Alert | 재사용 Banner | 재사용 DdiroriBanner | info/success/warning/error; 상태 기호·문구·복구 행동 |
| InlineMessage | 신규 InlineMessage | 신규 DdiroriInlineMessage | 짧은 결과 안내, 오류 시 명시적인 문구 |
| Empty / ErrorState | 재사용 StatePanel | 재사용 DdiroriStatePanel | 제목·설명·복구·선택적 진단; 캐릭터는 선택 사항 |
| Toast / Snackbar | 신규 Toast | 신규 showDdiroriToast + ScaffoldMessenger | 포커스 강탈 없음; 닫기 가능. 기본 지속 표시, host가 해제/교체 |
| Progress | 재사용 Progress | 재사용 DdiroriProgress | 값 없는 음형 / 실제 0~1 진행률; reduced motion 대안 |
| Skeleton | 신규 Skeleton | 신규 DdiroriSkeleton | 1~10줄 정적 placeholder; 한 개 로딩 의미, 콘텐츠인 척하지 않음 |
| Dialog / Confirm | 보완 Dialog, 신규 ConfirmDialog | 재사용 showDdiroriDialog / ConfirmDialog | 실제 모달, Escape/Back, 순환 focus·복귀; 실패 시 유지 |
| Sheet / Drawer | 재사용 Dialog(sheet) | 재사용 showDdiroriSheet | 이번 세트는 하단 Sheet로 제공. 별도 side drawer는 필요 시 합성 |
| Menu | 신규 Menu | 재사용 DdiroriMenuButton | 명령 목록, disabled·화살표·Home/End·문자 검색은 플랫폼 계약 |
| Popover | 신규 Popover | 신규 DdiroriPopover | 보조 폼; 웹 non-modal top layer, Flutter anchored modal route |
| Tooltip | 신규 Tooltip | 네이티브 Tooltip | 보조 설명, focus/hover/Escape; 필수 label 대용 금지 |
| Stack / Inline / Container | 신규 Stack(inline) / Container / Density | 신규 DdiroriStack(inline) / Container | 간격과 최대폭; 작은 컨트롤 wrapper 남발 금지 |
| Toolbar | 재사용 Toolbar + Group | 재사용 DdiroriToolbar | 현재 group + 일반 Tab 순서. ARIA toolbar로 오인시키지 않음 |
| AppHeader | 신규 AppHeader | 재사용 DdiroriPageHeader | 제목·설명·leading·actions, 작은 폭에서 줄바꿈 |
| Navigation | 신규 Navigation / NavigationItem | 네이티브 NavigationBar / NavigationRail | 실제 route/URL은 host; current 의미, 모바일 가로·데스크톱 세로 구성 |
| 서비스 식별/연결 | 재사용 ProductSignature / ServiceLink | 재사용 DdiroriProductSignature / ServiceLink | 가용 상태는 host, unavailable 실행 차단; 로그인·딥링크 통합 아님 |

## 공통 디자인 명세

위 표의 각 항목은 아래 공통 규칙과 [구축 계약](component-contracts.md)을 함께 따른다. 수치가 필요한 경우 tokens.json의 역할을 먼저 선택한다.

| 계열 | anatomy / slots | 형태·글자·간격 | 상태·제어 | 긴 글자 / 플랫폼 |
| --- | --- | --- | --- | --- |
| 실행 | button + label + icon/pending | control radius10, tool8; action16/600, compact14; padding 토큰 | 기본/hover/pressed/focus/disabled/busy/selected; bool·callback | 최소 높이48/compact32, 터치48; 줄바꿈, 아이콘 버튼 label 필수 |
| 필드 | label, control, description | border1/controlBorder, focus2, error2; 본문16, 보조14; label gap6 | value·change; error는 help보다 우선; readOnly는 복사 가능 | 한국어 조합 보존, textarea 확장; 웹 Select 열린 목록까지 공통 토큰, Flutter native 메뉴 유지 |
| 체크·선택 | glyph + label / option group | label14~body16, 간격8; native 체크20, switch40×24 시각면 | checked/mixed/disabled, segmented 하나; radio/Tab 의미 구분 | label 여러 줄, 네이티브 조작 영역 유지; 색 외 기호/semantics |
| 텍스트·정보 | heading/body/description + leading/trailing | 본문16/1.5, 제목20/24, 설명14; row16·gap12 | 상태와 현재값은 host가 제공 | 필수 제목 wrap, tabular 숫자, icon16/20/24; Avatar 실패 시 이름 |
| 목록·표 | rows, header, title, metadata, actions | 평면 경계1, 독립 card radius12; padding16 | 선택과 열기 독립, disabled action subtree 차단, sort callback | 표만 가로 스크롤, 목록 제목 wrap; DataTable 높이 가변 |
| 안내 | 기호, title/message, action, dismiss | neutral 면, 필요시 상태색; radius12, padding16 | success/warning/error, alert/status, 닫기·복구 요청 | 안내 문구 생략 금지; Tooltip에 오류를 숨기지 않음 |
| 오버레이 | trigger, surface, content, close/actions | panel radius16/padding12, dialog24/max560, sheet720; floating만 얕은 그림자 | open·close, focus 진입/복귀, Escape, native modal 제한 | 화면 경계 보정·본문 스크롤; popup 테마는 실제 DOM/Theme 연결 |
| 탐색·배치 | label, current, icon; children/gap | neutral 면, selection만 강조; gutter16/wide32, section24 | 탐색은 route host, 탭은 콘텐츠 host | 좁은 폭 wrap, 조밀한 도구와 터치 크기는 별도 축 |

상태를 외형만으로 시뮬레이션하지 않는다. 카탈로그의 고정 busy/disabled/mixed/오류 예제는 안내 문구로 구분하고 나머지는 직접 조작 가능하다. 모든 컴포넌트에 모든 상태를 강제로 추가하지 않는다.

## 공개 사용법과 플랫폼 차이

- React: `import { Tabs, Menu, List, Item, Textarea } from '@ddirori/ui'` 및 기존 styles.css. 새 항목은 원래 `.ddirori` 범위 안에서 사용한다.
- 밀도만 바꿀 때 React `Density`를 쓴다. 새 `.ddirori` root는 독립 테마 경계이므로 부모 색상 상속용으로 쓰지 않는다.
- React `Field`는 render function에 id/description/invalid/required 속성을 전달한다. 직접 만든 input에 이 속성을 전달해야 한다.
- Tooltip의 child는 접근성 속성을 실제 focus 대상에 전달하는 React element여야 한다. 문자열 설명 자체를 조작으로 만들지 않는다.
- React Menu의 `label`은 접근성 이름이며 화면에는 짧은 ‘더 보기’를 표시한다. 긴 작품명을 버튼 안에 반복하지 않는다. Menu 항목은 동기 명령 요청이며 host가 비동기 상태·오류를 관리한다.
- 웹 Select/Popover/Tooltip은 native Popover API의 top layer를 사용한다. DOM 위치를 이동하지 않아 theme/density/typography가 유지된다. Popover API 지원 브라우저가 대상이며 구형 엔진 지원은 별도 검증한다.
- 웹 Popover는 외부 클릭·Escape로 닫고, 키보드로 닫으면 trigger로 복귀한다. 외부 요소를 클릭했을 때는 새 focus를 빼앗지 않는다. 모달 내부에서도 해당 subtree에 둔다.
- 웹 Select는 select-only combobox다. 닫힌 컨트롤과 같은 폭·control radius·type·density로 목록을 그린다. 방향키/Home/End/PageUp/PageDown·문자 검색은 활성 항목만 이동하고 Enter/Space/Tab·항목 클릭으로 확정한다. Escape·트리거 재클릭·외부 클릭은 탐색을 취소한다. Tab은 다음 요소로 이동하며 외부 클릭의 포커스를 빼앗지 않는다. 활성 항목은 화면 안으로 스크롤하고 disabled 항목을 건너뛴다. `required`의 브라우저 폼 검증은 숨긴 native select로 유지하고 오류/포커스는 보이는 컨트롤에 전달한다.
- 웹 Select의 키보드·ARIA 구조는 [WAI-ARIA select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)를 참고했다. 외부 클릭은 값 변경 없이 취소하도록 정했다. 실제 보조기술 호환성은 제품 단계에서 별도 검증한다.
- Flutter Popover는 anchored dialog route이므로 웹보다 강한 modal 동작이다. 외부 클릭·Back/Escape·닫기와 트리거 복귀를 사용한다. 임의 폼을 menuitem으로 위장하지 않는다.
- Flutter native 컨트롤은 `ddiroriTheme`가 적용된 트리에서 사용한다. `InputDecorator(labelText)` 없이 무명 Dropdown을 만들지 않는다. native Badge는 숫자 count, DdiroriStatusBadge는 뜻을 가진 상태에 사용한다.
- Flutter 네이티브 Tooltip은 long press도 제공한다. 실제 모바일 보조기술 검수 완료를 의미하지 않는다.
- Flutter `ddiroriTheme(accent: 'violet')`로 여섯 후보를 사용할 수 있다. 생략하면 기존 활성 테마가 그대로 유지된다. 후보는 동일 생성 경로에서 나오며 수동 복제하지 않는다.
- Table의 빈 상태는 웹 empty slot, Flutter에는 열 머리글을 유지한 빈 행 또는 표 다음의 명시적 StatePanel로 제공한다. DataGrid·가상화와는 별개다.

## 실제 조합 및 이행

두 카탈로그 모두 악보함·작품/녹음·설정·사보 패널을 제공한다. fixture 검색, 선택, 메뉴, 설정 검증/확인, 도구 값 변경만 동작하며 제품 데이터는 접근하지 않는다.

이전 API는 유지했다. `DdiroriInput.readOnly/required/maxLines`, `DdiroriItem.flat`, `ddiroriTheme.accent`, React `Item.disabled`는 opt-in이다. 기존 Flutter 소비 앱의 기본값과 테마는 바꾸지 않았다. 따라서 이번 작업 자체로 앱 기능·출시 문구·캡처 동선이 바뀌지 않으며 iOS manifest는 변경하지 않는다. 실제 앱에 채택하는 다음 작업에서는 AGENTS.md의 메타데이터 갱신이 필요하다.

다음 적용은 Score 악보함의 flat Item·메뉴 → Play 설정/행 정리 → 실제 Studio의 도구 adapter 순서다. PDF·주석 좌표·오디오 시계·편집 명령은 기존 앱에 둔다. 다른 진행 중인 워크트리는 수정하지 않는다.

## 제외와 완료의 경계

고급 Combobox/Autocomplete, 날짜/시간, 가상화 DataGrid, TreeView, 드래그 정렬, 리치 편집기는 후속이다. 기본 세트가 이행 가능하다는 것은 모든 제품에 적용됐다는 뜻이 아니다. Figma는 변수·컴포넌트 매핑만 제공하며 실제 라이브러리 파일은 만들지 않았다. 실기기·VoiceOver·스토어 검수는 이 로컬 검증에 포함되지 않는다.

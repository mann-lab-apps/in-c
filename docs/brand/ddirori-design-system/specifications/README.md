# Ddirori 구현 상세 명세

2026-10-25 설계 경계 갱신: [서비스 전용 컴포넌트·테마 확장 기준](../service-theme-contract.md)을 먼저 읽는다. 이 폴더의 공통 계약·실제 API는 계속 사용한다. 아래 서비스별 구성은 도메인 체크리스트이며, 중앙 R1~R3 화면 시안이나 특정 정보 구조를 강제하는 명세가 아니다. 각 서비스에서 UX를 설계하고 공통 시각·조작 계약을 소비한다.

후속 실제 구현·악보함 적용과 최신 검사: [adoption-pilot](../adoption-pilot.md). 아래 최초 문서 검사와 구분한다.
2026-10-24 · 명세 1차 · 띠로리 / Ddirori. 이 명세는 현재 저장소의 **미커밋 변경을 포함한 조사 결과**다. 제품 전체 이행·대표색·실기기 검수를 확정하지 않는다. 코드와 설계가 다른 항목은 [차이와 결정](decisions.md)을 먼저 확인한다.

## 읽는 순서와 정본

| 담당 | 순서 |
| --- | --- |
| 공통 구현 | 이 문서 → [책임 경계](architecture.md) → [기초 규칙](foundations.md) → [공통 계약](component-rules.md) → 해당 컴포넌트 → 플랫폼 가이드 |
| React | [플랫폼](platforms.md#react) · [실제 API](api-react.md) · [타입 검사 예제](examples-react.tsx) |
| Flutter | [플랫폼](platforms.md#flutter) · [실제 API](api-flutter.md) · [네이티브 합성](native-recipes.md) |
| 앱 담당 | [현행 감사](audit.md) → 서비스 명세 → [공통 조합](patterns.md) → [작업 패키지](work-packages.md) |
| 검토자 | [검증 매트릭스](verification.md) → [문서 검사 결과](../evidence/specifications/validation.json) → [참고 근거](references.md) |

색의 값은 [color-system.json](../color-system.json), 역할·치수는 [tokens.json](../tokens.json)이 소유한다. [토큰 부록](token-reference.md)은 이 원본을 해석한 조사표이며 독립 편집 원본이 아니다. 기초 디자인의 간결한 설명은 [기존 foundations](../foundations.md)를 유지한다. 이 폴더는 **컴포넌트·플랫폼·서비스 구현 계약**의 정본이다. 이전 [basic-set](../basic-set.md)은 구성 안내, [components](../components.md)는 API 입문, 날짜가 붙은 감사/evidence는 이력이다. 충돌 시 현재 코드의 사실과 목표 설계를 함께 기록하고 이 명세에서 차이를 해소한다. 과거 통과 기록을 갱신된 코드의 통과로 복제하지 않는다.

## 공통 컴포넌트

각 행은 독립 ID를 갖는다. 관련 심벌이 여러 개면 각 API·예제와 하위 역할을 함께 명시한다. 이 목록의 모든 계약은 [공통 규칙](component-rules.md)을 포함한다.

| ID | 역할 | React | Flutter |
| --- | --- | --- | --- |
| C01 | [Button](components/c01.md) | Button | DdiroriButton |
| C02 | [IconButton](components/c02.md) | IconButton | DdiroriIconButton |
| C03 | [ToggleButton](components/c03.md) | ToggleButton | DdiroriButton |
| C04 | [Field / Input / Textarea / Search](components/c04.md) | Field, Input, Textarea, Search | DdiroriInput, DdiroriSearch |
| C05 | [Checkbox](components/c05.md) | Checkbox | Checkbox/CheckboxListTile |
| C06 | [RadioGroup](components/c06.md) | RadioGroup | RadioGroup/RadioListTile |
| C07 | [Switch](components/c07.md) | Switch | Switch/SwitchListTile |
| C08 | [Select](components/c08.md) | Select | InputDecorator/DropdownButton |
| C09 | [Number / Stepper](components/c09.md) | NumberControl | DdiroriNumber |
| C10 | [Slider](components/c10.md) | Slider | Slider |
| C11 | [FilterChip / Choices](components/c11.md) | Choices | DdiroriChoices |
| C12 | [Segmented](components/c12.md) | SegmentedControl | DdiroriSegments |
| C13 | [Tabs / Panel](components/c13.md) | Tabs | DdiroriTabs, DdiroriTab |
| C14 | [Typography](components/c14.md) | Text | ddiroriTextStyle |
| C15 | [Icon](components/c15.md) | Icon | Icon |
| C16 | [Avatar](components/c16.md) | Avatar | DdiroriAvatar |
| C17 | [Badge / StatusBadge](components/c17.md) | Badge, StatusBadge | DdiroriStatusBadge |
| C18 | [Divider](components/c18.md) | Divider | Divider |
| C19 | [List / Item](components/c19.md) | List, Item | DdiroriList, DdiroriItem |
| C20 | [Card / Section](components/c20.md) | Card, Section | DdiroriSection |
| C21 | [Accordion](components/c21.md) | Accordion | DdiroriAccordion |
| C22 | [Table](components/c22.md) | Table | native 합성 |
| C23 | [Banner / InlineMessage](components/c23.md) | Banner, InlineMessage | DdiroriBanner, DdiroriInlineMessage |
| C24 | [Empty / ErrorState](components/c24.md) | StatePanel | DdiroriStatePanel |
| C25 | [Toast / Snackbar](components/c25.md) | Toast | showDdiroriToast |
| C26 | [Progress / Skeleton](components/c26.md) | Progress, Skeleton | DdiroriProgress, DdiroriSkeleton |
| C27 | [Dialog / Confirm / Sheet](components/c27.md) | Dialog, ConfirmDialog | showDdiroriDialog, showDdiroriConfirmDialog, showDdiroriSheet |
| C28 | [Menu](components/c28.md) | Menu | DdiroriMenuButton |
| C29 | [Popover](components/c29.md) | Popover | DdiroriPopover |
| C30 | [Tooltip](components/c30.md) | Tooltip | Tooltip |
| C31 | [Group / Stack / Container / Density](components/c31.md) | Group, Stack, Container, Density | DdiroriStack, DdiroriContainer |
| C32 | [Toolbar / AdaptiveActions](components/c32.md) | Toolbar | DdiroriToolbar, DdiroriAdaptiveActions |
| C33 | [Header / Navigation](components/c33.md) | AppHeader, Navigation, NavigationItem | DdiroriPageHeader |
| C34 | [Settings / Metrics](components/c34.md) | SettingsRow | DdiroriSettingsRow, DdiroriMetric, DdiroriMetricGroup, DdiroriMetricData |
| C35 | [Brand / Product / ServiceLink](components/c35.md) | Mark, Bach, ProductGlyph, ProductSignature, ServiceLink | DdiroriMark, DdiroriBach, DdiroriBachVector, DdiroriProductGlyph, DdiroriProductSignature, DdiroriServiceLink |
| C36 | [PageControls](components/c36.md) | PageControls | DdiroriPageControls |
| C37 | [AnnotationTools](components/c37.md) | 합성 | DdiroriAnnotationTools |
| C38 | [Transport / PlaybackProgress](components/c38.md) | Transport | DdiroriTransport, DdiroriPlaybackProgress, formatDdiroriDuration |
| C39 | [Beat / Tuner](components/c39.md) | BeatIndicator, TunerMeter | DdiroriBeatIndicator, DdiroriTunerMeter |


## 제품별 구성

- [스코어: 악보함·뷰어·연습](services/score.md)
- [스튜디오: 사보 도구·속성·작업 공간](services/studio.md)
- [플레이: 작품·녹음·파일·재생](services/play.md)
- [스테이지: 공연 홍보·발견](services/stage.md)
- [톡: 커뮤니티](services/talk.md)
- [클릭·차임: 메트로놈·기준음](services/utilities.md)

제품군 이름은 설계 식별자다. 공개 출시명·앱 ID·지원 URL은 별도 승인 없이 변경하지 않는다.

## 상태 읽기

설계 상태: **현행**(현재 동작과 일치), **목표**(후속 구현 계약), **결정 필요**, **범위 밖**.
구현 상태: **공개 구현**, **부분 구현**, **네이티브 합성**, **카탈로그 전용**, **미구현**, **N/A**.
검증 상태: **소스 대조**, **기존 자동검사 기록**, **이번 문서 검사**, **실기기 미검증**을 분리한다. API가 있다고 테스트가 모두 존재하는 것은 아니다.

첨부 요청은 마지막 문장이 중간에서 끝났지만, 앞선 대화의 서비스 명세·플랫폼 가이드·이행 계획 범위를 함께 적용했다. 프롬프트 자체는 저장하지 않았다.

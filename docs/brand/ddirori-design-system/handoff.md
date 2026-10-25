# Figma 변수와 컴포넌트 대응

2026-10-25 현재 도입 기준: [공유 기준](shared-baseline.md) · [지원 환경](support-matrix.md) · [이번 검증](evidence/shared-baseline-2026-10-25/README.md). 아래 이전 기록은 날짜별 이력이며 현재 적용 범위는 위 링크를 우선한다.


구현 전달은 [상세 명세](specifications/README.md)의 C/S ID·slot·실제 API·상태 계약과 함께 한다. [조합/Figma 대응](specifications/patterns.md)은 기존 collection/mode 구조를 유지한다. 명세 작성이 Figma 파일 제작·동기화를 뜻하지 않는다.

현재 형태·간격·타이포의 기준과 토큰은 [컴포넌트 언어](component-language.md)를 따른다.

> 현재 기준: [중립 바탕·여섯 강조색·콘텐츠 12색](color-system.md). 이전 라임·올리브 배경 시안은 승인된 방향이 아니다. 라임은 임시 강조색으로만 유지하며 대표색은 검토 중이다.

이 문서는 구현을 Figma로 옮길 때의 대응표다. Figma 파일이나 연결된 라이브러리를 생성했다고 의미하지 않는다.

Figma는 변수·컴포넌트와 개발 전달의 보조 레퍼런스다. 전체 브랜드 인상과 후속 색상 검토는 [세 축의 디자인 방향](../ddirori-brand-system/reference-direction.md)을 따른다.

| 구현 | Figma 구성 |
| --- | --- |
| color-system.json neutral/accents/content | Primitive collection: neutral + 여섯 후보 + 콘텐츠 면/선. active는 임시 lime |
| tokens.json themes | Semantic collection: light/dark mode |
| density comfortable/compact | Density collection: control/gap/label |
| spacing, radius | Layout collection: 수치 변수 |
| typography → textStyles | Text styles: screenTitle/sectionTitle/itemTitle/body/description/label/action/caption/display/numeric, 한국어 fallback 기록 |
| Button kind와 상태 | Component set: kind, state, icon, label |
| Choices·Segments | selection 단일/다중, selected, disabled, icon |
| Item | leading/metadata/actions slot, selecting, selected |
| Banner·StatePanel | severity, recovery action, diagnostic |
| Toolbar·SettingsRow | density, overflow/wrap, viewport variant |
| Progress | determinate/indeterminate/reduced motion |
| PageControls·Transport·TunerMeter | 표시값과 별도 disabled/feedback 상태 |

Auto layout은 기본 가변 높이와 줄바꿈을 사용한다. 긴 한국어와 200% 크기 예제를 같은 component set에서 확인한다. 악보 지면을 작업 패널의 theme surface로 alias하지 않는다.

로고는 최신 기본/소형 SVG를 별도 asset으로 유지한다. 바흐 이미지는 지정한 보조 위치와 아이콘 후보로 구분한다. 애니메이션 수치는 모션 토큰과 실제 로딩 구현을 기준으로 전달한다.

개발 전달에는 색상 이름보다 의미별 역할을 사용한다. 수정 시 tokens.json·브랜드 입력 중 소유 원본을 먼저 바꾸고 생성 명령과 검증을 실행한다.

## 시스템 고도화 매핑

- `$spacing.lg` 같은 source alias는 Figma 변수 alias로 연결한다. source가 값의 소유자이며 Figma에서만 바꾼 값을 자동 동기화했다고 보고하지 않는다.
- Semantic color collection의 light/dark와 Density collection의 comfortable/compact는 독립 mode다. touch48은 입력 환경 제약이지 새 색 mode가 아니다.
- Typography의 size/weight/lineHeight/tracking 조합을 Text style로 만든다. 1.3 행간은130%, -0.02em은-2% letter spacing으로 대응한다. HTML heading 수준은 Figma style 이름이 아니라 개발 설명에 기록한다.
- Layout의 gutter/row/panel/dialog, Shape의 control/card/panel/pill, Motion의 duration/easing을 전달한다. layer/elevation은 플랫폼별 렌더 방식과 함께 개발 주석으로 남긴다.
- Component properties는 kind/selected/disabled/busy/density, slot은 label/icon/content/action으로 제한한다. hover/focus/error는 조합을 검토할 state set으로 제공하고 모든 조합을 독립 variant로 폭발시키지 않는다.
- 원본이 변경되면 build → --check → 대표 화면 캡처 후 갱신한다. 실제 Figma 변수나 라이브러리를 생성하지 않았다.

## 기본 컴포넌트 매핑 (2026-10-24)

[basic-set](basic-set.md)의 상태표를 component-set 목록으로 사용한다. 입력·실행·정보·피드백·오버레이·탐색으로 분류하고 Flutter 네이티브 합성과 React API를 개발 주석에 함께 기록한다. Checkbox mixed, radio single, Segmented single, Tabs panel navigation은 별도 set이다. Field는 label/help/error/required/readOnly, List는 flat/card와 leading/actions를 표현한다. Avatar fallback, Table empty/sorted, Dialog error/busy도 실제 제공하는 조합만 사용한다.

light/dark와 여섯 강조색 후보는 색 변수로, comfortable/compact와 touch48은 밀도/입력 환경으로 구분한다. 중첩 밀도는 부모의 색을 재설정하지 않는다. hover/focus 고정 시안과 실제 상태를 구분한다. 이 항목은 대응 명세이며 Figma 파일을 생성하지 않았다.

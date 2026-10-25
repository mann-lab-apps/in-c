# 레퍼런스 근거와 띠로리의 적용 판단

공식 자료 확인: 2026-10-25. 공개 문서의 원리와 아래 우리의 설계 결정을 구분한다. 수치·색상·컴포넌트를 복제하지 않는다.

| 자료 | 확인한 내용 | 띠로리의 결정 |
| --- | --- | --- |
| [당근 SEED List](https://seed-design.io/components/list) | prefix/title/detail/suffix 슬롯, 짧은 콘텐츠의 중앙 정렬과 다중행의 상단 정렬을 구분한다. 가이드의 배경색은 컴포넌트 자체의 배경이 아니라고 설명한다 | 반복 목록은 flat을 먼저 검토한다. 제목과 독립 동작을 나누고 긴 제목은 줄바꿈한다 |
| [SEED Chip](https://seed-design.io/components/chip) | container/label/prefix/suffix, 크기·변형·선택과 pressed/disabled 상태를 분리한다 | 선택과 포커스를 분리하고 공통 Choices의 체크·선택 면을 사용한다. 임의 이중 테두리로 선택을 강조하지 않는다 |
| [SEED Typography](https://seed-design.io/foundations/typography) | 크기·행높이·굵기의 원자 토큰과 의미에 따른 스타일을 구분한다. 웹 rem과 플랫폼 글꼴을 다룬다 | 화면·항목·본문·설명·숫자 역할을 선택하고 타입 스케일을 서비스마다 새로 만들지 않는다. 현재 우리 수치는 tokens.json을 유지한다 |
| [Excalidraw theme.scss](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss) | 입력·도구·떠 있는 면·hover/active·focus 등에 역할 변수가 있고 light/dark 매핑이 있다 | 무채색 작업 면과 의미 상태를 분리한다. 콘텐츠 팔레트는 주석·그래픽 데이터에 사용한다 |
| [Excalidraw ToolIcon.scss](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/ToolIcon.scss) | 도구 크기·반경을 변수로 다루고 focus-visible과 버튼 상태를 스타일링한다 | 작은 도구에 손그림 이중선·장식 그림자를 반복하지 않는다. 선택·포커스·툴팁의 책임을 나눈다 |
| [MUI Theming](https://mui.com/material-ui/customization/theming/) | palette/typography/spacing/shape 등의 테마와 하위 컴포넌트의 테마 소비를 다룬다 | 웹 토큰 상속과 Flutter ThemeExtension을 서비스 조합까지 유지한다. MUI를 패키지 의존성으로 추가하지 않는다 |
| [MUI Creating themed components](https://mui.com/material-ui/customization/creating-themed-components/) | custom component를 root/value/unit 등 슬롯으로 구성하고 테마에 연결하는 방법을 설명한다 | 전용 컴포넌트의 슬롯·상태·variant를 기록한다. 실제 재사용 요구가 생기기 전에는 앱 안에서 소유한다 |
| [MUI Typography](https://mui.com/material-ui/customization/typography/) | 테마의 타입 역할, 글꼴, 사용자 글자 설정을 반영하는 rem을 다룬다 | 글자 확대를 끄거나 고정 높이로 본문을 자르지 않는다. 시각 역할과 heading 의미는 별개로 지정한다 |

제품군 연결 축은 기존 [브랜드 방향](../../ddirori-brand-system/reference-direction.md)에서 정의한 카카오·네이버 원리를 유지한다. 이번 컴포넌트 검토에서 특정 서비스의 현재 메뉴나 통합 기능을 새로 확인했다고 주장하지 않는다. 해당 축이 서비스 화면을 같은 템플릿에 맞춰야 한다는 뜻은 아니다.

## 이번에 확인한 간극

현재 기초 명세는 역할·치수·컴포넌트 API를 이미 갖추고 있었다. 반면 진입 README는 R1~R3 화면 인계를 앞세웠고, 서비스 전용 조합의 구체적인 기준과 실행 코드가 분산되어 있었다. 따라서 이번에는 새로운 토큰 묶음이나 서비스 UX 시안을 늘리는 대신, 현재 토큰을 소비하는 로컬 조합 예제와 하나의 확장 지침을 진입점으로 추가했다.

공통 코드의 남은 차이도 있다. Flutter DdiroriSection은 기본적으로 채색·외곽선이 있는 면이고, 일부 오래된 웹 공통 스타일에는 치수가 직접 적혀 있다. 모든 섹션을 해당 컴포넌트로 감싸거나 각 앱에서 내부 CSS를 덮는 방식은 권장하지 않는다. flat 목록과 로컬 레이아웃을 조합하고, 기존 공통 코드의 변경은 실제 소비 앱 영향과 함께 따로 검증한다.

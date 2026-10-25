# 컴포넌트 형태·간격·타이포 기준

서비스 전용 조합을 만들 때는 [테마 확장 기준](service-theme-contract.md)과 [실행 예제](theme-reference/README.md)를 함께 사용한다. 아래 기초 치수는 유지하며 서비스의 화면 구조를 통일하는 규칙으로 해석하지 않는다.

2026-10-23 · 구현에 사용하는 1차 기준. 사용자 피드백에 따라 수정할 수 있으며 브랜드 최종 승인으로 간주하지 않는다. 색상은 [색상 시스템](color-system.md)을 함께 따른다.

## 레퍼런스에서 가져온 원리

[당근 SEED Chip](https://seed-design.io/components/chip)은 선택 항목이 여럿 표시되는 상황에서 주목도가 낮은 Outline Weak를 권장하며, 캡슐 모서리와 medium 굵기 레이블을 정의한다. 띠로리 필터에도 가벼운 윤곽과 보통 굵기를 적용했다. 당근의 색상·정확한 치수·동작 전체를 복제하지 않는다.

[SEED Typography](https://seed-design.io/foundations/typography)의 역할별 크기·행간 구분과 [List](https://seed-design.io/components/list)의 화면 여백·내부 간격 구분을 참고한다. 2026-10-23에 현행 문서를 확인했다. scale/semantic 스타일을 구분하는 원리를 참고한다. 아래 수치는 띠로리의 현재 제안값이다.

[Excalidraw ToolIcon](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/ToolIcon.scss)은 작은 도구의 면·모서리·선택과 `focus-visible`을 구분한다. 띠로리는 선택을 체크와 면으로, 키보드 포커스를 2px 링으로 표현한다. 손그림 빗금·이중선은 콘텐츠 그래픽에 사용하며 조작부의 기본 윤곽에 덧씌우지 않는다.

## 형태와 상태

| 역할 | 기준 | 상태 |
| --- | --- | --- |
| 필터·독립 선택 | 캡슐, 얇은 경계, 14px/500 | 선택은 옅은 면 + 체크. 굵은 밑줄·그림자 없음 |
| 주요 실행 | 10px 모서리, 행동색 면, 16px/600 | 기본·호버·누름의 명도 변화. compact는 14px |
| 보조 실행 | 흰색/중립 표면, 1px 윤곽 | 주요 실행보다 낮은 주목도 |
| 도구·분할 선택 | 8px 모서리, 14px/500 | 선택 면과 기호. 입력 의미에 따라 단일/다중 선택 유지 |
| 입력 | 10px 모서리, 식별 가능한 1px 윤곽 | 오류는 문구와 표시, 포커스는 2px |

웹의 일반 선택 버튼에서도 3px inset 밑줄을 제거했다. 포인터 클릭만으로 두꺼운 포커스 장식을 추가하지 않으며 키보드 포커스는 숨기지 않는다. 브라우저가 이전 키보드 포커스를 유지하는 경우 링이 남을 수 있다. Flutter는 Material의 포커스·입력 동작을 유지하며 경계 두께와 상태색을 지정한다.

미선택 칩의 낮은 대비 경계는 장식이다. 조작 대상은 글자와 형태로, 선택 여부는 체크·선택 semantics로도 식별된다. 입력처럼 경계 자체가 필요한 요소는 `controlBorder`를 사용한다. 체크는 스크린리더 이름에 중복 포함하지 않는다.

## 타이포

| 역할 | 크기 | 굵기 | 행간 | 사용 |
| --- | --- | --- | --- | --- |
| 화면 제목 | 24 | 700 | 1.3 | 악보함·라이브러리 제목 |
| 섹션 제목 | 20 | 600 | 1.3 | 검색·목록 구역 제목 |
| 항목 제목 | 16 | 600 | 1.3 | 악보·작품 이름 |
| 본문 | 16 | 400 | 1.5 | 설명과 입력 |
| 필터·레이블 | 14 | 500 | 1.4 | 필터·도구·필드 이름 |
| 보조 설명 | 14 | 400 | 1.5 | 작곡가·페이지 등 메타데이터 |
| 캡션 | 12 | 500 | 1.4 | 부차적인 기술 정보. 핵심 조작명에는 쓰지 않음 |
| 소개용 큰 제목 | 32 | 700 | 1.3 | 소개·온보딩에 제한. 작업 화면 기본값 아님 |

웹은 Pretendard를 유지하고, Flutter는 플랫폼 글꼴 또는 소비 앱이 등록한 글꼴을 사용한다. 20·24·32 제목에만 -0.02em 수준의 좁은 자간을 적용하며 본문·필터는 0을 기준으로 한다. 웹 글자 크기는 rem, Flutter는 사용자 TextScaler를 따른다. 고정 높이로 긴 제목이나 큰 글씨를 자르지 않는다. 수치·BPM·시간은 tabular 숫자를 우선한다.

## 간격과 밀도

| 관계 | 기본 간격 |
| --- | --- |
| 아이콘과 짧은 레이블 | 6 |
| 관련 필터·컨트롤끼리 | 8 |
| 항목 내부의 다른 정보 묶음 | 12 |
| 목록 행 안쪽 | 16 |
| 섹션 사이 | 24, 넓은 작업 화면 32 |
| 화면 좌우 여백 | 모바일 16, 넓은 화면 32 |
| 필드 레이블과 입력 | 6 |

4·8·12·16·24·32를 기본 척도로 쓴다. 6은 아이콘/레이블 같은 작은 내부 간격의 의도적인 예외다. 큰 빈 공간이나 반복 카드로 위계를 만들기 전에 제목·목록 간격·구분선을 먼저 사용한다.

포인터용 필터 높이는 기본 36, compact 32. 모바일 조작 영역은 최소 48이다. Flutter Chip은 Material의 padded tap target을 유지하므로 보이는 면과 실제 조작 영역이 다를 수 있다. 웹 coarse pointer에서는 칩 자체를 48 이상으로 확장한다. 이 수치는 최소 높이이며 200% 글자나 여러 줄 레이블에서는 늘어난다. 뷰포트 폭만으로 터치/포인터를 판정하지 않는다.

## 원본과 적용 범위

의미별 조합은 `textStyles`와 웹 `Text`, Flutter `ddiroriTextStyle`/TextTheme로 소비한다. 자세한 단위·상태·레이어 기준은 [foundations](foundations.md), 구현 경계는 [구축 계약](component-contracts.md)을 따른다.

`tokens.json`의 `typography`, `control`, `layout`, `spacing`, `radius`, `density`가 기준이다. `tools/build.mjs`가 CSS·TypeScript·Dart를 생성한다. 예를 들어 `--dd-type-label`, `--dd-control-choice-height`, `--dd-layout-section-gap`, `DdiroriTokens.typography/control/layout`을 사용한다.

현재 연결 범위는 웹 공통 Button·Choices·필드·목록 제목, 카탈로그·색상 작업실과 Flutter 공통 ThemeData·Chip·SegmentedButton·Section·Item이다. 스코어·플레이의 공통 테마 소비 화면에도 반영된다. 앱 내부에 직접 지정된 개별 크기·여백과 사보앱 전체 이행까지 완료한 것은 아니다. 앱별 임의 값을 바꿀 때에도 이 기준을 먼저 적용하고 실제 정보량과 조작 환경을 확인한다.

웹 비교용 행 배치와 실제 Flutter 앱 레이아웃은 구분한다. 악보의 기보 글꼴·오선 간격·PDF 좌표는 UI 타이포 기준으로 변경하지 않는다.

## 검증과 다음 판단

[선택](evidence/controls/light-selected.png) · [키보드 포커스](evidence/controls/light-keyboard.png) · [다크 선택](evidence/controls/dark-selected.png) · [터치 화면](evidence/controls/touch.png).

브라우저 검사는 선택/포커스 분리, 키보드 Space 조작, 36/32/48 높이, 390px와 200% 글자를 확인한다. [검사 기록](evidence/controls/browser.json). 앱 검증은 기존 검색·선택·큰 글씨·다크·오류 동작과 실제 위젯 렌더링을 사용한다. 실기기 검수와 사용자 미감 평가는 별도다.

다음 조정은 필터의 밀도, 제목과 목록의 간격, 14px 보조 글자의 실제 기기 가독성을 우선한다. 대표색 변경과 형태·타이포 변경을 한꺼번에 평가하지 않는다.

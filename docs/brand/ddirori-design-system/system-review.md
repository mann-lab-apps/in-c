# 시스템 고도화: 감사·레퍼런스·적용 경계

2026-10-24 최신 후보: [후보 08 · 모브랜드와 세 앱 고도화](../ddirori-brand-system/icon-family-v8/README.md). 음가 유지형 마스터로 모브랜드를 추가하고 세 앱의 외곽·여백을 다듬었다. 실제 제품·UI 토큰·런처는 유지한다.

2026-10-24 이전 후보: [후보 07 · 음가 유지 / 브랜드 심벌 축약](../ddirori-brand-system/icon-family-v7/README.md). 같은 외곽에 두 음형을 비교 적용했다. 실제 제품·UI 토큰·런처는 유지한다.

2026-10-24 이전 후보: [후보 06 · 재생 삼각형·연필·악보 안의 띠로리 음형](../ddirori-brand-system/icon-family-v6/README.md). 원형 Play를 큰 삼각형으로 변경하고 세 앱 내부에 원본 음형을 배치했다. 실제 제품·UI 토큰·런처는 유지한다.

2026-10-24 이전 후보: [세 앱의 공통 조형·Studio 탐색·검증](../ddirori-brand-system/icon-family-v5/README.md). 후보 자산과 리뷰 화면만 추가했으며 공통 UI·제품 코드·런처·메타데이터는 유지했다.

2026-10-24 이전 아이콘 방향: [후보 04 · 재생/편집/악보 열람의 기능 중심 구분](../ddirori-brand-system/icon-family-v4/README.md). 음형 사용은 필수가 아니다. 공통 UI와 기존 런처는 유지했다.

2026-10-24 이전 시각 후보: [음형 기반 앱 아이콘 A/B와 실제 크기 비교](../ddirori-brand-system/icon-family-v3/README.md). A 추천·사용자 승인 대기. 공통 컴포넌트·제품 UI·런처·메타데이터는 이번 아이콘 작업에서 변경하지 않았다.

[2026-10-24 추가 감사·실제 처리: 최신 기준·Studio 입력·아이콘 패밀리](../ddirori-brand-system/icon-family-v2/audit.md). 기존 제품 런처와 대표색은 유지했다.

2026-10-23 확인. MUI는 구조, 당근/SEED는 생활 UI, Excalidraw는 작업 도구, 카카오/네이버는 제품군 연결의 레퍼런스다. 현재 중립 면·가벼운 필터·타이포 크기를 유지하며 역할과 구현 계약을 보강한다. 대표색은 미결정이고 라임은 여섯 후보 중 임시 활성값이다.

## 작업 시작 시 감사

작업 트리에 제품 기능·배포·브랜드·카탈로그 변경이 이미 많이 있었다. [시작 파일 해시](evidence/system/baseline.json)는 이번 작업 전 주요 공통 소스의 기록이다. 기존 구현 전체를 이번 성과로 보지 않는다. 특히 `catalog/studio/`의 상세 사보 예제는 기존 작업이다.

| 구역 | 확인한 구현 | 빈틈 / 이번 판단 |
| --- | --- | --- |
| 색 원본 | color-system → build-palettes → tokens → CSS/TS/Dart | 유지. 브랜드 후보·콘텐츠·악보 색의 경계도 유지 |
| 글자 | 숫자 토큰과 Flutter TextTheme는 사용 중 | 역할 조합이 코드에 중복. textStyles 원본과 웹 Text/Flutter 역할 함수를 연결 |
| 간격 | control/layout 일부만 소비 | 실제 Score 외곽·검색 사이 간격과 Play 공통 Item에 연결. 전체 앱 자동 치환은 하지 않음 |
| 선택 | 웹 Choices는 체크/면, Flutter Chip·Segments는 Material 상태 | Flutter Button.selected는 semantics만 있었음. 버튼·IconButton 외형과 disabled 우선순위 보완 |
| 상태 | 웹 hover/active와 selected가 겹치는 규칙 존재 | 선택 면을 유지하고 pressed는 경계로 보완. disabled는 실행/키보드도 차단 |
| 제목 | h2 전역 스타일과 개별 위젯 크기가 혼재 | 시각적 역할과 HTML heading/Flutter semantics를 분리 |
| 테마 | .ddirori 영역 / Flutter ThemeExtension | 웹 compact 조상 선택자가 중첩 comfortable 칩에 침투. 영역별 변수로 변경하고 검사 |
| 플랫폼 기본값 | Flutter Material3 overlay·route·chip tap target | 중립 modal surface·모서리·제목을 명시. ripple·route 전환은 플랫폼 기본값임을 구분 |
| 사보 | App.tsx의 toolbarCategories, context strip, selection-toolbar, dock / SpanProperties | 실제 편집 모델은 유지. 독립 studio 예제에서 공통 UI 영향 확인; Electron 제품에 이행하지 않음 |
| 남은 개별 스타일 | Score main.dart, Studio styles.css, 공통 음악 도구 등 | [표본 목록](evidence/system/remaining-styles.json). 정규식 결과는 이행률이 아니며 기보·PDF 수치도 섞일 수 있음 |

Score 실제 소비 지점은 InCSheetApp 테마, _SearchField, _NoticeBanner, _EmptyLibrary, 로딩·제품 서명이다. _LibraryViewBar의 ActionChip/FilterChip은 공통 Flutter 테마를 소비하되 앱 자체 구성이다. _ScoreTile·QuickAccess·주석·뷰어·연습 패널에는 개별 스타일이 남는다. PlayWorkRow/RecordingRow 및 재생·활동 adapter는 공통 Item·Toolbar·IconButton을 소비한다.

## 항목별 비교

아래 ‘원본’은 링크한 공식 문서/소스에서 확인한 내용이고, 채택 수치·예외는 띠로리의 설계 판단이다. 공식 제품 내부의 비공개 수치를 추정하지 않는다. MUI 패키지를 설치하거나 현재 앱 버전을 바꾼 것이 아니다.

| 항목 | 레퍼런스의 처리 방식 / 실제 근거 | 띠로리 채택안 | 채택하지 않는 부분 | 제품별 예외 | 검증 |
| --- | --- | --- | --- | --- | --- |
| 테마 구조 | [MUI Theming](https://mui.com/material-ui/customization/theming/)은 테마에 여러 디자인 영역을 모으고 provider로 전달 | 색 원시값·의미 역할·컴포넌트 규칙을 한 생성 경로로 전달 | MUI 의존성·전체 테마 프레임워크 교체 | Flutter ThemeData/Extension, 웹 scoped 변수 | 생성물 --check, 중첩 영역 |
| 컴포넌트 규칙 | [MUI themed components](https://mui.com/material-ui/customization/theme-components/)는 defaults·styles·variants를 분리 | 기본값은 공통 구현에, 상태/slot 계약은 문서에 | 모든 도메인을 props로 일반화 | 사보 mixed 값·파일 상태는 adapter | 공개 API·계약 테스트 |
| 글자 역할 | [MUI Typography](https://mui.com/material-ui/customization/typography/)는 variant와 의미 매핑을 구분. [SEED Typography](https://seed-design.io/foundations/typography)는 scale/semantic 스타일을 구분 | screenTitle~numeric 10역할. h3도 screenTitle 외형 사용 가능 | Roboto 강제·SEED 수치 일괄 복제 | 악보 폰트/좌표 제외 | h3 역할 테스트, 한영 긴 제목 |
| 글자 확대 | MUI는 rem 기반, SEED는 읽기 위한 역할 위계 | 웹 rem·Flutter TextScaler, 최소 높이만 지정 | 화면 너비로 글자 강제 축소 | 고정 크기인 악보는 문서 확대 사용 | 200%, 제목·조작명 clipping |
| 간격 | [MUI spacing](https://mui.com/material-ui/customization/spacing/)은 배수 함수의 교체를 허용. [SEED spacing](https://seed-design.io/foundations/spacing)은 공통 척도 | 4/8/12/16/24/32, 좁은 내부 6 | 기본 8배수 일괄 채택 | 입력 padding14는 기존 시각 균형 유지 | 토큰 별칭 검사, 실제 Score |
| 목록 | [SEED List](https://seed-design.io/components/list)는 내용·보조 요소·배치 규칙을 분리 | Item title/description/actions slot, 행 padding16 | 파일 모델을 공통 UI로 이동 | 악보 카드 thumbnail·녹음 길이는 앱 | Play 실제 긴 제목/보조 정보 |
| 선택 | [SEED Chip](https://seed-design.io/components/chip)의 낮은 주목도 선택형. [Excalidraw ToolIcon](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/ToolIcon.scss)의 소형 도구 상태 | 필터 캡슐/체크, 도구 8반경, 선택 면 | 두꺼운 이중 윤곽·선택 밑줄 중첩 | 탭/단일 선택/필터는 다른 동작 계약 | pointer와 keyboard 캡처 |
| 입력 | [SEED Field](https://seed-design.io/components/field)는 레이블·도움말·오류를 함께 구성 | 이름·값·설명을 연결하고 오류 문구 유지 | 색만 빨갛게 표시 | BPM·박자 검증은 adapter | invalid 연결/숫자 범위 |
| 상태 우선 | [SEED State](https://seed-design.io/foundations/state)는 interaction/option 상태 및 겹침 설명. Radix는 hover/active 역할 구분 | disabled/loading 실행 차단 → selected 면 → hover/pressed 피드백, focus 독립 | selected를 잠깐 지우는 hover | 필드 오류 경계 + 별도 focus | 상태 조합, 중복 실행 |
| 콘텐츠 팔레트 | [Excalidraw colors](https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/colors.ts)와 [theme](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss)는 도형/도구 색을 구분 | UI 중립·행동, 콘텐츠 면/선/글자, 저장 악보 의미 분리 | 도형 채움을 전체 UI 배경으로 확장 | 저장 주석 색은 불변 | 6강조색×2테마 대비 |
| 색 계층 | [Radix scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)은 단계별 목적, [Carbon color](https://www.carbondesignsystem.com/building-blocks/foundations/color/overview)는 테마/역할 중심 | info=중립 보조 글자, 성공/주의/오류 별도, selection 독립 | 두 시스템의 전체 스케일 혼합 | 기보·성부·재생 위치는 문서 의미 | 글자4.5/아이콘·포커스3 |
| 폭과 밀도 | [MUI breakpoints](https://mui.com/material-ui/customization/breakpoints/)와 [density](https://mui.com/material-ui/customization/density/)는 서로 다른 조정 축 | 기본600/960/1280, compact와 입력 환경 별도 | 좁은 화면=터치라는 추정 | Score720 기존 전환, Studio 가변 dock 예외 | 390/840/1440, touch48 |
| 표면 | Carbon 중립 표면, Excalidraw 작은 패널 | 평면 경계 우선, floating4/modal8은 Flutter 깊이 | 매 카드 그림자/노랑 틴트 | 실제 악보 종이는 흰색 | modal·dark 실제 렌더 |
| 레이어 | [MUI z-index](https://mui.com/material-ui/customization/z-index/)는 겹침 순서를 시스템으로 관리 | base0/sticky10/popover20/modal30/notice40/tooltip50 | MUI 절대숫자 복제 | 웹 top layer·Flutter Navigator가 우선 | 모달 제한·복귀, overlay 계약 |
| 모션 | [MUI transitions](https://mui.com/material-ui/customization/transitions/)는 duration/easing 분리 | 기존120/180/1200ms, standard/exit 곡선 | 모든 요소의 확대·튕김 | 오디오 엔진 시간과 분리 | reduced motion, loader 정지 |
| 제품군 | [카카오 서비스](https://www.kakaocorp.com/page/service/service), [네이버 전체 서비스](https://www.navercorp.com/service/all)의 목적별 서비스 소개 | 이름+기능 심벌+연결 가능 상태 공통. 실제 문맥을 host가 연결 | 모든 서비스 UI가 동일하다는 추정 | Studio compact, Score 문서 중심 | unavailable 동작 차단 |
| 전달 | [Figma variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)는 변수·모드·alias 사용 | source alias→collection/mode, textStyles→Text styles | Figma 파일 제작 완료 주장 | 플랫폼별 dp/rem와 폰트 기록 | handoff 매핑표 |

현재 SEED typography 공식 경로를 다시 확인했으므로 이전 v2 문서 대신 현행 문서를 우선한다. Excalidraw master와 서비스 페이지는 변경될 수 있어 확인 날짜를 함께 기록한다.

## 이번 적용 / 후속 순서

1. **이번:** 토큰 source alias·검증, 의미 타이포 10개, 레이어/깊이/아이콘/곡선/반응형 기준, 웹 Text 및 중첩 밀도, Flutter 버튼 선택·modal 테마·Item 설명/여백. 실제 Score 외곽32와 내부12/16 연결. Play는 공통 Item/테마 변경을 소비.
2. **다음:** Choice/Segment/Tab을 동작별 공개 API로 분리. 웹 radio형 Segmented를 구현할 때 roving tabindex·방향키까지 함께 구현. 지금 Choices를 이름만 탭으로 바꾸지 않는다.
3. **다음:** Field·List의 variant 확장, ScoreTile/QuickAccess adapter 이행. 실제 파일·긴 제목·선택 테스트 동반.
4. **다음:** Menu/Popover/Tooltip의 웹 접근성 구현과 Flutter 메뉴 일관화. portal 테마 전달·레이어·복귀부터 검증.
5. **다음:** 실제 Studio 도구 하나씩 adapter 연결. mixed/undo/redo/입력모드/단축키 회귀 후 넓힌다.
6. **이후:** 뷰어·연습·서비스 전환. PDF 좌표·오디오 시계·도메인 모델은 공통 패키지 밖에 유지.

기준 문서는 [foundations](foundations.md), 상세 구축 계약은 [component-contracts](component-contracts.md), 실행 결과는 [validation](validation.md)을 따른다.

# Figma 라이브러리로 옮기는 방법

실제 Figma 문서를 작성하지 않아도 옮길 구조가 명확해야 한다. 이번 산출물의 원본은 SVG·tokens.json·HTML/CSS/JS다. 아래 페이지와 변수 구조로 Figma 라이브러리를 구성할 수 있다. 계정 연결·원격 문서 생성·게시 작업은 수행하지 않았다.

## 페이지와 변수

| 페이지 | 내용 |
| --- | --- |
| 00 Start | 제안 상태, 버전, 사용 순서, 기존 기준 문서 링크 |
| 01 Foundation | 브랜드 원칙, 워드마크, 팔레트, 글꼴 표본 |
| 02 Symbols | 기러기 원형·파생 도형·A/B 비교·작은 크기·마스크·비행 포즈·기러기 떼 |
| 03 Components | 공통 컨트롤과 상태, 명명·용도·금지 사례 |
| 04 Clef | 모바일 악보함, 태블릿 열람, 주석/연습, Light/Dark |
| 05 Chromatics | 기본/선택/입력/재생, 1400/960, Light/Dark |
| 06 Family | Play/Talk/Stage의 역할별 적용 요약 |
| 07 Review | 측정 결과, 미확인 항목, 결정이 필요한 질문 |

Primitive collection은 color/space/radius 등의 고정값, Semantic collection은 Light/Dark mode, Density collection은 Comfortable/Compact mode로 분리한다. Product collection은 앱별 accent/symbol 값을 보관하되 오류·선택 토큰을 덮어쓰지 않는다. 앱별 색을 Semantic 모드와 교차해 수십 개의 모드로 복제하지 않는다.

JSON의 `$mode`·`$density`는 이 구조를 설명하는 프로젝트용 별칭이다. 사용 중인 Figma import 플러그인이 해당 치환을 지원하는지 확인한 뒤 변환한다. 무변환 호환을 가정하지 않는다.

## 컴포넌트 명명과 변형

```text
Action/Button       hierarchy=primary|secondary|quiet
                    density=comfortable|compact
                    state=default|hover|focus|pressed|disabled|loading
Action/IconButton   kind=command|toggle / label / icon
Input/TextField     state=default|focus|error|disabled / label / hint
Navigation/Item     current=true|false / icon / label
Feedback/Message    tone=neutral|success|error / message / recovery
Workspace/Panel     side=start|end|bottom / collapsed / title
Score/State         kind=selection|input|playback|error
Brand/AppSymbol     product=parent|play|note|studio|talk|stage
Brand/Flight        pose=rise|glide
Brand/Flock         appearance=light|dark / layout / birdCount
```

아이콘 슬롯·라벨은 교체 속성, hover/focus/disabled 등은 변형으로 만든다. Light/Dark를 모든 컴포넌트 variant로 복제하지 않고 의미 변수로 전환한다. 기본 크기를 마스터에 두고 화면에서 임의로 늘인 복사본을 운영하지 않는다.

토큰은 Figma 변수 또는 텍스트 스타일과 연결하고, UI 폰트와 악보 기호 스타일을 분리한다. SVG 워드마크 텍스트를 편집하려면 동봉 Pretendard를 설치한다. 이미지에 찍힌 텍스트를 다시 그려 글꼴이라고 사용하지 않는다.

## 화면 프레임과 전달 기준

기준 프레임은 모바일 390×844, 태블릿 1024×1000, 데스크톱 1400×960, 좁은 창 960×800이다. 태블릿 프레임은 검토용 viewport이며 특정 하드웨어의 논리 해상도라고 주장하지 않는다. 상단 64/92px는 리뷰 내비게이션이며 제품 화면 설계에 포함해 복사하지 않는다.

웹 목업의 크기를 Figma에서 옮길 때는 리뷰 헤더를 뺀 실제 작업 영역을 기준으로 한다. 화면의 padding·gap·컨트롤 높이는 토큰과 명세를 사용한다. PNG는 비교용 증거이며 컴포넌트 원본은 아니다.

검토자는 같은 과업을 Light/Dark에서 비교하고, 모드·선택·입력·재생이 동시에 있을 때 구별되는지 본다. 최종 전달에는 결정한 값과 아직 사용자 관찰이 필요한 부분을 구분한다. 라이브러리 게시와 제품 적용은 후속 작업으로 남긴다.

# 띠로리 색상 시스템 — 중립 바탕과 표현색

2026-10-26 블루 통일. 공통 기본값은 브랜드 #A5D8FF / 행동·포커스 #1971C2 / 선택 #E7F5FF다. 다크 행동·포커스는 #A5D8FF, 선택은 #233344다. 일반 안내는 info 중립색을 사용한다. 아래 다른 다섯 강조색은 비교용이며 서비스 기본값으로 쓰지 않는다.

2026-10-23 기반 구현. 누르스름한 배경과 상투적인 카드 구성을 지적한 사용자 피드백을 반영했다. 이전 라임 시범안은 승인된 브랜드 방향이 아니다. 당시 공통 중립 바탕과 색의 역할을 구현하면서 여섯 후보를 열어 두고 기존 라임을 임시 유지했다. 이 운영 방식은 2026-10-26 블루 통일로 대체했다.

## 참고한 원리

| 출처 | 가져온 원리 | 띠로리 적용 |
| --- | --- | --- |
| [Excalidraw 팔레트](https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/colors.ts), [UI 테마](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/css/theme.scss) | UI의 중립 면과 그림의 색을 분리. 그림은 옅은 면과 진한 선을 조합 | 12가지 콘텐츠 색을 별도로 제공. 빗금은 표지·일러스트 예제에 사용 |
| [Radix Colors 역할](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | 배경·선택·경계·행동·글자에 서로 다른 역할을 부여 | `surfaceMuted`와 `selection` 분리. 행동의 기본·호버·누름 상태 구분 |
| [Carbon 색상](https://www.carbondesignsystem.com/building-blocks/foundations/color/overview) | 중립 회색의 명도 차이로 작업 면을 구분하고 강조색을 제한 | 밝은 테마는 흰 바탕, 다크는 무채색 층. Flutter의 Material 표면 틴트 제거 |

카카오·네이버는 서비스 연계, 당근은 정보의 간결함이라는 기존 역할을 유지한다. Wise·Monzo·Mailchimp는 라임·코럴·옐로 후보를 비교한 이력이다. 어느 서비스의 화면 전체를 복제하지 않는다. 색의 의미는 우리의 해석이며 보편적인 음악적 상징이라고 주장하지 않는다.

## 다섯 가지 역할

| 역할 | 사용 | 사용하지 않는 곳 |
| --- | --- | --- |
| 중립 | 페이지, 작업 패널, 목록, 본문, 구분선 | 브랜드를 강조하려고 배경 전체에 색조 넣기 |
| 강조 | 주요 행동, 선택, 포커스, 작은 제품 심벌 | 모든 카드와 툴바를 강조색으로 채우기 |
| 콘텐츠 | 컬렉션 표지, 빈 화면 일러스트, 다이어그램 | 성공·경고·오류의 의미를 대신하기 |
| 상태 | 성공·주의·오류 + 아이콘·문구 | 색만으로 상태 전달 |
| 악보 | 지면, 표기, 저장된 주석, 성부, 재생 위치 | 대표색 교체에 따라 문서 색 변환 |

밝은 바탕 `#FFFFFF`, 보조 면 `#F5F5F5`, 본문 `#202020`, 보조 글자 `#616161`. 다크 바탕 `#181818`, 표면 `#222222`, 보조 면 `#2C2C2C`, 본문 `#F5F5F5`. 여섯 후보에서 이 값은 동일하다. 밝은 회색 구분선은 장식용이며, 입력 윤곽은 대비가 높은 `controlBorder`를 쓴다.

## 공통 블루와 비교용 강조색

| 후보 | 대표색 후보 | 밝은 UI 행동색 | 검토할 인상과 약점 |
| --- | --- | --- | --- |
| 바이올렛 | #D0BFFF | #6741D9 | 바흐의 살구색과 잘 구분된다. Excalidraw와 인상이 가까워질 가능성 |
| 블루 | #A5D8FF | #1971C2 | 이전 선호 하늘색과 연결된다. 일반적인 소프트웨어 인상이 강할 수 있음 |
| 틸 | #96F2D7 | #087F5B | 산뜻하고 편안한 인상. 성공 상태와 구분 필요 |
| 코럴 | #FF927E | #9D4034 | 따뜻하고 친근한 인상. 바흐 피부색·오류색과의 분리 필요 |
| 옐로 | #F5D45C | #796000 | 작은 아이콘에서도 밝다. 흰 글자용 행동색은 더 어두워져야 함 |
| 라임 | #D5ED70 | #52651A | 기존 시범안과 연속성. 행동색이 올리브로 보이는 취향 문제는 남음 |

현재 제품·기준 예제·브랜드 자산은 블루를 사용한다. 파스텔 대표색을 흰 글자 버튼에 그대로 쓰지 않고, 더 진한 행동색을 사용한다. 이 결정은 현재 디자인의 통일 기준이며 상표·브랜드 독점성 검증을 뜻하지 않는다.

## 콘텐츠와 손그림

회색·빨강·분홍·자주·보라·파랑·청록·비취·초록·노랑·주황·갈색을 `Fill / Stroke / Text` 묶음으로 제공한다. Excalidraw/Open Color 계열 값을 참고하되, 일부 진한 선은 면 위 3:1 대비를 위해 조정했다. 다크 면은 밝은 면을 무채색 바탕과 혼합한 파생값이며 Excalidraw의 다크 팔레트를 그대로 옮긴 것이 아니다.

글자는 해당 묶음의 `Text`를 쓴다. `Stroke`의 3:1 대비가 작은 글자의 4.5:1을 보장하지 않는다. 콘텐츠 색이 12개 있어도 한 화면에서 모두 쓰지 않는다. 표지 묶음은 2–3가지로 시작하고 제목·기호·패턴을 함께 사용한다.

빗금은 표지와 일러스트에서만 사용한다. 버튼 윤곽, 입력, 작은 아이콘, 오선·음표에는 적용하지 않는다. 현재 비교 화면의 빗금 도형은 규칙을 설명하는 예제이며, 새 공용 일러스트 라이브러리나 완성된 캐릭터 스타일은 아니다. 승인된 음형 좌표와 바흐 형태는 유지한다.

## 원본과 소비 방법

- `color-system.json`: 중립색, 여섯 강조색, 콘텐츠 색, 공통 활성색 blue.
- `tools/build-palettes.mjs`: `palette-candidates.json`, `palette-pilot.json` 생성. 생성 JSON을 직접 편집하지 않는다.
- `tokens.json`: UI 역할, 간격, 밀도, 모션, 악보 의미. `selection/onSelection`은 일반 표면과 별도다.
- `tools/build.mjs`: 팔레트 생성 후 CSS·TypeScript·Dart 출력. `--check`는 원본과 생성물 일치를 검사한다.
- 웹: `--dd-selection`, `--dd-on-selection`, `--dd-content-blue-fill`, `--dd-content-blue-stroke`, `--dd-content-blue-text`.
- Flutter: `DdiroriStyle.of(context)['selection']`; 콘텐츠는 밝기에 따라 `DdiroriTokens.contentLight` / `contentDark`의 `blueFill / blueStroke / blueText`를 선택한다.

브랜드 자산은 `tools/build-palettes.mjs` → 브랜드 `tools/build.py` → `tools/render.mjs` → 디자인 시스템 `tools/build.mjs` 순으로 재생성한다. 브랜드 입력을 바꿨다면 스토어 원본·실제 런처·UI를 함께 검토한다. 앱별 런처 적용은 `--apply --app=score`처럼 범위를 지정하여 현재 앱의 심벌을 보존한다. Play의 v8 런처는 별도 앱 제작 도구를 유지한다.

## 적용 범위와 비교

[색상 작업실](http://127.0.0.1:8058/?compare)은 공통 React Search·Choices·Item·Button을 쓰는 웹 비교 예제다. 목록 행 배치는 이 비교 화면의 스타일이며 Flutter 악보함을 그대로 복제한 화면은 아니다. 검색·즐겨찾기·선택을 유지한 채 강조색과 테마를 바꿀 수 있다. 카탈로그는 과도한 제목 크기와 반복 패널 테두리를 줄였다.

실제 공통 Flutter 테마를 사용하는 스코어·플레이에도 중립 바탕, 표면, 글자, 선택 분리가 반영된다. 실제 앱 화면은 아래 위젯 렌더링을 확인한다. 앱 레이아웃 전체의 개편, 사보앱 테마 이행, 실제 기기나 스토어 촬영은 이번 범위에 포함하지 않았다.

- [바이올렛 비교](evidence/neutral/violet-light.png) · [블루 다크 비교](evidence/neutral/blue-dark.png) · [모바일 비교](evidence/neutral/mobile.png)
- [실제 스코어 위젯](../ddirori-brand-system/evidence/score-library-light.png) · [실제 플레이 위젯](../ddirori-brand-system/evidence/play-library-light.png)
- [대비 검사](evidence/neutral/contrasts.json): 252쌍, 중립·선택·악보 불변 조건 12개.
- [브라우저 검사](evidence/neutral/browser.json): 18개. 여섯 후보의 light/dark, 검색·선택 유지, 필터, 대화상자, 축소 모션, 390px, 200% 글자.

테스트 통과는 미감에 대한 사용자 승인과 다르다. 전체 앱의 접근성 인증이나 실기기 검수 완료로 해석하지 않는다.

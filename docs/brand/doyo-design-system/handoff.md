# Figma와 개발 전달

## 원본과 생성물

| 내용 | 원본 | 생성/참조 |
| --- | --- | --- |
| 색·밀도·모션 | tokens.json | generated/tokens.css, tokens.ts, tokens.js, doyo_tokens.dart |
| 로딩 실루엣 좌표 | assets/loader-geometry.json | SVG, loader-markup.html, loader.js, doyo_loader_geometry.dart |
| 로딩 움직임 | tokens.json motion | loader-motion.css와 Dart 상수 |
| 웹 UI 조합 | adapters/web/components.css | preview의 컴포넌트·화면 |
| Flutter 테마/로딩 | adapters/flutter/*.dart | 각 앱에 옮길 참조 구현 |
| 브랜드 인상 | ../doyo-visuals의 선택안 | 로고 원본·워드마크의 시각 기준 |

`python3 tools/build.py`는 이 폴더에서 실행해도 된다. 생성 토큰과 로딩 모션을 수동으로 따로 고치지 않는다. JSON은 이 프로젝트의 형식이며 Figma나 DTCG 표준 importer에서 그대로 동작한다고 주장하지 않는다.

## Figma 파일 구성 제안

페이지는 00 Foundations / 01 Components / 02 Patterns / 03 Note / 04 Studio / 05 Review로 둔다. 변수 collection은 Brand(원색), Semantic(light/dark), Density(comfortable/compact), Score(고정 문서색)를 분리한다. 색과 밀도를 하나의 거대한 mode 조합으로 묶지 않는다.

컴포넌트 이름 예:

- Button / variant=primary|secondary|ghost|danger / state / density
- Field / state=default|focus|error|disabled|readonly
- Mode / selected / density
- ListItem / leading / trailing / selected
- Feedback / kind=empty|error|success
- Loading / doyo / size=40|64|96 / motion=on|reduced
- ScoreSurface / selection|input|playback

텍스트·leading/trailing·보조 설명·오류 문구는 property와 slot으로 조합한다. Auto Layout은 내용 증가에 맞추고, 큰 글자에서 높이를 고정하지 않는다. 버튼 폭과 icon frame을 분리해 터치 영역을 보장한다.

앱별 색을 여섯 개씩 새로 정하지 않는다. 제품 식별용 이름과 형태를 먼저 쓰고 필요할 때 보조 면색을 제한적으로 사용한다. 지금 제공한 여러 배경색 타일은 비교 기록이며 최종 앱별 색 배정표가 아니다.

## 개발 전달

웹은 `components.css`가 토큰·로딩 모션·글꼴을 상대 경로로 로드한다. 전체 폴더 구조를 유지하거나 번들러 설정에 맞춰 import/asset 경로를 수정한다. 도요 마크업을 React로 옮길 때 aria-busy·aria-pressed·aria-describedby 같은 의미를 유지한다. 컴포넌트 파일의 전역 .doyo scope와 중첩 영역의 테마 전달을 확인한다.

Flutter는 generated/와 adapters/flutter/의 상대 경로를 유지해 가져온다. 새 테마는 색 역할을 명시한다. 글꼴은 앱의 pubspec에 별도로 등록하며, 현재 시스템이 제품 의존성·폰트 설치를 수행하지는 않는다. DoyoLoader는 AnimationController를 dispose하고 움직임 줄이기에서 정지한다. 실제 작업 상태와 접근성 announcement는 부모가 조합한다.

## 상태와 변경 관리

0.1은 적용 전 참조 버전이다. 이번 대화에서 선택된 것은 도요 실루엣 방향과 A 팔레트다. 다크 파생색, 컴포넌트 치수, 레이아웃과 로딩 벡터는 실제 화면 검증을 통해 다듬는 설계안이다.

앱에 적용한 화면, 사용한 버전, 예외 토큰과 근거를 기록한다. 일회성 색상을 컴포넌트에 직접 넣는 대신 의미 역할을 추가할 필요가 있는지 확인한다. 플랫폼 고유 파일 선택기·권한 UI를 브랜드에 맞추려고 대체하지 않는다.

Figma 파일을 실제 계정에 생성하거나 라이브러리를 publish한 결과는 아니다. 코드·문서와 검토 화면을 옮겨 사용할 수 있도록 구성했다.

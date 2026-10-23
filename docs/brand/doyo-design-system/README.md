# 도요 디자인 시스템 0.1

2026-10-22 · 앱 적용을 위한 기준과 참조 구현 · 제품 미적용

도요의 v4 실루엣과 사용자가 선택한 코코아·블루그레이 팔레트를 공통 UI 문법으로 정리했다. 친근함은 단색 새와 리듬에서 만들고, 반복 작업에서는 읽기·선택·입력의 명료함을 우선한다. **불확정 로딩은 회전 스피너 대신 둠칫둠칫하는 도요새를 사용한다.**

## 먼저 볼 것

- [실행 가능한 미리보기](preview/index.html): 기준, 컴포넌트, 악보 열람, 사보, 적용 순서. 밝은/다크 전환과 실제 상태 조작.
- [컴포넌트 화면](evidence/components-light.png) · [다크 열람](evidence/reader-dark.png) · [사보 화면](evidence/studio-light.png).
- [움직이는 로딩 SVG](assets/doyo-loader.svg) · [정지 대안](assets/doyo-loader-still.svg).
- [기준 JSON](tokens.json) · [CSS](generated/tokens.css) · [TypeScript](generated/tokens.ts) · [Dart](generated/doyo_tokens.dart).

저장소 루트에서 아래 명령을 실행하고 주소를 연다. 미리보기는 파일·계정·음원에 접근하지 않는다.

```sh
python3 -m http.server 8057 --bind 127.0.0.1
```

<http://127.0.0.1:8057/docs/brand/doyo-design-system/preview/>

## 적용할 때 읽는 순서

| 문서 | 담은 기준 |
| --- | --- |
| [기초](foundations.md) | 색, 타입, 간격, 밀도, 상태와 브랜드 경계 |
| [컴포넌트](components.md) | 크기, 변형, 상태, 키보드, 로딩과 복구 |
| [악보·사보](score-apps.md) | Clef & Staff와 Chromatics의 작업 차이 |
| [제품 적용](adoption.md) | 실제 소스 대응, 단계, 회귀·메타데이터 체크 |
| [Figma와 개발 전달](handoff.md) | 변수·컴포넌트 구조와 파일 사용법 |
| [검증](validation.md) | 재현 명령, 확인한 것과 남은 제품 검증 |
| [자산 출처](assets/PROVENANCE.md) | 선택 시안, 로딩 벡터, 글꼴과 악보 예제 |

## 가져다 쓸 구현

웹은 [components.css](adapters/web/components.css)를 로드하고 상위에 `.doyo`, `data-theme="light|dark"`, `data-density="comfortable|compact"`를 둔다. 기본 CSS는 해당 영역에 한정한다. 부모와 독립적인 중첩 `.doyo` 영역에는 테마도 명시한다.

Flutter는 [doyo_theme.dart](adapters/flutter/doyo_theme.dart)의 `doyoTheme()`와 [doyo_loader.dart](adapters/flutter/doyo_loader.dart)의 `DoyoLoader`를 사용한다. `generated/`를 함께 옮겨 상대 경로를 유지한다. 테마와 로딩 위젯은 참조 구현이며 독립 배포 패키지는 아니다. React 전용 컴포넌트 라이브러리는 아직 만들지 않았다.

## 첫 적용 추천

**Clef & Staff의 악보함 한 화면부터** 적용한다. 검색·버튼·목록·로딩에서 공통 문법을 검증한 뒤 악보 보기와 Chromatics 도구로 넓힌다. 악보 렌더러, 파일 저장, 주석 좌표와 오디오 엔진을 디자인 교체와 한 번에 변경하지 않는다.

현재 공개명 in C / Clef & Staff / Chromatics, 패키지·앱 아이콘·배포 YAML은 바꾸지 않았다. Note·Studio는 적용 예시의 역할명이다. [이전 기러기 제안](../gireogi-design-system/README.md)은 탐색 기록으로 보존한다. [도요 브랜드 시안](../doyo-visuals/README.md)의 선택과 조형 흐름이 현재 디자인 기준이다.

## 생성과 검증

```sh
python3 docs/brand/doyo-design-system/tools/build.py
```

정확한 색과 모션 값은 `tokens.json`, 로딩용 벡터의 좌표는 `assets/loader-geometry.json`이 원본이다. 생성 파일을 손으로 편집하지 않는다. 대비·브라우저 검증과 Flutter 참조 구현 확인 방법은 [validation.md](validation.md)에 있다.

# 띠로리 공통 디자인 시스템

현재 기준은 [기초 규칙](foundations.md)과 [컴포넌트 구축 계약](component-contracts.md)이다. [시스템 감사·항목별 레퍼런스 비교](system-review.md)에 MUI·SEED·Excalidraw의 채택/제외 근거와 적용 범위를 기록했다. [형태·간격 요약](component-language.md)은 빠른 입문용이다.

[시스템 기준 화면](http://127.0.0.1:8058/?foundations) · [독립 사보 검증 예제](http://127.0.0.1:8062/studio.html). 두 화면은 실제 앱과 구분한다.

> 현재 기준: [중립 바탕·여섯 강조색·콘텐츠 12색](color-system.md). 이전 라임·올리브 배경 시안은 승인된 방향이 아니다. 라임은 임시 강조색으로만 유지하며 대표색은 검토 중이다.

현재 브랜드 운영·제작 자산과 두 앱의 시범 적용은 [브랜드 운영 체계](../ddirori-brand-system/README.md)를 따른다.

테마·역할·컴포넌트 구조는 MUI, 서비스 연계는 카카오·네이버, 정보의 간결함은 당근, 색상·그래픽은 Excalidraw를 참고한다. Radix와 Carbon은 색의 역할·상태·중립 작업 면을 설계하는 보조 기준이다.

[현재 색상 시스템](color-system.md)은 중립 UI, 여섯 강조색 후보, 콘텐츠용 12색을 구분한다. 공통 Flutter 테마와 React 컴포넌트에 연결했으며 대표색은 아직 검토 중이다.

- [같은 악보함에서 색상 비교](http://127.0.0.1:8058/?compare) · [비교 화면 캡처](evidence/neutral/violet-light.png).
- [실행 가능한 웹 카탈로그](preview/index.html): 컴포넌트, 악보함, 악보 보기, 연습 도구, 사보 작업, 플레이.
- [Flutter 패키지](../../../packages/ddirori_ui/README.md) · [Flutter 예제 소스](../../../packages/ddirori_ui/example/lib/main.dart).
- [React 패키지](../../../packages/ddirori_web/README.md) · [React 예제](../../../packages/ddirori_web/catalog/main.tsx).
- [악보함](evidence/web-1-light.png) · [다크 사보](evidence/web-5-dark.png) · [모바일 뷰어](evidence/web-3-dark.png).
- [로딩 SVG](assets/loader.svg) · [정지 대안](assets/loader-still.svg).

## 실행

저장소 루트에서 `python3 -m http.server 8057 --bind 127.0.0.1`을 실행하고 <http://127.0.0.1:8057/docs/brand/ddirori-design-system/preview/>를 연다. 미리보기는 파일·마이크·음원을 사용하지 않는다.

Flutter는 `packages/ddirori_ui/example`에서 `flutter pub get`, `flutter run -d chrome`으로 실행한다. 웹은 `packages/ddirori_web`에서 `npm run dev`로 개발한다. 실행 환경과 전체 재현 명령은 [검증](validation.md)에 있다.

## 읽는 순서

| 문서 | 목적 |
| --- | --- |
| [기존 컴포넌트 조사](inventory.md) | 실제 악보앱 심벌, 의존성, 유지할 동작과 새 UI 대응 |
| [공통 컴포넌트 감사](component-audit-2026-10-22.md) | 디자인과 Flutter API의 차이, 공통·제품 전용 판단과 실제 채택 |
| [플레이 전용 컴포넌트 감사](play-component-audit-2026-10-22.md) | 작품·녹음·파일·큐·감상 UI의 앱 내부 경계와 검증 |
| [기초 규칙](foundations.md) | 색·타입·밀도·상태·모션·플랫폼 차이 |
| [컴포넌트 API](components.md) | 실제 구현, 입력 계약, 선택·오류·로딩 |
| [악보와 사보 패턴](score-apps.md) | 공연 모드·주석·숫자·음정·작업 공간 |
| [제품 도입](adoption.md) | 기존 소스에 연결할 지점과 회귀·복구 |
| [Figma 대응](handoff.md) | 변수·모드·컴포넌트 속성 대응 |
| [검증](validation.md) | 실행 결과, 증거, 기기 검증 경계 |

## 원본과 생성물

`tokens.json`이 UI 역할·간격·밀도·모션의 원본이다. 색 원본은 [color-system.json](color-system.json)이며 생성된 [활성 팔레트](palette-pilot.json)의 `light`와 `darkProposal`을 참조하고, 로고 좌표는 [round-4](../ddirori-visuals/round-4/motif.svg)에서 읽는다. 과거 proposal/history는 사용하지 않는다.

`node docs/brand/ddirori-design-system/tools/build.mjs`가 Dart·CSS·TypeScript·좌표·자산을 생성한다. `--check`는 현재 파일과 원본의 일치를 확인한다. `generated/`와 Flutter의 `src/generated/`는 손으로 편집하지 않는다.

Flutter는 앱 모델 없이 표시값·callback·slot을 받는다. 웹은 같은 역할 토큰을 쓰고 React와 브라우저의 입력·포커스 동작을 사용한다. 두 플랫폼은 계약과 문법을 공유하며 서로의 위젯 코드를 import하지 않는다.

공통 기반과 독립 예제에 더해 플레이·스코어의 일부 실제 화면에 도입했다. 남은 PDF·사보·오디오 도구 표시와 제품 전체 이행은 [도입 순서](adoption.md)에 따라 진행한다.

# 검증과 실행 방법

## 시스템 고도화 검증 · 2026-10-23

현재 설계는 [foundations](foundations.md), 근거·적용 범위는 [시스템 감사](system-review.md), 구축 계약은 [component-contracts](component-contracts.md)를 따른다. [이번 실행 요약·소스/캡처 해시](evidence/system/summary.json). 아래 과거 검증은 당시 기록으로 보존한다.

| 검사 | 이번 결과 |
| --- | --- |
| 생성 / 단위·alias | build --check 일치, token-model 3개. 순환·누락 실패, 배열·자간 소수·rem/layer 단위 확인 |
| React | 24개 계약 테스트, 타입 검사·Vite 빌드 통과 |
| Flutter 공통 | 23개 테스트, analyze 통과. selected fill/disabled 우선·중복 실행·numeric role·modal 중립·키보드 차단 포함 |
| 실제 Score | 7개 widget 시나리오, 변경 main/test analyze 통과. 검색·긴 혼합 제목·320/200%·1024·dark·복구 |
| 실제 Play | brand 5개 + library/playback/activity 10개. 변경 test analyze 통과. 실제 작품 목록까지 스크롤 촬영 |
| 웹 | 시스템21 + 조작부7 + 팔레트18 검사. 중첩 comfortable/compact·h3 의미/24px 외형·error/focus·modal 복귀·reduced motion |
| 사보 예제 | 기존 독립 Studio의145개 검사·10캡처. 실제 Electron 앱 편집·저장·오디오 검증 아님 |
| 색 | 300쌍 대비, 중립/선택/악보 불변 조건12개. disabled 대비도 추가 검사했지만 WCAG 일반 필수 텍스트와 동일한 의미로 해석하지 않음 |
| iOS 메타데이터 | 두 앱 mode:check 통과. source pending/content.reviewed false, 버전·commit 유지 |

### 직접 열어 확인한 화면

- 실제 Score: [악보함](evidence/system/score-library-light.png), [긴 제목 검색](evidence/system/score-library-search-light.png), [320px·200% 다크](evidence/system/score-library-large-dark.png), [넓은 폭](evidence/system/score-library-wide-light.png).
- 실제 Play: [첫 화면](evidence/system/play-library-light.png), [작품·녹음 목록](evidence/system/play-work-list-light.png). 제목16/600과 설명14/400, 늘어나는 행 높이를 확인했다.
- 웹 계약 예제: [밝은 화면](evidence/system/foundations-light.png), [다크](evidence/system/foundations-dark.png), [390px·200%](evidence/system/foundations-large.png). 실제 앱 화면과 구분한다.
- 기존 사보 예제: [light](evidence/system/studio/light-1440-1.png), [dark](evidence/system/studio/dark-1440-1.png). 정확한 악보 지면을 유지하고 도구 선택·disabled가 구별된다.

시각 판단: 중립 작업 면과 가벼운 선택 상태는 유지된다. 긴 제목/설명은 줄바꿈하며 UI glyph와 레이블이 겹치지 않는다. Score의 프로필 이름 말줄임·넓은 그리드 제목의 기존 2줄 말줄임·QuickAccess 별도 크기, Play의 카드 안 카드와 일부 굵은 제목, 사보 예제의 기존 dock 토글 스타일은 후속 개선 대상이다. 전체 앱이 새 토큰으로 이행됐다는 뜻이 아니다. 200%는 내용이 세로로 길어져 스크롤이 필요하며 한 화면 수용을 목표로 글자를 줄이지 않았다.

`before-*` 두 장은 시작 시 보존한 기존 캡처다. 이번 Score fixture의 긴 제목 추가와 일부 즐겨찾기 상태가 달라 전체 이미지 픽셀 차이를 미감 개선 점수로 사용하지 않는다. Play 첫 화면은 같은 위젯 fixture에서 확인했다. 실제 기기에서 플랫폼 폰트·Dynamic Type·VoiceOver와 pointer/keyboard 혼합 환경 검수가 남아 있다.

실패 수정: Flutter 불필요 import lint를 제거했고, 추가 Play 스크롤 캡처의 `.first` finder가 아직 생성되지 않은 lazy 행에서 실패해 작품 ID를 지정한 predicate로 수정한 뒤 해당 5개 시나리오를 다시 통과했다. 검사 경고를 숨기거나 실패 기대값을 완화하지 않았다.

### 이번 검증 재현

루트에서 `node --test docs/brand/ddirori-design-system/tools/token-model.test.mjs`, `node docs/brand/ddirori-design-system/tools/verify-palettes.mjs`, `node docs/brand/ddirori-design-system/tools/verify-artifacts.mjs`를 실행한다.

웹 개발 서버8058에서 `verify-system-browser.mjs`, `verify-controls-browser.mjs`, `verify-palette-browser.mjs`를 실행한다. 이 세 로컬 도구는 현재 `/tmp/ddirori-brand-tools`의 Playwright와 설치된 Chrome을 사용한다. 다른 환경에서는 해당 도구의 런타임 경로를 환경에 맞게 준비한다.

사보는 `packages/ddirori_web`의 `npm run dev:studio`로8062 서버를 실행한다. 루트에서 `DDIRORI_PLAYWRIGHT_PATH=/tmp/ddirori-brand-tools/node_modules/playwright/index.mjs DDIRORI_BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' DDIRORI_STUDIO_EVIDENCE=docs/brand/ddirori-design-system/evidence/system/studio node packages/ddirori_web/catalog/studio/verify-browser.mjs`를 실행했다.

실제 앱 캡처는 각 앱에서 `DDIRORI_BRAND_CAPTURE=true DDIRORI_BRAND_FONT=/tmp/ddirori-brand-tools/Pretendard.ttf DDIRORI_MATERIAL_FONT=/opt/homebrew/share/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf flutter test test/brand_pilot_test.dart`를 실행한다. 폰트 경로는 로컬 환경에 맞춘다. Play 추가 계약은 `flutter test test/play_library_components_test.dart test/play_playback_components_test.dart test/play_activity_components_test.dart`다. 파일·음원·저장 상태는 fixture이며 실기기/스토어 캡처를 대신하지 않는다.

## 이전 반복의 기록


형태·타이포·간격 후속 검증은 [컴포넌트 언어](component-language.md)와 [조작부 브라우저 기록](evidence/controls/browser.json)을 따른다. 선택/키보드 포커스, 36·32·48 최소 높이, 390px·200% 글자를 확인했다. 공통 React 23개·Flutter 20개, 스코어 7개·플레이 14개 테스트와 두 앱의 메타데이터 형식 검증을 통과했다.

## 중립색 후속 검증 · 2026-10-23

[현재 색상 시스템](color-system.md): 공통 React 23개, 공통 Flutter 20개, 스코어 시범 7개, 플레이 시범·컴포넌트 14개 테스트를 통과했다. 색 대비 252쌍과 중립/선택/악보 불변 조건 12개, 브라우저 18개 검사와 브랜드 자산 164개 검사를 통과했다. Flutter 공통 패키지 analyze와 웹 빌드도 통과했다. 앱 위젯 캡처는 실기기·스토어 촬영 승인을 대신하지 않는다. 아래 검증은 이전 반복의 기록을 포함한다.

검증 대상은 공통 패키지와 독립 카탈로그다. 제품 앱의 파일·오디오·마이크·하드웨어를 연결한 검증과 구분한다. 실제 실행 기록은 evidence/의 JSON을 따른다.

## 재현 순서

저장소의 Node 의존성과 Flutter SDK가 준비된 환경에서 실행한다. 사용한 Flutter·Dart 버전은 [Flutter 실행 기록](evidence/flutter-validation.json)에 있다.

```sh
node docs/brand/ddirori-design-system/tools/build.mjs
node docs/brand/ddirori-design-system/tools/build.mjs --check
node docs/brand/ddirori-design-system/tools/audit.mjs
node docs/brand/ddirori-design-system/tools/verify-artifacts.mjs
node docs/brand/ddirori-design-system/tools/verify-flutter.mjs
```

React는 packages/ddirori_web에서 다음을 실행한다.

```sh
npm test
npm run build
```

서버는 저장소 루트에서 실행한다.

```sh
python3 -m http.server 8057 --bind 127.0.0.1
```

<http://127.0.0.1:8057/docs/brand/ddirori-design-system/preview/>에서 React 카탈로그를 연다.

Flutter 웹 빌드 결과는 packages/ddirori_ui/example/build/web를 루트로 별도 제공한다.

```sh
python3 -m http.server 8059 --bind 127.0.0.1 --directory packages/ddirori_ui/example/build/web
```

<http://127.0.0.1:8059/?page=1>은 Flutter 악보함이다. page 0~5, theme=dark를 지원한다. Flutter 개발 실행은 example/에서 flutter run -d chrome을 사용한다.

## 브라우저 검사

사용 가능한 Playwright 모듈과 Chromium을 다음 환경 변수로 지정할 수 있다. 기본값은 설치된 playwright와 그 브라우저다.

```sh
DDIRORI_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs \
DDIRORI_BROWSER_PATH=/absolute/path/to/chromium \
node docs/brand/ddirori-design-system/tools/verify-browser.mjs

DDIRORI_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs \
DDIRORI_BROWSER_PATH=/absolute/path/to/chromium \
node docs/brand/ddirori-design-system/tools/capture-flutter.mjs
```

React 주소는 DDIRORI_CATALOG_URL, Flutter 주소는 DDIRORI_FLUTTER_URL로 바꿀 수 있다. 테스트는 독립 Chromium에서 수행하며 인앱 브라우저나 실제 모바일 기기 검수로 보고하지 않는다.

## 확인 결과

- 생성 토큰·Flutter 사본·승인 자산의 일치와 대비: [산출물 검사](evidence/artifact-validation.json).
- 기존 30개 심벌·필드·색·일부 배치 수치: [조사 기록](evidence/component-inventory.json).
- Flutter 패키지 analyze·상호작용 테스트, 예제 analyze·24개 화면 조합·웹 빌드: [실행 로그](evidence/flutter-validation.json).
- 웹 컴포넌트 계약과 타입·빌드: [웹 실행 기록](evidence/web-validation.json).
- React의 390·840·1440 폭, 밝은/다크·compact·200% 글자, 검색/복구·선택·페이지·숫자·튜너·modal·키보드·축소 모션·스타일 범위: [브라우저 검사](evidence/browser-validation.json).
- 컴파일된 Flutter 여섯 화면의 실제 렌더링·접근성 노드: [Flutter 브라우저 기록](evidence/flutter-browser.json).

[웹 악보함](evidence/web-1-light.png), [다크 사보](evidence/web-5-dark.png), [모바일 뷰어](evidence/web-3-dark.png), [Flutter 악보함](evidence/flutter-1-light.png), [Flutter 사보](evidence/flutter-4-dark.png)를 시각적으로 확인했다.

수정한 문제는 200% 글자에서 악보 자리 영역의 고정 높이 overflow, 중복된 웹 progressbar 의미, 동기 modal 행동의 비활성 전환에 따른 포커스 유실, Material 자식의 ink가 가려질 수 있는 section 배경이다.

## 제품 단계에서 남은 확인

Android/iOS 실제 터치·스크린리더·스타일·키보드·상태 표시줄, 펜·페달·마이크·오디오 시간·파일·PDF·사보 출력은 제품 연결 뒤 확인한다. 카탈로그의 샘플 악보와 수동 박 이동은 이 기능을 증명하지 않는다.

Flutter 웹은 현재 플랫폼 글꼴 fallback 과정에서 fonts.gstatic.com 요청이 관측됐다. 오프라인 웹 제공이 필요하면 라이선스가 확인된 한국어 TTF/OTF를 앱에 등록해 별도로 확인한다. 웹 React 카탈로그의 Pretendard WOFF2는 로컬 번들이다.

Flutter 웹 빌드는 현재 SDK에서 사용하지 않는 Cupertino 아이콘 family 경고를 출력했지만 빌드와 캡처가 완료됐다. 실제 도입 플랫폼에서 사용하는 아이콘은 별도 확인한다. 다크 역할값은 컴포넌트에서 확인한 파생안이며 모든 제품·문서 효과의 다크 검수를 뜻하지 않는다.


초기 라임 반복의 검증은 [이전 실행 결과](refresh-2026-10-23.md)와 [당시 요약](evidence/refresh/summary.json)에 보존한다. 최신 검증은 이 문서 상단의 시스템 고도화 결과를 따른다.

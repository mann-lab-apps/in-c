# 공통 테마와 서비스 전용 컴포넌트의 조합 기준

2026-10-25. [서비스 테마 확장 기준](../service-theme-contract.md)의 실행 예제와 검증 기록이다. 새 서비스 화면 설계 revision이 아니다.

## 무엇을 고도화했는가

- **역할 분리:** 중앙 시스템은 시각 문법·공통 조작, 서비스는 UX·전용 컴포넌트·엔진을 소유한다. R1~R3는 탐색 이력으로 표시했다.
- **적용 기준:** 무채색 표면, 타입 역할, 간격 관계, 형태, 입력 방식·밀도, 복합 상태, 브랜드 사용과 전용 컴포넌트의 슬롯·책임·검수 항목을 한 지침에 모았다.
- **실행 코드:** 기존 공개 Item/Input/Choices/Button/IconButton을 그대로 소비하는 flat 목록과 속성 그룹을 React·Flutter에 추가했다. 공유 패키지의 새 공개 컴포넌트가 아니라 서비스 내부 조합의 본보기다.
- **근거:** [당근·Excalidraw·MUI 공식 자료](references.md)에서 확인한 원리와 띠로리의 설계 결정을 구분했다.

기존 제품 코드·공통 패키지의 production 소스·토큰 기본값은 이번 작업에서 수정하지 않았다. 서비스의 미커밋 구현과 배포 메타데이터도 이 작업에서 편집하지 않았다. 기본 테마에 연결된 기존 앱의 외형을 바꾸는 일괄 변경이 아니다.

## 실행과 소스

[정적 기준 화면](preview/catalog/theme-reference.html) · [웹 라이트](evidence/web-light-1280.png) · [웹 다크](evidence/web-dark-1280.png) · [좁은 화면](evidence/web-light-320.png) · [Flutter 속성 그룹](evidence/flutter-light-320-properties.png).

```sh
# 저장소 루트
cd packages/ddirori_web
npx vite --config theme-reference.config.ts
# http://127.0.0.1:8100/catalog/theme-reference.html

# 정적 번들 재생성: 이 예제의 preview/만 출력한다
npx vite build --config theme-reference.config.ts
```

개발 화면은 theme=light/dark, accent=violet/blue/teal/coral/yellow/lime 쿼리를 지원한다. 화면의 선택기로도 바꿀 수 있다. 바이올렛은 이 예제의 초기 비교 후보이며 대표색 확정이 아니다. `data-accent` 속성 자체가 공통 테마 API인 것은 아니다. 비교 화면은 기존 팔레트 후보·토큰 원본을 해석해 root CSS 변수를 넣고, 자식 조합은 이를 그대로 상속한다.

```sh
cd packages/ddirori_ui/example
flutter pub get
flutter run -d chrome -t lib/theme_reference_main.dart
```

Flutter는 바이올렛 후보의 라이트·다크와 실제 공유 테마·native 컨트롤을 사용한다. 플랫폼 글꼴을 기본으로 하며 소비 앱이 글꼴을 등록할 수 있다. 웹과 같은 DOM을 흉내 내지 않는다.

| 코드 | 역할 |
| --- | --- |
| [웹 조합](../../../../packages/ddirori_web/catalog/theme-recipes.tsx) · [CSS](../../../../packages/ddirori_web/catalog/theme-recipes.css) | 서비스 내부 컴포넌트의 합성과 테마 상속 |
| [웹 기준 화면](../../../../packages/ddirori_web/catalog/theme-reference.tsx) | 타입·목록·속성 그룹·상태의 검토 호스트 |
| [Flutter 조합](../../../../packages/ddirori_ui/example/lib/theme_recipes.dart) | 같은 의미 역할을 native 위젯으로 합성 |
| [Flutter 기준 화면](../../../../packages/ddirori_ui/example/lib/theme_reference_main.dart) | 테마·TextScaler를 유지하는 독립 예제 |

공통 컴포넌트의 내부 selector를 서비스 CSS로 덮지 않는다. 예제의 작업 이름·샘플 구간을 실제 제품의 화면 구조나 기능 요구로 복사하지 않는다.

## 검증

2026-10-25 작업 공간 기준. 기존 미커밋 변경도 포함한 현재 소스를 검사했다. 아래는 제품 전체의 디자인 승인이나 접근성 인증이 아니다.

| 검사 | 결과 |
| --- | --- |
| React 타입 | `npm run typecheck` 통과 |
| React 기존 공통 동작 회귀 | `npm test`: 6파일·56테스트 통과 |
| 독립 웹 프로덕션 번들 | `npx vite build --config theme-reference.config.ts` 통과 |
| Chrome 기준 화면 | 320/840/1280 × 라이트·다크 × 여섯 후보 × 텍스트100/200% = 72조합, 총371확인 통과. [실제 결과](evidence/web-results.json) |
| 웹 추가 상호작용 | 열기·저장 독립, 저장 선택 의미, disabled 슬롯 포커스 제외, 오류 설명, selected+focus/invalid+focus, 공통 Select의 키보드 테마 전환, coarse pointer48 확인 |
| Flutter 기준 예제 | 320/1024 × 라이트·다크 × TextScaler1/2의 8조합 통과. 저장·오류·레이아웃 예외 검사 |
| Flutter 공통 패키지 회귀 | `flutter test`: 38테스트 통과 |
| Flutter 정적 검사 | 새 lib2개와 예제 테스트 analyze 통과 |
| 토큰·승인 자산 생성 일치 | `node docs/brand/ddirori-design-system/tools/build.mjs --check` 통과 |
| 시각 검토 | 웹1280 다크·320 라이트, Flutter320 라이트 속성 그룹의 실제 캡처를 열어 위계·중립 면·줄바꿈·선택·오류를 확인 |

웹 검사 재현:

```sh
# 8100 개발 서버를 실행한 뒤 저장소 루트에서
# Playwright 설치 경로와 Chrome 경로는 환경에 맞게 지정한다.
DDIRORI_PLAYWRIGHT_PATH=/path/to/playwright/index.mjs \
DDIRORI_BROWSER_PATH=/path/to/chrome \
node docs/brand/ddirori-design-system/theme-reference/verify-browser.mjs
```

`DDIRORI_THEME_URL`로 정적 빌드 URL을 검사할 수 있다. 기본 evidence는 이 폴더 아래다. Playwright·브라우저를 프로젝트 의존성으로 새로 추가하지 않았으며 사용자 로그인 브라우저도 사용하지 않았다.

Flutter 검사 재현:

```sh
cd packages/ddirori_ui/example
flutter analyze lib/theme_reference_main.dart lib/theme_recipes.dart test/theme_recipes_test.dart
flutter test test/theme_recipes_test.dart
```

캡처가 필요하면 `DDIRORI_TEST_FONT`에 Pretendard TTF, `DDIRORI_TEST_ICONS`에 MaterialIcons OTF, `DDIRORI_THEME_EVIDENCE`에 출력 절대 경로를 지정한다. 저장된 Flutter 캡처는 실제 위젯 테스트 렌더링이며 실기기 화면은 아니다. 폰트 경로는 앱의 제품 설정이 아니라 검수용 옵션이다.

## 남은 경계

- VoiceOver/TalkBack, 실제 iOS·Android·데스크톱 입력, 고대비 OS 설정은 별도 검수 대상이다. 200% 웹 검사는 root 글자 크기 확대이며 브라우저 전체 zoom 검증과 구분한다.
- Flutter는 이번 예제에서 바이올렛 후보만 검사했다. 여섯 후보를 native에서 모두 검사했다는 뜻이 아니다.
- 기존 공통 구현에는 일부 직접 지정된 치수와 native/web 포커스 표현 차이가 남아 있다. [지침의 상태 규칙](../service-theme-contract.md#상태를-조합하는-규칙)에서 현행 한계를 명시했다. 이번 예제가 기존 모든 컴포넌트의 외형 정합성을 증명하지 않는다.
- 신규 예제는 UI 값과 callback만 다룬다. 악보·사보·오디오 엔진, 실제 파일·저장·권한 기능을 검증하지 않았다.
- 서비스별 정보 구조와 UX 레퍼런스 적합성은 해당 앱에서 설계·실행·검토한다. 중앙 시안의 테스트 수가 서비스 UX 완성도를 대신하지 않는다.

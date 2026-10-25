# 공유 기준 · 2026-10-25

이 문서는 같은 저장소에서 도입하는 절차와 이번 적용 경계다. 구현 계약의 정본은 [specifications](specifications/README.md)다. 기준 커밋과 이번 실행 결과는 [검증 기록](evidence/shared-baseline-2026-10-25/README.md)에 기록한다. 이전 검증 기록은 그대로 보존한다.

## 시작 순서

1. 저장소 루트에서 `npm ci`. Flutter 소비자는 해당 디렉터리에서 `flutter pub get`.
2. [기초 역할](specifications/foundations.md) → [플랫폼 계약](specifications/platforms.md) → 해당 [서비스 명세](specifications/README.md)를 읽는다.
3. 아래 실행 예제와 실제 소비 코드를 비교한다. 앱 모델·파일 접근·재생·undo는 앱 adapter에 남긴다.
4. 작은 실제 흐름을 연결하고 정상·실패·취소·입력·포커스 회귀를 확인한다. 카탈로그 캡처는 제품 동작 증거가 아니다.

| 구분 | 현재 기준 |
| --- | --- |
| 공통 구현 | `packages/ddirori_web`, `packages/ddirori_ui` 공개 진입점; [API snapshot](specifications/README.md) |
| 실제 Score | 악보함; PDF·주석 엔진은 기존 앱 소유 |
| 실제 Play | 기존 라이브러리·재생 표시 + 파일 작업의 메타데이터 편집/저장/취소 |
| 실제 Studio | SpanProperties의 Text/Input/IconButton; native 객체·끝점 select 유지 |
| 카탈로그 | 상태·레이아웃 예제. 저장/오디오/명령 연결은 예제별로 명시 |
| Stage·Talk·Utilities | 서비스 명세와 현재 구현을 구분; 미구현 facade와 통합 계정·라우팅은 목표 설계 |
| Figma | 대응표만 작성됨. 라이브러리 생성·게시·동기화 미실행 |

## React 도입

루트 `package.json`의 `@ddirori/ui: file:packages/ddirori_web`와 lockfile이 실제 Studio 연결이다. `npm ci` 후 아래 import는 별도 catalog alias 없이 해석된다. React 19 peer, TS Bundler 해석, Vite의 TSX/JSON/SVG/CSS 처리 환경이 필요하다.

```tsx
import { Input, IconButton, Text } from '@ddirori/ui';
import '@ddirori/ui/styles.css';
// 화면/패널 단위. 악보 canvas를 감싸지 않는다.
<section className="ddirori" data-theme="light" data-density="compact">
  <Text as="h2" variant="sectionTitle">선택 속성</Text>
</section>
```

`npm --prefix packages/ddirori_web run dev` → `http://127.0.0.1:8058/?starter`는 제목·검색·목록·빈 상태·오류·재시도·테마·밀도를 가진 실행 예제다. 첫 추가는 의도적으로 실패하고 다음 시도는 메모리에만 반영된다. 실제 저장으로 소개하지 않는다. `?components`, `?foundations`, `?compare`는 기본 세트·기초·팔레트 카탈로그다. `npm run dev`는 실제 Electron 앱이다.

소비 검증: 루트 `npm run typecheck`, `npm run build`, `npx vitest run src/renderer/src/SpanProperties.test.tsx src/renderer/src/App.test.tsx`. 공통 검증: `npm --prefix packages/ddirori_web run typecheck`, `npm --prefix packages/ddirori_web test`.

스타일은 `.ddirori` 아래에 한정하지만 기존 host CSS의 구체성·소스 순서도 확인한다. Studio는 현재 밝은 compact 패널에만 적용한다. panel 폭 저장, score 지면, sp 단위는 변경하지 않는다. 터치 환경의 공통 최소 크기를 기존 32px 버튼 CSS로 덮어쓰지 않는다.

토큰·글꼴·로고는 docs의 정본을 상대 경로로 읽고 Vite가 번들링한다. 같은 저장소에서는 중복 복사본을 소유하지 않는다. 별도 저장소 배포는 아직 지원하지 않는다. 그때는 생성 자산을 패키지 build에 포함하고 ESM/d.ts/CSS 산출물, React peer 범위, semver·폐기 기간, registry 또는 artifact 배포 경로와 라이선스 포함을 검증해야 한다. 공개 발행은 이번 범위가 아니다.

## Flutter 도입

앱 pubspec: `ddirori_ui: {path: ../../packages/ddirori_ui}`. `MaterialApp(theme: ddiroriTheme(), darkTheme: ddiroriTheme(brightness: Brightness.dark), themeMode: ThemeMode.system)`를 연결한다. 화면 한 곳이면 `Theme(data: ddiroriTheme(...), child: ...)`로 경계를 한정한다. 전체 테마는 native Material 입력·dialog까지 바꾸므로 소비 화면 회귀가 필요하다.

`DdiroriStyle.of(context)`는 Theme extension의 의미색·밀도를 읽는다. UI package가 등록한 바흐 자산은 package 경로로 해석된다. 기본 글꼴은 플랫폼 글꼴이며 Pretendard를 쓸 앱은 허가된 TTF/OTF를 앱 pubspec fonts에 등록하고 동일 family를 `ddiroriTheme(fontFamily: ...)`에 전달한다. 웹 WOFF2 경로를 Flutter font 등록에 복사하지 않는다. 글꼴 변경 후 한글·긴 이름·200% 배율을 다시 확인한다.

`packages/ddirori_ui/example`에서 `flutter pub get`, `flutter run -d chrome --web-port=8059`로 실행한다. `?components` 기본 세트, `?starter`는 비동기 재시도 도입 예제다. 예제와 패키지에서 각각 `flutter analyze`, `flutter test`를 실행한다. Play에서는 `flutter test test/library_management_test.dart test/metadata_edit_dialog_test.dart`로 실제 소비를 검증한다.

Dropdown/Dialog/Sheet는 native Material 합성이고 OS별 메뉴·키보드·뒤로가기 표현이 다르다. 이번 Play adapter는 저장 중 readOnly, 취소/Back 금지, 실패 draft 보존, 성공 후 반환을 소유한다. 파일 repository와 전역 재생 상태를 공통 패키지로 옮기지 않는다.

## 실제 적용의 의미

Play는 저장 성공 전에 route를 닫지 않는다. 실패하면 같은 입력에서 재시도하고 성공 알림은 성공 후에만 보인다. 기존 repository·원본 파일 비수정·목록 화면 인스턴스·재생 정책은 유지한다. 모든 메타데이터 필드는 선택 사항이며 빈 입력은 해당 사용자 교정 제거라는 기존 정책을 유지한다. 숫자 유효성은 기존 validator가 결정한다.

Studio는 단일 span 또는 선택 없음만 받는다. 여러 span을 편집하는 UI는 현재 없으므로 mixed를 0이나 undefined로 위장하지 않는다. 다른 선택 도구의 mixed는 기존 로직을 유지하며 추후 다중 span 도입 시 별도 계약/테스트가 필요하다. 빈값=자동, 숫자0=명시적 이동0, 높이0은 범위 밖이다. draft 변경은 명령이 아니며 유효한 Enter/blur 확정 한 번만 명령·undo로 남긴다. Escape는 draft만 취소한다. IME 중 Enter는 확정/전역 단축키로 전파하지 않는다. 선택 교체는 key 재마운트, 외부 값 변경은 draft 재동기화, 패널 언마운트는 미확정 draft 폐기다.

## 변경·검증·인계

공통 API 변경은 기존 호출을 유지하는 opt-in을 우선한다. breaking 변경은 새 API와 이전 API의 폐기 안내, 소비 앱 이동 목록을 함께 기록하고 이전 API 제거 전에 모두 이동한다. 토큰 변경은 원본 수정 → `tools/build.mjs` → `--check`, API 변경은 `tools/snapshot-spec-api.mjs`와 계약/예제 갱신 → `tools/verify-specifications.mjs` 순서다. 생성물만 손으로 고치지 않는다.

아이콘 비교용 블루, UI 임시 라임, 콘텐츠 의미색을 구분한다. 대표색 확정은 미정이며 공통 API 채택의 선행조건이 아니다. 최신 자산 선택은 브랜드 정본을 따른다. 실제 런처를 변경하지 않았다.

Figma 인계는 [handoff](handoff.md)의 변수명·light/dark·density·상태와 코드 카탈로그의 현재 렌더를 함께 전달한다. 선택·오류·focus·disabled·loading 상태, 컴포넌트별 native 예외, 토큰 원본 commit을 포함한다. 디자인 담당자가 권한 있는 파일에서 라이브러리를 제작·검수하는 작업은 선택 후속이다.

# P-01 플랫폼 구현 가이드

<a id="react"></a>
## React

공개 진입점: [index.tsx](../../../../packages/ddirori_web/src/index.tsx), [basic.tsx](../../../../packages/ddirori_web/src/basic.tsx). 루트 `file:packages/ddirori_web` 의존성으로 실제 Studio에서 @ddirori/ui를 해석한다. [공유 도입 절차](../shared-baseline.md)를 따른다. docs의 토큰·글꼴·SVG 의존성은 유지하며 독립 배포 패키지는 아니다.

```tsx
import { Button, Density, Text } from '@ddirori/ui';
import '@ddirori/ui/styles.css';
// host가 save를 제공한다.
<div className="ddirori" data-theme="light" data-density="comfortable">
  <Text as="h1" variant="screenTitle">악보함</Text>
  <Density density="compact"><Button onClick={save}>저장</Button></Density>
</div>
```

색 후보 전환은 catalog가 팔레트를 해석하는 방식을 참고하되 임의의 `accent` prop이 root 컴포넌트에 있다고 가정하지 않는다. 기본 generated CSS는 임시 active palette다. `.ddirori button/input`과 기존 앱 전역 CSS가 동시에 적용될 때 specificity·line-height·box-sizing을 확인한다. 사보 캔버스·기보 DOM까지 범위를 무작정 감싸지 않는다.

HTML form native 속성은 Input/Checkbox/Switch가 전달하지만 Select는 custom combobox다. Select의 required proxy는 native 검증을 유지하되 name/FormData API는 현재 없다. host value로 제출한다. Menu는 명령이고 Select는 값이다. Text 시각 variant는 as로 지정하는 DOM 수준을 바꾸지 않는다.

Select/Popover/Tooltip는 native Popover API, Dialog는 native dialog top layer다. 구형 브라우저 fallback은 미구현. [지원 환경과 도입 차단 조건](../support-matrix.md)을 따른다. 현재 실제 React 소비자는 Electron 42.4.1이며 신규 웹 제품은 지원 브라우저 검증이 먼저다. fixed 위치 overlay는 viewport·zoom·scroll·nested modal 조합으로 검증한다. React의 key/ref 계약을 각 wrapper가 전부 전달한다고 가정하지 않는다.

예제·테스트: [실제 catalog](../../../../packages/ddirori_web/catalog/basic-set.tsx), [unit](../../../../packages/ddirori_web/src/basic.test.tsx), [browser 검사](../tools/verify-basic-set.mjs). 이번 명세의 [examples-react.tsx](examples-react.tsx)는 현재 API 타입 검사용이며 제품 화면/런타임 검증이 아니다.

<a id="flutter"></a>
## Flutter

```dart
import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
MaterialApp(
  theme: ddiroriTheme(),
  darkTheme: ddiroriTheme(brightness: Brightness.dark),
  home: const Scaffold(body: Text('앱이 실제 화면을 공급')),
);
```

pubspec dependency는 앱 기준 `../../packages/ddirori_ui`. ThemeData는 native Material 컨트롤도 바꾸므로 공통 위젯 교체 없이 기존 화면 외형이 변할 수 있다. `ddiroriTheme`의 density·touch·fontFamily·accent가 실제 인자다. accent invalid는 ArgumentError; 목록은 생성된 accents를 따른다. `DdiroriStyle.of` fallback은 테스트 렌더를 돕지만 전체 native ThemeData를 자동 주입하지 않는다.

TextTheme은 의미 역할을 연결하고 사용자 TextScaler를 유지한다. 음표 글꼴·PDF scale에는 TextScaler를 직접 곱하지 않는다. native Checkbox/RadioGroup/Switch/Slider/Dropdown/Table/Nav는 [recipe](native-recipes.md)로 합성하며 미존재 DdiroriSelect 등을 import하지 않는다.

FocusNode/TextEditingController는 생성 State에서 dispose, rebuild 때마다 재생성하지 않는다. 현재 DdiroriInput은 내부 controller 소유이므로 외부 controller/focusNode 주입 API는 없다. 앱 shortcut은 Actions/Shortcuts에서 의도를 명령으로 전달하고 텍스트 입력·모달이 활성화된 동안 전역 편집 단축키를 억제한다. Semantics label/selected/enabled를 DOM ARIA 문자열로 복사하지 않는다.

DdiroriPopover는 웹처럼 non-modal이 아니라 dialog route다. Sheet는 safe area·keyboard inset·최대85% 높이·본문 scroll을 합성한다. showDdiroriConfirmDialog는 bool 결과를 반환하며 작업 실행·busy·오류 처리를 소유하지 않는다. 완료 후 async 작업은 host가 맡거나 별도 상태 보존 폼 route로 구현한다. Material 기본 Back/barrier dismiss를 사용하므로 busy 닫기 방지가 필요하면 전용 adapter를 명세한다.

## 플랫폼 동등성과 차이

| 반드시 공유 | 플랫폼 차이 허용 / 검증 |
| --- | --- |
| 역할 색, 타이포 위계, 입력/행동의 의미, 오류 복구 | 실제 font metrics·native ripple·route transition |
| 단위 있는 유한 값, 안정적 선택 ID, 저장 성공 의미 | React seconds vs Flutter Duration adapter 변환 |
| 조작 label·focus 식별·disabled 실행 차단 | 웹 Tab/ARIA vs Flutter Focus/Semantics traversal |
| popup의 이름·닫기·가용 크기 | native Dropdown 메뉴와 web custom listbox 외형·입력 |
| 선택과 탐색의 의도 | React Tabs manual 지원, Flutter Tabs automatic만 제공 |

실행 명령은 [검증](verification.md). Safari/VoiceOver/TalkBack·실기기·펜/페달·IME는 자동 카탈로그 통과와 구분한다. 현재 SDK/lockfile을 기록한 후 native 기본동작을 검증한다. SwiftUI/Compose 패키지 신규 생성은 범위 밖이다.

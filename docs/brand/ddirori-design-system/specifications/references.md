# R-01 공식 레퍼런스와 적용 결정

확인일 2026-10-24. 외부 원칙은 아래 공식 링크에서 확인한 요약, 채택·제외는 Ddirori의 설계 판단이다. 수치·브랜드색을 복제하지 않는다. 온라인 문서 버전과 저장소 의존성은 별개이며 새 패키지 설치 근거가 아니다. 접근 실패 경로는 성공한 공식 대체 경로만 채택했다.

| 출처 | 확인한 원칙 | 채택 / 제외 | 적용·예외 / 검증 |
| --- | --- | --- | --- |
| [MUI theme](https://mui.com/material-ui/customization/theming/) | 테마가 색·글자·간격 등 일관된 스타일 설정을 전달 | 원본→생성→소비 구조 / MUI runtime 도입 제외 | F-01, P-01; Flutter ThemeData와 scoped CSS 별도 |
| [MUI themed components](https://mui.com/material-ui/customization/theme-components/) | 기본 props·스타일·variants를 구분 | 실제 API/default/variant 표 / 임의 만능 variant 제외 | C-BASE·API 부록 대조 |
| [MUI structure](https://mui.com/material-ui/customization/overriding-component-structure/) | root와 내부 구조의 교체 지점 설명 | anatomy/slot 책임 / DOM 구조만 바꿔 의미 유지 가정 제외 | C04/C27; native Flutter 구조 차이 |
| [MUI Button API](https://mui.com/material-ui/api/button/) | import·props·기본값·CSS API를 분리해 안내 | 실제 선언 추출·최소 예 / MUI props 그대로 복제 제외 | snapshot과 examples 타입 검사 |
| [MUI typography](https://mui.com/material-ui/customization/typography/), [spacing](https://mui.com/material-ui/customization/spacing/), [density](https://mui.com/material-ui/customization/density/) | typography와 spacing 척도·밀도를 테마로 조정 | 의미 타입/간격/입력장치 독립 축 / 기본8px 전면 채택 제외 | tokens 현재값 유지, 200%·touch 검사 |
| [MUI v6→v7 migration 사례](https://mui.com/material-ui/migration/upgrade-to-v7/) | 버전 간 API 변경과 이전 절차를 따로 설명 | deprecated API→대안→소비 이행 기록 / 업그레이드 실행 제외 | 변경 절차·work packages; 현행 MUI 버전 선택 의미 아님 |
| [SEED Typography](https://seed-design.io/foundations/typography) | scale와 semantic style을 구분 | 역할 조합·단위 / 시스템 폰트 정책 무조건 복제 제외 | Ddirori 동봉 웹폰트·Flutter fallback 검사 |
| [SEED Spacing](https://seed-design.io/foundations/spacing) | 용도에 맞는 일관된 간격으로 그룹 관계 표현 | 관계 기반 간격 명세 / 외부 수치 일괄 복제 제외 | F-LAYOUT, field/group 간격 |
| [SEED State](https://seed-design.io/foundations/state) | interaction과 option 상태가 겹치거나 우선할 수 있음 | 조합 상태 행렬 / hover가 selected 의미 제거하는 것 제외 | C-BASE, disabled+selected·error+focus |
| [SEED Select](https://seed-design.io/components/select), [Select Box](https://seed-design.io/components/select-box) | dropdown trigger/content/item과 상자형 선택의 anatomy가 다름 | 사용 목적·구조·properties 분리 / 두 UI를 같은 Select로 혼용 제외 | C08, native Dropdown은 명시적 예외 |
| [WAI APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/), [select-only](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) | widget 의미에 맞는 focus/keyboard와 탐색·확정 구분 | Tabs/Menu/Select/Dialog별 계약 / ARIA role만 부여 제외 | C08/C13/C27~30. Select 외부 클릭 취소는 Ddirori 선택 |
| [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 글자와 필요한 그래픽의 대비·예외가 다름 | 실제 면과 색 쌍 검증 / 색 검사만으로 전체 인증 제외 | F-COLOR·validation plan |
| [Flutter ThemeExtension](https://api.flutter.dev/flutter/material/ThemeExtension-class.html) | ThemeData에 추가 역할을 확장하고 copy/lerp 제공 | DdiroriStyle / 별도 테마 엔진 재작성 제외 | nested density가 다른 extension 보존 |
| [Flutter Focus](https://docs.flutter.dev/ui/interactivity/focus), [Actions/Shortcuts](https://docs.flutter.dev/ui/interactivity/actions-and-shortcuts) | focus 수명과 key intent/action 책임 분리 | 플랫폼별 focus/command / 웹 ARIA 기계 이식 제외 | P-01·사보 keyboard/IME |
| [Flutter TextScaler](https://api.flutter.dev/flutter/painting/TextScaler-class.html), [adaptive](https://docs.flutter.dev/ui/adaptive-responsive/best-practices), [accessibility](https://docs.flutter.dev/ui/accessibility) | 사용자 확대·입력/화면 특성·접근성 검토 필요 | logical 단위·가변 레이아웃 / 장치 이름만으로 밀도 결정 제외 | 큰 글자·실기기 semantics는 별도 |
| [Excalidraw ToolIcon](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/ToolIcon.scss), [colors](https://github.com/excalidraw/excalidraw/blob/master/packages/common/src/colors.ts) | 도구 상태 스타일과 콘텐츠 색 자료가 별도 소스에 존재 | 작업 도구와 콘텐츠 역할 분리 / 손그림 이중선을 모든 버튼에 적용 제외 | F-COLOR·S-STUDIO; master 변경 가능 |
| [카카오 서비스](https://www.kakaocorp.com/page/service/service), [네이버 전체 서비스](https://www.navercorp.com/service/all) | 다양한 서비스를 이름·용도·진입 경로로 소개 | 식별+가능한 행동+연결 상태 / 동일 UI·공유계정 내부구조 추정 제외 | C35·P-LINK; 실제 통합 기능은 별도 |

Ddirori 결정은 외부 서비스가 동일하게 작동한다는 주장이 아니다. source가 미래에 변경되면 확인일을 갱신하고 기존 결정의 영향을 검토한다. 최소 수치·형태는 기존 토큰, 구현 사실은 API 원문을 우선한다.

# 기존 시스템에서의 이행 제안

이번 제안은 기존 시스템을 자동으로 교체하지 않는다. [기존 토큰](../design-tokens.md)의 공통 의미, [상태 지침](../component-guidelines.md)의 명령 라벨·포커스·선택·오류 원칙을 이어가고, 색상과 밀도·모드·브랜드 형태를 새 계층으로 정리한다.

## 대응표

| 현재 | 새 의미 | 적용 전 확인 |
| --- | --- | --- |
| `--inc-color-background`, `--inc-color-app-background` | semantic.background | 공개 사이트와 캔버스 바탕의 실제 사용처 |
| `--inc-color-surface`, `surface-muted` | surface / raised | 반투명 표면의 합성 대비를 별도 측정 |
| `--inc-color-text`, `text-soft` | text / muted | 문서와 실제 CSS 값이 다름. 실제 화면 기준 확인 |
| `--inc-color-border`, `border-strong` | border / controlBorder | 장식적 선과 컨트롤 식별 경계를 분리 |
| `--inc-color-accent`, `accent-contrast` | action / onAction | 다크에서는 Apricot/Ink. 제품 보조색으로 대체하지 않음 |
| `--inc-color-focus` | focus + selection + scoreSelection | 기존 하나의 변수를 쓰는 위치를 의미별로 나눔 |
| playback 관련 선택자 | playback / scorePlayback | UI와 흰 악보 위 오버레이를 구분 |
| `--inc-color-error` | error / scoreError | 테마·바탕별 대비와 복구 문구 |
| 기존 control-height 46px | comfortable 48 / compact 32 | 사이트 CTA와 도구 버튼을 같은 높이로 강제하지 않음 |
| Flutter `ColorScheme.fromSeed` + 개별 색 | 명시적 ColorScheme + 전용 ThemeExtension | Material의 모든 역할 및 네이티브/커스텀 위젯 확인 |
| 기존 음표 기반 출시 자산 | 기러기 심벌 제안 | 모브랜드/상표 결정과 플랫폼 제작을 별도 수행 |

기존 토큰 문서의 text `#111416`와 CSS의 `#202326`, soft `#4d5b60`와 CSS의 `#4a555c`는 같은 값이 아니다. 이행 전에 현재 화면 사용처를 추출해 매핑한다. ‘현재 모든 앱이 기존 토큰을 공유한다’고 가정하지 않는다.

## 권장 적용 순서

1. 기러기 형태·가칭·두 앱 대표 화면에 대한 사용자 검토. 상표 검토와 실제 제품명 확정은 별도 결정.
2. 현행 UI의 색·크기·상태 사용처 목록과 제품별 기준 화면 확보.
3. 의미 토큰을 새 값과 연결하되 선택·입력·재생은 먼저 분리. Light부터 대조.
4. 공통 컨트롤의 크기·상태·접근 가능한 이름을 적용. 코드 공유가 적합한 부분만 패키지화.
5. Clef의 악보함/열람/주석, Chromatics의 기본 편집/선택을 한 흐름씩 적용하고 실제 기능 회귀 검증.
6. Dark와 확대 글자·좁은 창을 검증한 뒤 다른 서비스로 확장.
7. 출시용 브랜드 자산·스토어 캡처·릴리즈 문구는 확정된 제품 기능과 실제 플랫폼 출력으로 준비.

이 순서는 이번에 실행한 제품 변경이 아니다. 향후 iOS 기능·동선·화면을 변경할 때는 [루트 AGENTS](../../../AGENTS.md)에 따라 해당 `deployment/apps/<app>/ios-metadata.yaml`과 촬영 설정을 함께 갱신한다. 기존 사용자의 동시 작업 파일을 이 제안 적용 명목으로 되돌리지 않는다.

## 적용 후 검수 책임

브랜드 검토는 심벌·워드마크·팔레트·표현 강도를 본다. 제품 디자인은 과업 동선과 밀도를 본다. 개발은 토큰 대응과 기능·키보드·저장·플랫폼 동작을 검증한다. 음악적 검수는 악보 조판과 입력/재생 결과를 확인한다. 같은 사람이 맡더라도 이 판단들을 하나의 ‘디자인 승인’으로 합치지 않는다.

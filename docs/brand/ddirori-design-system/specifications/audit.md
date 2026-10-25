# AUD-01 현행 소스·문서 감사

2026-10-24. 파일 위치·공개 export·import를 대조했다. iOS/Android 폴더 존재는 배포·실기기 지원 인증이 아니다. 기준 commit·변경 목록·원본 해시는 [baseline](../evidence/specifications/baseline.json), API 원문은 [snapshot](../evidence/specifications/api.json).

| 서비스 | 실제 소스 / 스택 | 플랫폼과 현재 경계 | 공통 소비 / 남은 스타일 |
| --- | --- | --- | --- |
| 스코어 | [main.dart](../../../../apps/in_c_sheet/lib/main.dart), Flutter | iOS/Android scaffold. PDF·주석·연습은 앱 | main의 InCSheetApp·Search·상태 + presentation/score_library_components.dart의 목록·필터·빠른 접근 소비. Annotation·Viewer·Tuner의 추가 이행은 별도 |
| 플레이 | [main.dart](../../../../apps/classical_local_library/lib/main.dart), Flutter | iOS/Android scaffold, 로컬 카탈로그·재생 | presentation/*, 설정·상세·관리·진단 등 소비. inline panel·loading·padding 일부 개별 |
| 스튜디오 | [App.tsx](../../../../src/renderer/src/App.tsx), [SpanProperties](../../../../src/renderer/src/SpanProperties.tsx), React/Electron | package의 mac/win/linux 패키징 스크립트. 기기 통과는 별도 | 실제 renderer에 공통 패키지 도입 완료 아님. catalog/studio는 독립 fixture. 기존 styles.css 유지 |
| 스테이지 공개 | [site/](../../../../site/), Vite 정적 HTML/JS | 루트 README의 공개 경계: 소개·이메일 홍보 문의 | React 앱으로 가정하지 않음. site CSS/HTML. 파일 존재만으로 광고 관리·결제 공개 판단 금지 |
| 공연 발견 실험 | [classical_discovery_app.dart](../../../../apps/in_c_sheet/lib/classical_discovery_app.dart), Flutter | 악보앱 소스 안의 별도 prototype entry | 자체 seed/크림 배경이 남아 있음. 현재 공통 테마로 표시하면 사실과 다름 |
| 톡 | [main.dart](../../../../apps/classical_community/lib/main.dart), Flutter | iOS/Android scaffold, 로컬 prototype | 공통 import 없음. PostCard, SponsoredEventCard, ComposerSheet 등 자체 구성 |
| 클릭 | [main.dart](../../../../apps/in_c_click/lib/main.dart), Flutter | iOS/Android scaffold, metronome MVP | 공통 import 없음. _BpmBoard·_TempoControls·sketch painter |
| 차임 | [main.dart](../../../../apps/in_c_chime/lib/main.dart), Flutter | iOS/Android scaffold, reference tone/drone; 마이크 튜너 아님 | 공통 import 없음. _ToneBoard·_PitchGrid·_TuningControls·sketch painter |

React 패키지 공개명은 `@ddirori/ui`(0.1.0/private), React peer ^19.2.3. Flutter 패키지는 `ddirori_ui`(0.1.0/publish_to none), Dart constraint >=3.13.0 <4.0.0. 이는 저장소 선언이며 모든 버전 조합 지원 약속이 아니다. 프로젝트별 lockfile·Flutter SDK를 실행 시 재확인한다.

## 문서 책임과 충돌

| 문서 | 책임 / 최신 해석 |
| --- | --- |
| ../README.md | 전체 진입점, 상세 구현은 이 specifications로 연결 |
| foundations / component-language / color-system | 기초·입문, 수치 정본은 tokens/color JSON; 구현 예외는 상세 명세 |
| basic-set / components / component-contracts | 기본 세트·초기 계약; 최신 전체 API는 추출 부록. 과거 계획을 완료로 읽지 않음 |
| inventory / 2026-10-22 감사 / play-adoption | 당시 파일·단계 기록. 오래된 행 번호·스코어 미도입·파랑 승인 서술은 현재 근거 아님 |
| system-review | 10-23 감사 + 10-24 후속. “다음 Tabs/Menu”는 뒤의 구현표에서 해결된 항목 |
| chromatics-studio | 별도 작업트리 기준 독립 카탈로그; 현재 root 제품 명령 구현과 동일하다고 가정 금지 |
| score-apps / adoption | 제품 이행 순서의 선행 자료, 이 폴더 서비스 계약에서 구체화 |
| handoff | Figma 매핑이며 실제 Figma 제작 증거 없음 |
| validation / evidence | 날짜별 실행 기록. 이번은 문서/소스/API 일치 검사만 수행 |
| ddirori-brand-system | 운영 자산·권고 제품군, 대표색 미확정 |
| ddirori-visuals | 음형 원본·탐색 이력; 상단 라임 권고와 본문 파랑 설명이 혼재. UI의 최신 색 정본으로 사용하지 않음 |

루트 README는 Click/Chime을 악보앱에 포함되는 기능 실험으로 설명하고 앱 README는 모바일 store target으로 설명한다. **배포 전략은 결정 필요**이며 코드가 존재하는 두 앱의 표시 계약은 명세한다. 공개 사이트 기능과 저장소 내부 실험·관리 페이지의 존재를 분리한다.

## 검증 근거의 범위

- [기존 basic-set core](../evidence/basic-set/core.json): 명령·시간·종료 코드.
- [기존 browser](../evidence/basic-set/browser.json): 실제 카탈로그 조작/캡처 기록. Select 보완 포함.
- Flutter와 React 테스트는 패키지에 존재하며 컴포넌트별 심벌 추적을 registry에 기록한다. 이름이 검색된다는 것만으로 해당 상태가 검증된 것은 아니다.
- 실제 Score/Play 테스트와 카탈로그 fixture 검증을 별도 취급한다.
- 최초 명세 작업은 문서만 변경했다. 후속 실제 앱 변경과 새 실행 결과는 [적용 기록](../adoption-pilot.md)으로 분리한다. 토큰 원본은 유지했다.

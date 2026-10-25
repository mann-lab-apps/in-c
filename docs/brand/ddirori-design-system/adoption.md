# 제품 도입 순서

2026-10-25 현재 도입 기준: [공유 기준](shared-baseline.md) · [지원 환경](support-matrix.md) · [이번 검증](evidence/shared-baseline-2026-10-25/README.md). 아래 이전 기록은 날짜별 이력이며 현재 적용 범위는 위 링크를 우선한다.


2026-10-24 실제 적용 후속: [공통 동작 보완·악보함 적용·검증 및 색 비교](adoption-pilot.md). 이전 날짜별 기록은 이력으로 유지한다.

2026-10-24 후속: [실제 소비 경로 감사](specifications/audit.md)와 [플랫폼·서비스별 작업 패키지](specifications/work-packages.md)를 이행 시작점으로 사용한다. Score의 작은 목록 흐름부터 단계별 적용하며 전체 이행은 아직 별도다.

2026-10-24: [기본 세트](basic-set.md)를 추가했다. 네 가지 조합 화면은 카탈로그 예제이며 실제 제품 전체 이행은 아래 단계대로 진행한다. 신규 API는 opt-in이고 기존 Flutter 앱 기본 외형을 유지한다.

2026-10-23 현재 플레이는 공통 기반을 사용하며 스코어도 악보함의 테마·검색·상태를 도입했다. [브랜드 시범 적용](../ddirori-brand-system/adoption.md)을 현재 상태로 참고하고, 아래 표는 남은 단계별 이행 지침으로 사용한다. 아래 단계마다 기존 제품의 테스트·데이터를 보존하고, 화면 단위로 되돌릴 수 있게 적용한다.

| 단계 | 기존 연결 지점 | 새 기반 | 앱에 남는 책임 | 회귀와 복구 |
| --- | --- | --- | --- | --- |
| 1 악보함 | apps/in_c_sheet/lib/main.dart의 InCSheetApp, _SearchField, _LibraryViewBar, _ScoreTile, _EmptyLibrary | ddiroriTheme, Search, Choices, Item, StatePanel | SheetLibraryController, query/filter, 파일 열기 | 검색·외부 query·즐겨찾기·다중 선택·긴 제목. 기존 위젯 adapter로 화면 단위 복귀 |
| 2 상태와 modal | _NoticeBanner, 각 ViewerBanner, 설정/metadata sheet | Banner, StatePanel, Progress, modal helpers | 오류 원인·복구·검증·metadata 모델 | 큰 PDF 대기, 누락 파일, 가져오기 취소, 키보드. 기존 sheet builder 복귀 |
| 3 뷰어 | _AnnotationToolbar, _ViewerControls, _PerformanceQuickActions | AnnotationTools, PageControls, Toolbar | annotation 좌표·저장·펜·하드웨어 입력 | 확대·회전·주석 export·페이지 경계·공연 모드. 기존 toolbar/controls 복귀 |
| 4 연습 | _MetronomeSheet, _TunerMeter 등, _LinkedAudioPlayerSheet | Number, BeatIndicator, TunerMeter, Transport | 오디오 시계·튜너·기기 권한·신호 판정 | BPM 경계·프로필·신호 없음·지연·seek. 기존 엔진 유지, 표시 adapter 복귀 |
| 5 유틸리티와 플레이 | apps/in_c_click/lib/main.dart, apps/in_c_chime/lib/main.dart, apps/classical_local_library/lib/main.dart | 테마·숫자·선택·항목·재생 | 각 controller·preferences·오디오 세션·카탈로그 저장 | 재생 중 전환·백그라운드·설정 유지·초기화. 화면별 단계적 이행 |
| 6 커뮤니티 | apps/classical_community/lib/main.dart | Item, Banner, 입력·상태 | 피드·작성·광고/권리 표시 | 긴 게시물·빈 피드·작성 중 복구. 기존 화면 builder 복귀 |
| 7 사보 | src/renderer/src/App.tsx, styles.css, SpanProperties.tsx, NativeBackupsDialog.tsx | scoped CSS·React primitives | 편집 명령·selection·dock·파일 수명주기 | 단축키·span 편집·undo/redo·복구·XML/PDF. UI adapter 단위로 기존 스타일 복귀 |

## Flutter 연결

각 앱 pubspec에 로컬 path dependency를 추가하고 `ddiroriTheme`를 루트 ThemeData에 연결한다. 새로운 컴포넌트는 값과 callback만 받아 기존 controller에 연결한다. 도메인 타입을 공통 패키지로 이동시키지 않는다. 증분 이행 동안 기존 위젯도 같은 ThemeData를 쓰는 영향을 확인한다.

앱의 입력 환경에 따라 touch를 정하고 다크 모드를 켜기 전에 플랫폼 상태 표시줄·문서 overlay·권한 화면도 확인한다. 테마만 바꾸면 기존 하드코딩 색이 모두 바뀐다고 가정하지 않는다.

## 웹 연결

처음에는 Chromatics의 도구 영역 또는 별도 host만 `.ddirori`로 감싼다. 현재 전역 styles.css와 동시에 적용되는 버튼·input 선택자는 충돌을 확인한다. 도메인 컴포넌트에 패키지 의존성을 연결하는 adapter와 회귀 검증을 별도 변경으로 준비한다. package.json workspace 전환은 이 공통 기반 작업에 포함하지 않았다.

## 메타데이터

실제 앱 UI·동선·기능에 영향을 주는 단계에서는 루트 AGENTS.md를 따른다. Clef & Staff는 `deployment/apps/clef/ios-metadata.yaml`이다. 제품 변경 시 source.state를 pending, content.reviewed를 false로 되돌리고 screenshots.scenes·자동화·관련 manual 근거를 갱신한다.

그 단계에서 `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml mode:check`로 검증한다. 다른 앱도 해당 manifest를 따른다. 버전·앱 식별자·스토어 이름·원격 업로드는 디자인 도입에서 추론하지 않는다.

공통 패키지 자체의 변경만으로 모든 앱 metadata를 변경하지 않는다. 이번에 실제 UI가 바뀐 플레이·스코어는 각각 pending 상태로 되돌리고 촬영 기준을 갱신했다.


현재 적용 범위·후속 순서는 [시스템 감사](system-review.md)를 따른다. [이전 라임 고도화 기록](refresh-2026-10-23.md)은 이력이다.

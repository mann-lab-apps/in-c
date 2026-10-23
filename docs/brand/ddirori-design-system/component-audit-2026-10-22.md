# 띠로리 공통 컴포넌트 감사

작성일: 2026-10-22

2026-10-23 후속: 스코어 악보함에도 공통 테마·검색·상태를 도입했다. 아래 조사 시점 기록과 구분하여 [현재 적용](../ddirori-brand-system/adoption.md)을 확인한다.

## 기준

시각 기준은 `ddirori-visuals`의 승인된 파랑 팔레트와 이 폴더의 foundations,
components, Flutter 카탈로그 캡처다. 두 제품에서 의미와 상태 전이가 같고 앱 모델 없이
표현할 수 있는 UI만 `packages/ddirori_ui`가 소유한다. 파일, 악보, 작품, 녹음과 재생
엔진은 각 앱에 남긴다.

기존 `background`, `surface`, `surfaceMuted`, `text`, `muted`, `action`, 의미색,
disabled, overlay 역할과 spacing/radius/density 토큰으로 이번 컴포넌트를 표현할 수 있어
새 색상 토큰은 만들지 않았다. 상태 배지는 글자와 아이콘을 함께 사용하며 살구색을
주의 상태로 재사용하지 않는다.

## 감사표

| 디자인·목적 | 상태와 변형 | 크기·반응형·접근성 | 기존 구현과 부족한 점 | 판단·사용처 | 검증 |
| --- | --- | --- | --- | --- | --- |
| 페이지 헤더 | 제목, 설명, leading, actions | 560px 아래 action 세로 배치, 제목 header semantics | 앱마다 `Text`와 `Row` 조합 | `DdiroriPageHeader` 공통. 카탈로그부터 사용 | 320px, 200% 글자, action 표시 |
| 주요·보조·위험 버튼 | enabled, disabled, busy, selected | touch 48dp, pointer compact 32px | `DdiroriButton` 존재 | 기존 공통 유지 | 중복 실행·복구 테스트 |
| 검색·입력 | controlled, clear, error, disabled | 외부 값 동기화, 오류 설명 | `DdiroriInput`, `DdiroriSearch` 존재 | 기존 공통 유지 | query 변경·지우기 |
| 선택·필터 | 단일·다중, selected, disabled, icon | 묶음 가로 스크롤 | Choices·Segments 존재 | 기존 공통 유지 | 선택 보존·아이콘 |
| 섹션 | title, subtitle, trailing, children | 가변 높이, 제목 header semantics | subtitle 없음 | `DdiroriSection` 확장. 플레이 홈 사용 | 좁은 폭·긴 설명 |
| 목록 행 | leading, trailing, actions, selected, selecting, disabled | 긴 제목 줄바꿈, disabled pointer 차단 | trailing·행 전체 disabled 없음 | `DdiroriItem` 확장. 앱 전용 행이 합성 | semantics·callback 차단 |
| 상태 배지 | neutral, info, success, warning, error | pill, 아이콘+글자, 독립 상태 이름 | 화면별 `Text`로만 표시 | `DdiroriStatusBadge` 공통. 플레이 검색·스캔·큐 사용 | tone·semantic label |
| 수치 요약 | label, value, icon, group | min width 기반 열 수, 모바일 자동 줄바꿈 | 개별 Metric과 앱 Wrap 중복 | `DdiroriMetricGroup` 공통. 플레이 라이브러리 요약 사용 | 320px·200% 글자 |
| 반응형 action | 여러 명령, disabled·busy는 자식 소유 | 좁은 폭 세로, 넓은 폭 Wrap | 화면별 Row/Wrap 반복 | `DdiroriAdaptiveActions` 공통 | 카탈로그 두 폭 |
| 메뉴 trigger | label, enabled, typed selection | tooltip과 Material menu semantics | 직접 `PopupMenuButton` 반복 | `DdiroriMenuButton<T>` 공통. 감상 기록 메뉴 사용 | 선택 callback은 앱 회귀 테스트 |
| 배너·상태 면 | info/success/warning/error, empty/error/recovery | 오류 live region, 진단 접기 | Banner·StatePanel 존재 | 기존 공통 유지 | semantics·복구 action |
| 확인창 | confirm/cancel, danger | 긴 본문 scroll, 명시적 결과 | 제품마다 같은 AlertDialog 반복 | `showDdiroriConfirmDialog` 공통. 기록·파일 작업 사용 | true 반환·취소 경계 |
| 재생 시간·진행 | position, duration, buffered, disabled, status | 고정폭 시간, slider label, drag 종료 seek | Transport 내부 단순 slider | `DdiroriPlaybackProgress` 공통 | buffered·seek 종료·미상 길이 |
| 재생 transport | playing, previous/next, full/compact | control wrap, full에서 progress | compact 변형과 상태 설명 없음 | `DdiroriTransportVariant` 확장 | full·compact 상태 |
| 작품·녹음·악장·파일 행 | 제품 모델, 파일 상태, 큐 정책 | 공통 Item을 합성 | 플레이에 전용 행 존재 | 플레이 전용 유지. repository 호출 금지 | 앱 widget test |
| 악보 타일·주석·공연 | PDF, 선택, 문서 좌표와 공연 상태 | 지면과 UI 테마 분리 | 악보앱 private 구현이 진행 중 | 악보 전용 adapter 유지. 현재 변경하지 않음 | 후속 화면 단위 이행 |

## 적용 경계

- 띠로리 플레이는 공통 metric group, 상태 배지, 메뉴와 확인창을 실제 화면에 연결했다.
- 작품·녹음·큐·로컬 파일 행은 앱 모델을 받는 presentation 컴포넌트로 남고 내부에서
  공통 Item과 StatusBadge를 합성한다.
- 악보앱은 조사 시점에 `ddirori_ui`를 소비하지 않고 진행 중 변경이 많다. 이번 작업은
  해당 변경을 덮지 않았으며, 악보함 검색·상태 화면을 첫 후속 이행 후보로 남긴다.
- 카탈로그의 악보·재생 예시는 엔진을 연결하지 않는다. PDF 정확도, 오디오 출력과
  실기기 VoiceOver를 증명하지 않는다.

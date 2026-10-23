# 띠로리 플레이 공통 컴포넌트 채택

작성일: 2026-10-22

2026-10-23 후속: 스코어 악보함에도 공통 테마·검색·상태를 도입했다. 아래 조사 시점 기록과 구분하여 [현재 적용](../ddirori-brand-system/adoption.md)을 확인한다.

## 경계

`packages/ddirori_ui`는 제품 모델이나 저장소를 모르는 공통 UI만 소유한다. 띠로리
플레이의 작품, 녹음, 악장, 로컬 파일과 재생 큐 의미는 앱 presentation 계층에 남긴다.
악보앱은 조사 시점에 아직 이 패키지를 직접 소비하지 않으므로, 진행 중인 악보앱
리팩터링을 덮어쓰지 않고 기존 UI 패턴과 공통 패키지의 공개 API만 비교했다.

## 감사 결과

| 기존 UI | 상태·상호작용 | 판단 | 적용 |
| --- | --- | --- | --- |
| `_Section` | 제목, 보조 정보, 자식 목록 | 띠로리 공통 | `DdiroriSection`을 추가하고 앱 wrapper에서 사용 |
| `_SummaryChip` | 레이블과 수치 | 띠로리 공통 | `DdiroriMetric`을 추가해 사용 |
| 라이브러리 요약 묶음 | 수치 6개, 폭별 줄바꿈 | 띠로리 공통 | `DdiroriMetricGroup`으로 열 수와 간격 통일 |
| `_SearchPanel` | controlled query, 지우기, 결과 상태 | 띠로리 공통 합성 | `DdiroriSearch`와 앱 검색 결과를 합성 |
| `_PlaybackModePanel` | 단일 선택, 좁은 폭 스크롤 | 띠로리 공통 합성 | 아이콘 지원 `DdiroriSegments` 사용 |
| 스캔 주요 행동 | 비활성, 비동기 중복 방지 | 띠로리 공통 | `DdiroriButton` 사용 |
| `_ScanLocationTile` | 폴더 상태와 스캔 callback | 플레이 전용 | 앱에 유지, 공통 icon button 문법만 따름 |
| `_PlaybackControls` | buffer, seek 종료, stop, 오류 경로 | 플레이 전용 | 범용 transport보다 계약이 넓어 앱에 유지 |
| 재생 큐 행 | 악장, 파일 출처, 현재 항목 | 플레이 전용 | `PlayQueueRow`가 `DdiroriItem`을 합성 |
| 검색·스캔·큐 상태 | 대기, 확인 필요, 재생 중 | 띠로리 공통 | 아이콘과 글자를 갖는 `DdiroriStatusBadge` 사용 |
| 작품·녹음 행 | 클래식 엔티티와 개수 | 플레이 전용 | `PlayWorkRow`, `PlayRecordingRow`로 분리 |
| 작품·녹음 상세의 악장 행 | 순서, 원어명, 길이, 파일 가용성, 현재 재생 | 플레이 전용 | `PlayMovementRow`가 공통 item·상태 배지를 합성 |
| 로컬 음원 행 | 파일 상태, 검토 선택, 파일별 동작 | 플레이 전용 | `PlayAudioFileRow`가 `DdiroriItem`을 합성하고 callback만 호출 |
| 감상 이력·통계 | 앱 history 모델과 이어 듣기 | 플레이 전용 | 홈 presentation part에 유지 |
| 메타데이터 편집 | controlled field, 검증, reset | 플레이 전용 합성 | 독립 `MetadataEditDialog`와 공통 input/banner/button 사용 |
| 파일 상태 필터 | 단일 선택 | 띠로리 공통 | `DdiroriSegments` 사용 |
| 파일 정리 빈 상태 | 안내 상태 | 띠로리 공통 | `DdiroriStatePanel` 사용 |
| Discovery 빈 상태·결과 | 추천 이유와 선택 callback | 공통 기반의 플레이 합성 | `DdiroriStatePanel`, `DdiroriItem` 사용 |
| 설정과 초기화 | 정보 행, 위험 행동, 확인 입력 | 띠로리 공통 | item, dialog, input, danger button, banner 사용 |
| 파일·이력 확인창 | 취소와 명시적 확인 결과 | 띠로리 공통 | `showDdiroriConfirmDialog` 사용 |
| 재생 진단 | 비동기 실행, 단일 선택, 성공·실패 | 띠로리 공통 합성 | button, segments, banner 사용 |

## 파일 책임

- `main.dart`: 앱 초기화, dependency wiring, repository/controller 수명주기, 화면 orchestration.
- `presentation/library_home_components.dart`: 홈의 표시 섹션과 callback 기반 UI.
- `presentation/play_library_components.dart`: 작품·녹음·검색·큐·로컬 음원의 플레이 전용 행.
- `presentation/play_activity_components.dart`: 스캔 위치·Discovery·최근 감상·감상 통계 행.
- `presentation/play_playback_components.dart`: 재생 상태·도구·진행률을 조합한 현재 재생 컨트롤.
- `presentation/metadata_edit_dialog.dart`: 메타데이터 입력과 값 검증.
- `library_details.dart`, `library_detail_screen.dart`: 상세 표시 데이터 조합과 작품·녹음 화면 orchestration.
- `library_management.dart`: 파일 관리 상태, repository 호출과 저장 orchestration.

`library_home_components.dart`는 현재 `main.dart`의 part다. 기존 private 접근 범위와 대규모
회귀 테스트를 보존하면서 표시 책임을 물리적으로 분리하기 위한 중간 단계다. 상태 소유권이
안정된 뒤 필요한 섹션만 독립 library로 승격한다.

세부 후보·반응형·접근성·경로 비노출 판단은
[`play-component-audit-2026-10-22.md`](play-component-audit-2026-10-22.md)를 따른다.

## 공통 승격 규칙

- 둘 이상의 제품에서 의미와 상태 전이가 같고 앱 모델 없이 표현할 수 있을 때만 승격한다.
- 저장, 파일, 권한, 네트워크와 오디오 엔진은 callback 뒤에 둔다.
- 제품 전용 행은 공통 item을 합성하되 도메인 제목과 상태 문구를 공통 패키지에 넣지 않는다.
- 점진적 도입을 위해 공통 컴포넌트는 `ddiroriTheme`가 없는 테스트 harness에서도 안전한
  기본 토큰으로 렌더링한다.

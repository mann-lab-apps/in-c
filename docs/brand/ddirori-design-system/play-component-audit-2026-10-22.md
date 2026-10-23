# 띠로리 플레이 전용 컴포넌트 감사

작성일: 2026-10-22

## 경계

`packages/ddirori_ui`는 상태 배지, 목록 표면, 도구, 재생 진행률처럼 제품 모델을
모르는 표시 규칙을 소유한다. 작품·녹음·악장·로컬 파일·재생 큐·감상 이력의 의미를
해석하는 UI는 `apps/classical_local_library/lib/presentation`에 남긴다. 전용 컴포넌트는
repository, SQLite, 파일 시스템과 오디오 엔진을 호출하지 않고 상위 화면의 callback만 호출한다.

## 감사표

| 후보·기존 위치 | 도메인 정보·상태 | 사용 화면·동작 | 반응형·접근성 | 판단·구현 | 검증 |
| --- | --- | --- | --- | --- | --- |
| 작품 행 | 작곡가, 작품명, 작품번호, 악장·녹음 수 | 홈 작품 목록, 선택·보조 action | 긴 한국어·원어 줄바꿈, action Wrap | `PlayWorkRow` 플레이 전용. `DdiroriItem` 합성 | 작품 계층·좁은 폭 렌더링 |
| 녹음 행 | 녹음명, 작품, 녹음 연도, 트랙 수 | 홈 녹음 목록, 선택·보조 action | 연도 없음을 글자로 표시 | `PlayRecordingRow` 플레이 전용 | 작품·녹음 위젯 테스트 |
| 악장 행 | 악장 번호·이름·원어명·길이, 파일 가용성, 현재 재생 | 작품·녹음 상세, 선택 악장부터 재생 | 상태를 글자·아이콘·semantics로 중복 표시, 경로 비노출 | `PlayMovementRow` 플레이 전용. 등록 폼과 큐 행은 서로 다른 책임으로 유지 | 320px·200% 글자·dark·callback·비활성 상태 |
| 검색 결과, 홈 인라인 `ListTile` | 인물·작품·악장·녹음·파일 유형 | 홈 검색, 선택 callback | 유형을 아이콘·글자·semantics로 표시 | `PlaySearchResultRow` 추출·적용 | 유형 semantics·tap |
| Discovery 결과 | 추천 작품/녹음, 추천 근거 | 음악 발견, 행 선택·큐로 열기 | 320px에서 근거 줄바꿈, 유형 상태명 | `PlayDiscoveryResultRow` 추출·적용 | callback·200% 글자 |
| 스캔 위치, `_ScanLocationTile` | 활성, 마지막 스캔, 파일 수 | 홈 스캔, 재스캔·활성 전환 | 경로를 기본 UI·semantics에서 제외, busy 차단 | `PlayScanLocationRow` 추출·적용 | 경로 비노출·callback·disabled |
| 로컬 파일, 홈·파일 정리 인라인 UI | 가용성, 정리 상태, 메타데이터 후보 | 홈 스캔·파일 정리 | 상태 배지, action Wrap, 전체 경로 대신 파일명 | `PlayAudioFileRow` 두 화면에 적용 | 선택·보조 action·누락 상태 |
| 재생 큐 행 | 작품·녹음·악장, 큐 순서, 파일 출처 | 현재 재생 큐 | 고정 순서 번호, playing semantics, 경로 비노출 | `PlayQueueRow` 보강. 큐에서 악장 표현을 담당 | 긴 악장명·320px·현재 항목 |
| 현재 재생, `_PlaybackControls` | 플레이어·processing·오류, 위치·buffer | 재생·일시정지·다음·정지·seek | tooltip, 상태 배지, 오류 안내 | `PlayNowPlayingControls` 추출. 공통 progress·toolbar 합성 | callback·seek·dark·320px·200% |
| 최근 감상, 인라인 `ListTile` | 세션, 위치, 완료·오류, 이어 듣기 가능성 | 홈 최근 감상, 이어 듣기·삭제 | 상태 글자·아이콘, busy 차단, 사유 tooltip | `PlayListeningHistoryRow` 추출·적용 | callback·disabled·long text |
| 감상 통계, 인라인 `ListTile` | 작품/녹음 집계, 시간, 횟수, 완료 수 | 홈 감상 통계 | 시간·횟수를 문장으로 표시 | `PlayListeningStatisticRow` 추출·적용 | 집계 표시·태블릿 폭 |
| 메타데이터 필드 | 출처, confidence, 승인·거절 | 파일 정리 다이얼로그 | 필드 입력과 선택 그룹 중심 | 단일 흐름인 `MetadataEditDialog`에 유지 | 기존 파일 관리 회귀 테스트 |

## 파일 책임

- `play_library_components.dart`: 작품, 녹음, 악장, 검색 결과, 큐, 로컬 파일 행.
- `play_activity_components.dart`: 스캔 위치, Discovery, 최근 감상과 통계 행.
- `play_playback_components.dart`: 현재 재생 상태와 재생 도구, 진행 표시.
- `library_home_components.dart`: 섹션 조합과 callback wiring. repository를 컴포넌트에 전달하지 않음.
- `library_details.dart`: 상세 표시 모델과 교정·alias·파일 가용성의 순수 조합.
- `library_detail_screen.dart`: 작품·녹음 상세의 화면 조합과 callback wiring.
- `library_management.dart`: 필터·선택 상태와 저장 orchestration.

## 검증 범위와 남은 후보

앱 전용 테스트 하네스에서 밝은·어두운 테마, 320px, iPad 폭, Dynamic Type 200%,
긴 한국어·원어, callback·disabled·seek와 내부 경로 비노출을 검증한다. 실기기 VoiceOver,
물리적 터치 감각과 실제 음원 출력은 별도 사용자 검증으로 남긴다.

작품·녹음 상세에서 악장 표현이 반복되어 `PlayMovementRow`를 추가했다. 현재 재생 큐는
큐 위치와 파일 출처를, 등록 폼은 편집 입력을 소유하므로 이 둘까지 만능 악장 행으로
합치지 않는다. 메타데이터 필드도 현재는 단일 검토 흐름이므로 추가 추출하지 않았다.

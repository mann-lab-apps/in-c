# 띠로리 플레이

Flutter 기반 클래식 로컬 음악앱의 개발 마일스톤이다.

현재 개발 체크포인트 요약은 [Changes](CHANGELOG.md)를 참고한다.

## 내부 베타 현재 상태

- 앱 표시명: `띠로리 플레이`
- 브랜드 시범 적용: 재생 삼각형 런처·제품 서명·벡터 바흐. [제품군 기준](../../docs/brand/ddirori-brand-system/README.md)을 따르며 공개 스토어 반영과 실기기 검수는 별도다.
- 버전: `0.1.0+1`
- SQLite schema: v14
- 기본 실행은 빈 사용자 카탈로그에서 시작한다. 샘플 카탈로그와 데모 스캔은
  `--dart-define=ENABLE_DEMO_LIBRARY=true`를 준 개발 실행에서만 사용한다.
- 가져온 파일은 작곡가 → 작품 → 녹음 → 악장 순서로 정리하며, 기존 작품·녹음을
  선택하거나 잘못된 연결을 원자적으로 다시 정리할 수 있다.
- 앱 관리 음원, 카탈로그, 연결, 감상 기록은 설정에서 전체 초기화할 수 있다. 외부
  원본 파일은 삭제하거나 수정하지 않는다.
- Android/iOS 백업에는 SQLite 메타데이터가 포함될 수 있지만 재다운로드·재가져오기가
  가능한 `managed_audio`와 `imslp_imports` 음원 복사본은 제외한다.
- 앱 아이콘과 색상은 내부 베타용 임시 정체성이다. 공개 출시 전에 상표·시각 검토가
  필요하다.
- 공통 테마, 버튼, 검색, 선택, 상태 패널, 상태 배지, 반응형 수치 요약과 목록 문법은
  `packages/ddirori_ui`를 사용한다.
  작품·녹음·악장·재생 큐는 공통 기반을 합성한 띠로리 플레이 전용 컴포넌트로 유지한다.
- 홈 표시 섹션은 `lib/presentation/library_home_components.dart`, 작품·녹음·검색·큐·파일 행은
  `lib/presentation/play_library_components.dart`, 스캔·Discovery·감상 행은
  `lib/presentation/play_activity_components.dart`, 현재 재생 제어는
  `lib/presentation/play_playback_components.dart`, 메타데이터 편집은
  `lib/presentation/metadata_edit_dialog.dart`로 분리했다.
- 작품·녹음 상세의 표시 데이터는 `lib/library_details.dart`에서 순수하게 조합하고,
  `lib/library_detail_screen.dart`는 repository나 SQLite에 직접 접근하지 않는다.
- 플레이 전용 행은 공통 `DdiroriItem`, 상태 배지, 도구와 진행률을 합성하되
  repository·SQLite·파일 시스템·오디오 엔진을 직접 호출하지 않는다.
- 스캔 위치와 큐·이력 항목은 일반 화면과 semantics에서 사용자의 전체 파일 경로를
  노출하지 않고 표시명·파일명·출처 상태만 보여준다.

개인정보와 출시 경계는
[`docs/privacy/classical-local-library-privacy-draft.md`](../../docs/privacy/classical-local-library-privacy-draft.md),
내부 베타 절차는
[`docs/releases/classical-local-library-internal-beta-0.1.md`](../../docs/releases/classical-local-library-internal-beta-0.1.md)를
기준으로 한다.

## 위치

`apps/classical_local_library`

기존 `apps/in_c_sheet`는 변경 중인 파일이 많아 건드리지 않고, 첫 마일스톤은 별도 Flutter 앱으로 분리했다. 이후 공통 패키지나 기존 앱 통합이 필요해지면 구조를 다시 판단한다.

## 구현 범위

### 첫 마일스톤

- 작품, 악장, 연주 녹음, 트랙, 로컬 오디오 파일을 분리한 도메인 모델.
- 한국어 표시명, 원어/영어 표시명, 정렬명, 별칭 보존.
- IMSLP/MusicBrainz/AcoustID 같은 외부 출처와 저작권/지역 메모를 담을 수 있는 `SourceReference`.
- 베토벤/드보르자크 샘플 데이터.
- 같은 작품의 다른 연주 녹음 비교 후보.
- 악장 분리 녹음과 결합된 단일 파일 녹음 샘플.
- 작품 랜덤, 녹음 랜덤, 악장/소품 랜덤 재생 계획.
- 한국어 첫 화면.
- 도메인 로직과 첫 화면 테스트.

### 두 번째 마일스톤

- 로컬 오디오 파일 스캔 서비스.
- 지원 확장자: `flac`, `mp3`, `m4a`, `alac`, `ogg`, `opus`, `wav`.
- 스캔 후보 메타데이터: 경로, 파일명, 포맷, 크기, 수정 시각.
- `scanned`, `needsReview`, `linked`, `missing` 가져오기 상태.
- 앱 지원 디렉터리의 JSON 파일 기반 내부 저장소.
- 첫 화면의 `스캔`, `정리 필요` 흐름.
- 샘플 스캔 버튼으로 아직 작품/녹음에 연결되지 않은 파일 후보 표시.

### 세 번째 마일스톤

- `file_picker` 기반 플랫폼 폴더 선택 어댑터.
- 스캔 경로 모델: 표시명, 경로, 등록일, 마지막 스캔일, 마지막 스캔 파일 수, 활성 상태.
- 앱 지원 디렉터리의 `classical_local_scan_locations.json` 경로 저장소.
- 첫 화면의 `폴더 추가`, `다시 스캔`, `비활성화/활성화` 흐름.
- 등록된 실제 폴더를 `FileSystemAudioFileScanner`로 재스캔하고 파일 후보 저장소에 병합.
- 데모 스캔과 실제 폴더 스캔 UI 분리.
- picker와 파일 시스템 스캔을 인터페이스 뒤에 둔 위젯/저장소 테스트.

### 네 번째 마일스톤

- 스캔된 파일의 파일명/경로 기반 메타데이터 후보 추론.
- `MetadataCandidate`: 파일 ID, 파일 경로, 파일명, 작곡가 후보, 작품 후보, 악장 후보, 트랙 번호 후보, 신뢰도.
- 앱 지원 디렉터리의 `classical_local_metadata_candidates.json` 후보 저장소.
- 지원 패턴:
  - `01 Allegro.flac`
  - `Beethoven - Symphony No.5 - I. Allegro.flac`
  - `Dvorak/New World/04 Allegro con fuoco.mp3`
- `정리 필요` 파일 목록에서 추론 후보를 함께 표시.
- 실제 FLAC/MP3/M4A 바이너리 태그 읽기 라이브러리는 아직 도입하지 않고, 파일명/경로 기반 추론부터 검증한다.

### 다섯 번째 마일스톤

- `정리 필요` 파일을 기존 샘플 트랙에 연결하는 최소 내부 흐름.
- `AudioFileTrackLink`: 파일 ID, 트랙 ID, 연결 시각.
- 앱 지원 디렉터리의 `classical_local_file_links.json` 연결 저장소.
- 연결된 파일은 `linked` 상태로 저장하고 `정리 필요` 목록에서 제외.
- 첫 화면에서 파일 후보별 `샘플 트랙에 연결` 액션과 `연결됨` 상태 표시.
- `LinkedAudioFileResolver`로 재생 계획의 트랙에 연결된 로컬 파일을 해석할 수 있는 기반 마련.
- 원본 파일 태그는 수정하지 않고 앱 내부 저장소만 갱신한다.

### 여섯 번째 마일스톤

- 작곡가, 작품, 악장, 연주 녹음, 스캔 파일 후보 검색.
- 한글명, 원어명, 영어명, 정렬명, 별칭, 작품번호를 함께 검색.
- 토큰 기반 검색으로 `베토벤 5번`, `운명`, `Beethoven Symphony 5`, `Op.67` 같은 입력 지원.
- 파일 후보는 추론된 `MetadataCandidate`의 작곡가/작품/악장/트랙 번호 후보까지 검색.
- 첫 화면의 `검색` 패널과 결과 타입 표시.

### 일곱 번째 마일스톤

- 실제 오디오 재생 라이브러리 도입 전 로컬 큐 기반 강화.
- `LocalPlaybackQueueBuilder`: 작품/녹음 랜덤 계획을 로컬 파일 경로 큐로 변환.
- 연결된 파일이 있으면 샘플 파일 대신 연결 파일 경로를 큐에 사용.
- `FakeLocalPlayer`: play/pause/resume/next 상태 전이 테스트용 플레이어.
- 첫 화면의 현재 재생 큐에서 연결 파일 사용 여부 표시.
- 실제 오디오 출력은 아직 하지 않는다.

### 여덟 번째 마일스톤

- JSON 저장소가 늘어난 현재 구조를 SQLite 전환 관점에서 점검.
- 현재 저장소 경계:
  - `ScannedAudioRepository` + `ScannedAudioStore`
  - `ScanLocationRepository` + `ScanLocationStore`
  - `MetadataCandidateRepository` + `MetadataCandidateStore`
  - `AudioFileTrackLinkRepository` + `AudioFileTrackLinkStore`
- 각 저장소는 memory/json 구현을 유지하고, repository contract를 유지한다.
- 실제 SQLite 패키지는 아직 도입하지 않고, 먼저 schema와 JSON 마이그레이션 skeleton을 고정했다.
- `SqliteStorageSchema` version 1:
  - `scanned_audio_files` <= `classical_local_scan.json`
  - `scan_locations` <= `classical_local_scan_locations.json`
  - `metadata_candidates` <= `classical_local_metadata_candidates.json`
  - `audio_file_track_links` <= `classical_local_file_links.json`
- `JsonToSqliteMigrationPlanner`가 네 JSON payload를 SQLite seed row로 변환한다.
- fixture 테스트로 schema/table mapping, enum/bool/json 변환, 빈 payload 변환을 검증한다.

### 아홉 번째 마일스톤

- 실제 SQLite adapter와 on-device JSON migration 실행부 도입.
- 의존성 선택:
  - `sqflite`: Android/iOS 런타임 SQLite adapter.
  - `sqflite_common_ffi`: 테스트 환경 SQLite adapter.
- 앱 지원 디렉터리의 `classical_local_library.sqlite` DB 파일을 사용한다.
- `SqliteMigrationRunner`가 schema version 1을 적용하고 `schema_migrations`에 기록한다.
- `json_store_migrations`로 JSON seed migration 성공 상태와 row count를 기록한다.
- `SqliteScannedAudioStore`를 구현해 스캔 파일 저장소를 SQLite-backed store로 전환했다.
- 앱 기본 스캔 파일 저장소는 SQLite로 전환하고, 기존 JSON 파일은 삭제하지 않는다.
- `ScanLocationStore`, `MetadataCandidateStore`, `AudioFileTrackLinkStore`는 이번 단계에서 JSON 유지다.
- JSON payload 또는 앱 지원 디렉터리의 기존 JSON 파일을 DB에 upsert/replace 방식으로 seed migration한다.

### 열 번째 마일스톤

- 남아 있던 저장소 3개를 SQLite-backed store로 전환했다.
- `SqliteScanLocationStore`: 등록 폴더, 마지막 스캔 시각, 파일 수, 활성 상태를 `scan_locations` 테이블에 저장한다.
- `SqliteMetadataCandidateStore`: 파일명/경로 기반 후보 필드를 `metadata_candidates` 테이블에 저장한다.
- `SqliteAudioFileTrackLinkStore`: 파일-트랙 연결을 `audio_file_track_links` 테이블에 저장한다.
- 앱 기본 저장 전략은 네 저장소 모두 `classical_local_library.sqlite`를 공유한다.
- 기존 JSON 파일은 삭제하지 않고 legacy migration source로만 남긴다.
- 앱 기동 시 JSON migration은 성공 기록이 있으면 재적용하지 않아, 이후 SQLite에서 바뀐 값이 오래된 JSON으로 되돌아가지 않는다.
- 손상된 legacy JSON은 새 SQLite 저장소 기동을 막지 않는다.
- memory/json store는 테스트, fallback, 수동 fixture 확인 용도로 유지한다.

### 열한 번째 마일스톤

- 실제 오디오 출력 라이브러리 도입 전 재생 서비스 contract와 UI 컨트롤을 고정했다.
- `LocalPlaybackController`: queue load, play, pause, resume, next, stop 명령을 정의한다.
- `LocalPlaybackState`: 현재 상태, 큐, 현재 인덱스, 현재 항목, 한국어 상태 요약을 제공한다.
- `LocalPlaybackQueueItem`은 작품명, 녹음명, 파일 출처 라벨을 함께 가진다.
- `FakeLocalPlayer`는 실제 오디오 어댑터 없이 큐 상태 전이를 검증하는 테스트용 구현으로 확장했다.
- 첫 화면의 현재 재생 큐 패널에 재생/일시정지, 다음, 정지 아이콘 버튼과 현재 상태 표시를 추가했다.
- 연결 파일이 있으면 `연결 파일`, 없으면 `샘플 파일`로 큐 출처를 표시한다.
- 실제 오디오 출력은 아직 하지 않는다.

### 열두 번째 마일스톤

- `just_audio` 0.10.6 기반 `JustAudioLocalPlaybackController`를 추가했다.
- 앱 기본 플레이어는 실제 어댑터를 사용하고, 테스트에서는 `FakeLocalPlayer`를 주입한다.
- 재생 contract를 `Future<void>` 기반으로 바꾸고 상태 변경을 stream으로 구독한다.
- 큐 전체가 실제 연결 파일이고, 파일이 존재하며, 지원 확장자인 경우에만 재생한다.
- 샘플 경로, 누락 파일, 미지원 형식, 네이티브 오디오 로드 실패를 구조화된 오류로 보존하고 한국어 상태로 표시한다.
- 재생 준비 중에는 중복 명령을 막고 `불러오는 중` 진행 상태를 표시한다.
- 앱 화면 dispose 시 player stream과 네이티브 오디오 자원을 정리한다.
- 포그라운드 로컬 파일만 사용하므로 Android Manifest와 iOS Info.plist에 네트워크/백그라운드 권한을 추가하지 않았다.
- Android debug APK와 iOS Simulator 빌드, iOS Simulator 첫 화면 기동을 확인했다.
- 테스트용 실제 음원이 없어 소리 출력과 포맷별 디코딩은 아직 직접 검증하지 않았다.

### 열세 번째 마일스톤

- 재생 상태에 현재 위치, 전체 길이, 버퍼 위치, 탐색 여부, processing 상태를 추가했다.
- `just_audio`의 position/duration/buffer/current index 스트림을 앱 상태에 동기화하고, 화면 갱신은 초 단위로 제한한다.
- 현재 재생 패널에 `mm:ss`/`h:mm:ss` 시간과 진행 slider를 추가했다. 드래그 종료 시 한 번만 seek한다.
- `audio_session` 0.2.4를 직접 의존성으로 명시하고 음악 감상용 session을 구성한다.
- 전화나 다른 앱의 audio interruption이 시작되거나 출력 장치가 분리되면 일시정지하며, interruption 종료 후 자동 재생하지 않는다.
- 포그라운드 범위를 유지하기 위해 앱이 background로 이동하면 일시정지하고 현재 위치를 저장한다.
- SQLite schema v2에 `playback_positions`를 추가해 경로별 위치, 길이, 완료 여부, 파일 수정 시각을 저장한다.
- 일반 진행 위치는 15초 간격으로만 저장하고 pause, stop, 다음 악장, lifecycle 변화, dispose에서는 즉시 저장한다.
- queue를 새로 불러올 때 첫 악장의 유효한 위치만 복원한다. 자연스럽게 다음 악장으로 넘어갈 때는 저장 위치를 적용하지 않는다.
- 완료된 음원, 끝에서 10초 이내인 위치, 수정 시각이 달라진 파일은 처음부터 시작한다.
- `audio_service`와 background audio 권한은 추가하지 않았고 Android Manifest와 iOS Info.plist도 변경하지 않았다.

### 열네 번째 마일스톤

- 재생 위치와 별개인 `PlaybackHistoryEntry` 감상 세션 모델과 memory/deferred/SQLite 저장소를 추가했다.
- SQLite schema v3의 `playback_history`에는 트랙·녹음·작품 ID, 표시용 제목 snapshot, 경로, 시작/최근 시각, 실제 감상 시간, 마지막 위치, 길이, 완료 상태를 저장한다.
- 감상 이력은 계정이나 클라우드로 전송하지 않고 기기 내부의 `classical_local_library.sqlite`에만 저장한다.
- 실제 감상 시간은 seek로 바뀐 재생 위치가 아니라 `playing` 상태에서 흐른 시간만 가짜 시계로 계산 가능하게 기록한다.
- pause/resume은 같은 세션을 유지하고, 다음 악장·정지·완료·오류·새 큐·dispose에서 세션을 결정적으로 마감한다.
- 최근 감상 패널은 한국어 상태, 최근 위치와 길이, 감상 시각을 표시한다.
- `이어 듣기`는 선택한 악장부터 같은 녹음의 남은 악장을 순서대로 새 큐에 넣는다. 첫 악장은 기존 위치 복원 정책을 적용하고 이후 악장은 0초부터 시작한다.
- 카탈로그 항목이 사라져도 snapshot 경로가 유효하면 한 트랙으로 복구하며, 필요한 로컬 파일 연결이 없으면 실행을 막고 사유를 표시한다.
- 현재 재생 큐 패널은 이어 듣기로 만든 실제 controller 큐를 표시해 랜덤 재생 계획과 혼동되지 않게 했다.

### 열다섯 번째 마일스톤

- `just_audio`의 실제 네이티브 재생 경로를 iOS Simulator에서 통합 검증했다.
- 앱 asset의 짧은 결정론적 PCM WAV 두 개를 임시 로컬 파일로 복사해 load, play, pause, resume, seek, 다음 악장, 자연 완료, SQLite 이력/위치 저장과 복원을 확인했다.
- fixture는 외부 연주 음원이 아닌 테스트 전용 합성 음계이므로, 사람의 연주나 실제 청감 품질을 검증했다는 뜻은 아니다.
- 명시적 `next` 중 이전 악장의 재생 위치가 0으로 덮일 수 있던 비동기 경쟁 상태를 수정했다.

### 열여섯 번째 마일스톤

- 최근 감상에서 개별 삭제와 전체 삭제를 지원한다. 삭제 전 한국어 확인 대화상자를 표시한다.
- 보관 기간은 계속 보관, 최근 30일, 최근 90일, 최근 1년 중에서 고른다. 유한 보관 기간은 변경 시점과 앱 시작 시 오래된 감상 이력을 정리한다.
- 이력 삭제와 보관 기간 정리는 `playback_history`만 대상으로 하며, `playback_positions`의 재생 재개 위치는 유지한다.
- 활성 재생이 있으면 먼저 일시정지하고 감상 세션을 마감한 뒤 이력 관리 작업을 한다.

### 열일곱 번째 마일스톤

- 감상 통계는 전체, 최근 30일, 최근 90일로 조회할 수 있다.
- 총 감상 시간, 세션 수, 완료 수, 고유 트랙 수와 많이 들은 작품/녹음 목록을 기기 내부 이력으로 집계한다.
- SQLite schema v4는 보관 기간을 위한 `playback_history_preferences` 테이블을 추가하며, v1/v2/v3 데이터와 재생 위치·감상 이력을 보존한다.

### 열여덟 번째 마일스톤

- WAV fixture에 시작/중간/종료 marker tone과 무음 구간을 넣고, 순수 Dart PCM validator로 RIFF header, sample rate, duration, marker, 무음 구간을 검사한다.
- generator의 `--check` 모드는 커밋된 fixture가 결정론적 generator 출력과 동일한지 검사한다.
- native integration test는 fixture validator를 먼저 실행하고 marker 시각 seek, queue transition, position/history persistence를 실제 `just_audio` adapter로 확인한다.
- 이 증적은 fixture byte 무결성과 native decoder/state-machine 동작을 보강하지만, 사람의 가청 확인을 대체하지는 않는다.

### 열아홉 번째 마일스톤

- 스캔 지원 확장자와 실제 플랫폼별 재생 검증 상태를 별도 validation matrix로 관리한다.
- 현재 native integration에서 검증한 실제 container는 synthetic PCM WAV와 synthetic AAC-in-M4A다. MP3, FLAC, ALAC, OGG, OPUS는 스캔과 재생 시도 대상이지만 자동 native 호환성 완료로 표시하지 않는다.
- 이 환경에는 신뢰 가능한 다중 포맷 encoder/fixture source가 없어, 출처 불명 바이너리나 외부 음원을 추가하지 않았다.

### 스무 번째·스물한 번째 마일스톤

- 기존 Android AVD를 부팅해 `adb` 연결, Flutter device discovery, APK 설치, 실제 `just_audio` integration test를 Pixel Tablet Android 15 emulator에서 확인했다.
- iOS Simulator와 Android emulator 모두 decoder/state-machine 증적은 확보했지만, 실제 스피커·헤드폰 청감, Bluetooth route, 실제 기기 codec 품질은 여전히 수동 검증 대상이다.
- 실제 기기 체크리스트와 자동화/가청 검증 경계는 `docs/quality` 문서에 남긴다.

### 스물두 번째·스물세 번째 마일스톤

- `movement_1_aac.m4a`는 저장소의 합성 PCM WAV를 macOS 기본 `afconvert`로 AAC-in-M4A로 변환한 fixture다. iOS Simulator와 Android emulator의 실제 adapter에서 load, duration, position 증가, stop을 확인했다.
- AAC encoder metadata는 byte-stable하지 않아 `--check`에서 해시 비교 대신 `afinfo` codec/sample rate/duration contract를 확인한다.
- 연결된 대상은 iOS Simulator와 Android emulator뿐이며, 물리 iOS/Android 기기, Bluetooth/headphone route, 실제 acoustic output은 검증하지 않았다.

### 스물네 번째·스물다섯 번째 마일스톤

- SQLite regression test는 240 synthetic 파일, 12 scan location, 600 history session에서 recent/statistics/retention/index query plan을 확인한다.
- 이 검증은 개인정보 없는 정합성 및 index-use 확인이며, 실제 기기의 성능 benchmark나 대형 음악 컬렉션의 체감 성능 보증은 아니다.

### 스물여섯 번째 마일스톤

- 실제 연결 대상은 iPhone 17 iOS Simulator와 Pixel Tablet Android emulator뿐임을 다시 확인하고, 두 대상에서 production `just_audio` WAV/AAC-in-M4A 통합 테스트를 재실행했다. 물리 기기 또는 사람이 들은 소리로 표현하지 않는다.
- `LocalPlaybackInterruptionPolicy`는 pause, duck, unknown interruption의 시작 시점을 모두 안전하게 일시정지하고, 종료 후 자동 재개하지 않는다. becoming-noisy도 일시정지하며, memory audio session은 dispose 뒤 event를 내보내지 않는 테스트로 계약을 고정했다.
- 대형 SQLite 회귀 테스트는 240 synthetic scanned file, metadata candidate, track link, playback position과 12 scan location, 600 history session을 함께 저장한다. history retention 뒤에도 playback position이 남는 것을 확인한다.
- 설치된 `afconvert`/`afinfo`만 조사했다. AAC 생성은 가능하지만 ALAC, FLAC, MP3는 이 환경에서 유효한 encoder 출력으로 만들 수 없어 provenance가 불명확한 fixture를 추가하지 않았다.

### 스물일곱 번째 마일스톤

- `PlaybackStateTrace`는 명령 순서, player/processing 상태, 큐 index, synthetic track ID, 위치, 길이, failure kind를 경로 없이 한 줄씩 기록한다. 실패 assertion은 LLM/코딩 에이전트가 읽을 수 있는 최소 재현 증적으로 사용한다.
- 외부 property-test 패키지 없이 `seed=20261019`의 24개 재생 scenario와 8개 SQLite scenario를 반복한다. seed와 scenario index가 failure 메시지에 남아 재현 가능하며, 현재 CI에서 수 초 이내에 끝나는 규모다.
- 앱 상단의 `재생 진단`은 repository synthetic WAV/AAC/ALAC-in-M4A만 임시 경로에 복사해 load/play/pause/resume/stop을 확인한다. 개인 음악 파일, 감상 이력, 기기 식별자, 네트워크 전송을 사용하거나 저장하지 않는다.
- 진단의 `소리가 들림`/`무음 또는 이상`/`확인하지 않음`은 사용자의 수동 선택일 뿐 자동 청감 판정이나 원격 수집이 아니다.

### 스물여덟 번째 마일스톤

- 테스트 전용 reference model이 `FakeLocalPlayer`와 load/play/pause/resume/seek/next/stop, queue 교체, 실패 복구 상태를 비교한다. 고정 seed `20261019`, `20261020`, `20261021`마다 16개 scenario와 scenario당 24개 생성 명령을 실행하며, 실패에는 seed, scenario, command index와 경로 없는 `PlaybackStateTrace`가 남는다.
- native integration은 synthetic WAV/AAC를 교대해 10회 load/play/seek/pause/resume/stop하는 45초 상한의 bounded soak를 포함한다. 이는 decoder와 state machine 증적이며 물리 기기, 출력 route 또는 사람 청감 증적이 아니다.
- 이 bounded soak를 포함한 통합 테스트는 iPhone 17 iOS Simulator와 Pixel Tablet Android 15 emulator에서 통과했다. 연결된 물리 기기는 없었다.
- `재생 진단`은 schema version, generic platform, fixture ID, container/codec, transport boolean, failure kind, 사용자가 고른 청감 결과만 JSON으로 복사한다. 로컬 경로, 음악 metadata, 감상 이력, 기기 식별자와 native exception은 허용하지 않는다.
- 전달받은 report는 네트워크와 자동 저장 없이 표준 입력으로 검증한다: `dart run tool/validate_playback_diagnostic_report.dart`. 결과는 fixture 회귀 후보만 제시하며 codec 전체의 호환성 결론으로 일반화하지 않는다.
- 진단 controller는 앱의 감상 이력 coordinator와 분리되어 있고, UI 테스트는 진단 실행이 history/statistics를 만들지 않으며 position event가 전체 이력/통계 재조회로 이어지지 않음을 확인한다.

### 스물아홉 번째 마일스톤

- 순수 Dart `audio_metadata_reader` 기반 `AudioTagReader`를 추가했다. MP3(ID3), FLAC/OGG/Opus(Vorbis Comment), MP4/M4A(ilst), WAV(RIFF) 등 로컬 태그를 내부 모델로 변환하며, 앱은 원본 파일과 태그를 수정하지 않는다.
- 현재 production adapter가 읽는 필드는 제목, 앨범, 트랙 아티스트, 앨범 아티스트, 장르, 연도, 트랙·디스크 번호다. 범용 reader 모델에 없는 composer/work/movement 전용 필드는 파일명·폴더명 추론으로 보완한다.
- 태그 없음, 읽기 실패, 일부 태그는 파일명·경로 추론으로 fallback한다. 태그와 경로 후보가 충돌하면 자동 확정하지 않고 검토 대상으로 표시한다. native 예외 전문과 개인 파일 경로는 사용자 문구에 노출하지 않는다.
- 파일 identity는 전체 해시 대신 크기와 수정 시각의 저비용 지문을 사용한다. 경로가 달라도 후보가 하나뿐이면 기존 ID와 링크를 유지하고, 같은 후보가 여러 개면 자동 병합하지 않는다.
- 한 번의 누락은 일시적 접근 실패로 보고 보존하며, 두 번 연속 보이지 않을 때 `missing`으로 표시한다. 누락 파일은 DB와 링크에서 삭제하지 않고 재생 대상에서 제외하며, 재발견 또는 수동 대체 파일 선택으로 기존 ID에 재연결한다.
- `파일 정리` 화면은 정리 필요·연결됨·누락됨 필터, 태그와 추론 후보·신뢰도·충돌 표시, 검색 가능한 작품/녹음/트랙 선택, 승인·거절·연결 변경·해제·대체 파일 선택을 제공한다. 트랙당 파일 하나, 파일당 트랙 하나를 유지하며 충돌 교체는 확인 후 관련 상태를 함께 갱신한다.
- 작품·녹음 랜덤은 선택된 녹음의 악장 순서를 유지한다. 기본 정책은 연결된 악장만 원래 순서로 재생하고 누락 목록을 표시하며, `완전한 작품` 정책은 하나라도 누락되면 큐를 만들지 않는다. 악장/소품 랜덤은 단일 트랙만 선택한다.
- 검색은 대소문자·공백·구두점과 일반적인 라틴 발음기호를 완화하고, 한글 초성 및 한글·영문 별칭을 지원한다. 순위는 정확 일치, prefix, substring, 초성, 제한적 fuzzy 순이며 fuzzy는 앞선 방식의 결과가 없을 때만 fallback한다.
- SQLite schema v5는 태그 결과, 마지막 확인 시각, 연속 누락 횟수, availability, 저비용 지문, 후보 상세·검토 상태를 additive migration으로 추가한다. v4 행과 legacy JSON 원본은 삭제하지 않는다.
- 실제 태그 decoding은 합성 WAV 임시 복사본에 RIFF 태그를 기록하고 production reader로 다시 읽는 자동 테스트로 검증한다. 이는 사용자 음원, 물리 기기 청감, MP3/FLAC/ALAC/OGG/OPUS의 기기별 재생 호환성을 보증하지 않는다.

### 서른 번째 마일스톤

- 2026-10-20 기준 [IMSLP API](https://imslp.org/wiki/IMSLP:API)는 작곡가와 작품 목록 및 작품 페이지 URL을 제공하지만 파일 목록·권리 metadata·직접 다운로드 API는 문서화하지 않는다. 앱은 공식 MediaWiki 검색 API로 작품 후보만 조회하며 작품 연결은 항상 사용자가 확인한다.
- 검색이 부족할 때 공식 IMSLP HTTPS 작품 URL을 직접 연결할 수 있다. `imslp.org`와 그 하위 host만 허용하고 유사 host, 사용자 정보가 포함된 URL, 임의 HTTP 주소를 거절한다.
- [IMSLP Public domain 안내](https://imslp.org/wiki/Public_domain)에 따라 IMSLP 표기는 사용자의 국가에서의 이용 가능성을 보장하지 않는다고 표시한다. 악보 저작권과 녹음·실연·음반 권리를 구분하며 불명확·지역 제한·회원 또는 대기 상태는 앱 내 다운로드를 허용하지 않는다.
- 공식 파일 API가 없으므로 live HTML에서 파일 링크를 추출하지 않는다. IMSLP 페이지에서 확인한 공식 HTTPS 직접 URL과 권리 표기를 사용자가 명시적으로 등록한 경우에만 확인 dialog 후 다운로드한다. 대기, 회원, CAPTCHA, 지역 제한은 우회하지 않는다.
- 다운로드는 redirect host, MIME, 확장자, 최대 100 MiB, 안전한 파일명과 SHA-256을 검증한다. 임시 파일에서 완료 파일로 이동하고 checksum 중복을 제거한 뒤 오디오는 기존 scanner와 metadata 후보 흐름에 넣는다.
- SQLite schema v6은 작품 연결, 자료 snapshot, 다운로드·가져오기 provenance를 분리한다. IMSLP URL, 외부 ID, 원문 권리 상태, 라이선스, checksum, 최초·현재 경로와 로컬 file ID를 보존하며 파일 이동·누락·수동 재연결 시 source reference를 유지한다.
- 외부 IMSLP 서버를 호출하지 않는 MediaWiki JSON fixture, loopback HTTP download, redirect 차단, MIME·checksum·중복, scanner import, SQLite migration 및 widget 테스트를 기본 검증으로 사용한다.
- loopback WAV fixture의 다운로드·rename·scanner 등록 통합 테스트를 iPhone 17 iOS Simulator와 Android 15 API 35 emulator에서 통과했다. 이는 IMSLP live 파일이나 실제 권리 상태를 검증했다는 뜻은 아니다.

### 서른한 번째 마일스톤

- iPhone 17 iOS 26.5 Simulator에서 production bundle을 debug build로 설치·기동하고 한국어 홈 화면을 스크린샷으로 확인했다. 최신 재검증 대상 SQLite schema는 v11이며 앱 테이블과 `integrity_check=ok`를 integration smoke test로 확인한다.
- `ios_app_smoke_integration_test.dart`는 깨끗한 SQLite에서 production 앱을 띄워 저장소 준비, 홈 화면 주요 도구, IMSLP 화면 진입, schema v6와 DB 무결성을 실제 iOS plugin 환경에서 검증한다.
- `audio_playback_integration_test.dart`와 `imslp_import_integration_test.dart`를 같은 시뮬레이터에서 다시 통과시켜 native WAV/AAC 재생과 loopback 파일 import 회귀를 확인했다.
- `imslp_live_search_integration_test.dart`는 iOS 런타임의 DNS/TLS/HTTPS와 공식 MediaWiki JSON 파싱을 확인한다. 외부 서비스 상태에 좌우되므로 기본 회귀 묶음에는 넣지 않고 명시적으로만 실행한다.
- 화면 dispose 시 앱이 소유한 기본 SQLite 연결을 닫도록 lifecycle 경계를 보강했다. 시뮬레이터 결과는 물리 스피커 출력, 사람의 청감, Bluetooth·헤드폰 route, 실제 폴더 선택 권한의 증거가 아니다.

### 서른두 번째 마일스톤

- iOS에서는 외부 폴더 경로를 장기 저장하지 않고 시스템 문서 선택기에서 여러 음원 파일을 고른 뒤 앱 지원 디렉터리의 `managed_audio`로 즉시 복사한다. Android와 데스크톱의 기존 폴더 스캔은 유지한다.
- 선택 파일은 스트림으로 `.part`에 기록하고 크기와 최대 2 GiB 제한, 확장자·MIME, 안전한 파일명과 SHA-256을 확인한 뒤 완료 파일로 이동한다. 원본 파일은 읽기만 하며 삭제·이동·태그 수정을 하지 않는다.
- checksum이 같은 파일은 중복으로 처리하고, 이름만 같은 다른 파일은 `(2)` 접미사로 보존한다. 복사 성공 뒤 scanner와 metadata 후보 흐름에 넣으며 분석 실패 파일은 다음 기동에서 복구할 수 있는 pending 상태로 남긴다.
- SQLite schema v7의 `local_audio_imports`는 원본 파일명, 앱 관리 경로, SHA-256, 크기, 가져온 시각, 상태와 로컬 file ID를 저장한다. 외부 원본의 절대 경로와 security-scoped URL은 저장하지 않는다.
- 앱 시작 시 남은 `.part`를 정리하고 managed 파일을 다시 대조한다. 한 번의 누락은 유예하고 두 번 연속 누락된 경우 missing으로 표시하며 같은 원본을 다시 가져오면 기존 provenance를 복구한다.
- iOS 화면은 `파일 가져오기`를 기본 진입점으로 표시하고 폴더 추가를 숨긴다. 진행 단계, 선택 취소, 일부 실패, 중복을 한국어 상태로 표시하며 가져오기 중 폴더 스캔과 중복 실행을 제한한다.
- `file_picker`의 native 문서 선택기 자체는 자동화하지 않는다. 그 반환값 이후의 production 복사·SQLite 등록·scanner·`just_audio` 재생·재기동 복원은 iOS Simulator 통합 테스트로 검증한다.

### 서른세 번째 마일스톤

- 후속 후보 중 외부 API나 실기기 없이 검증 가능한 앱 관리 음원 저장 공간 관리를 이어서 구현했다.
- `파일 정리` 화면은 현재 앱 관리 음원의 파일 수와 총 용량을 표시한다. `localImport` 출처인 항목만 삭제 명령을 제공하며 일반 폴더 스캔 파일이나 IMSLP 파일에는 적용하지 않는다.
- 삭제 전 확인을 요구하고 앱 지원 디렉터리 안의 관리 복사본인지 다시 검증한다. 삭제하면 해당 스캔 행, metadata 후보, 트랙 링크와 로컬 import provenance를 함께 정리한다.
- 선택 당시 외부 원본, 원본 태그, 감상 이력과 재생 위치는 삭제하지 않는다. 삭제 전에 `deleting` 상태를 저장하고 파일·연관 DB 정리를 반복 가능하게 수행하므로 중간 종료 뒤 다음 시작에서 마칠 수 있다.

### 서른네 번째 마일스톤

- 파일 가져오기는 파일 순번과 복사 byte 진행률을 제공하고 256 KiB 단위로 UI 알림을 제한한다. 청크를 순차 기록해 파일 전체를 메모리에 올리지 않으며 read/write/저장 공간 부족/크기 불일치를 구분한다. 가져오기·시작 복구·삭제는 같은 관리 폴더에서 직렬 실행된다.
- 영속 상태는 legacy `copied`를 읽으면서 `analysisPending`, `completed`, `deleting`, `missing`, `failed`를 구분한다. 복사 중 상태는 원자적 rename 전의 메모리 진행 상태이며 `.part`와 함께 재시작 시 정리한다. DB 행 없는 완료 파일은 checksum provenance를 재구성해 다시 분석한다.
- `파일 정리`에서 `localImport` 복사본만 시스템 공유 시트로 내보낸다. `share_plus`에 파일 경로를 직접 전달하므로 전체 byte를 메모리에 복제하지 않는다. 취소·사용 불가·실패는 경로나 native 오류 없이 한국어로 표시한다.
- `local_file_feedback` schema와 stdin validator는 generic platform/provider 분류, 파일 수, 허용 형식, picker/import/export/relaunch 결과만 받는다. 경로, 파일명, metadata, 기기 식별자와 자유 형식 오류는 허용하지 않고 자동 업로드도 하지 않는다.
- macOS 내장 `afconvert`로 synthetic ALAC-in-M4A를 추가했다. `afinfo` 계약과 iPhone 17 iOS 26.5 Simulator의 production `just_audio` load/duration/play/position/stop을 통과했다. MP3/FLAC/OGG/Opus와 물리 기기 청감은 여전히 미검증이다.
- 모든 iOS plugin이 Flutter 생성 Swift Package에 포함됨을 확인하고 공식 Flutter 절차로 CocoaPods integration을 제거했다. clean 상태의 Swift Package 전용 simulator build와 로컬 import/audio integration test가 통과했다.

### 서른다섯 번째 마일스톤

- 홈 작품·녹음 목록, 검색 결과와 Discovery 결과에서 작품 상세 또는 녹음 상세로 이동한다. 인물·파일 검색 결과는 별도 상세 문맥이 없어 기존 비선택 상태를 유지한다.
- 작품 상세는 작곡가, 작품 번호·시대·원어명, 순서가 보존된 악장과 보유 녹음을 보여준다. 녹음이 여러 개면 임의로 섞지 않고 사용자가 녹음을 선택한다.
- 녹음 상세는 앨범, 연도, 앙상블, 역할별 크레디트, 악장·트랙 순서와 로컬 파일 가용성을 보여준다. 전체 녹음 또는 선택한 악장부터 남은 악장을 순서대로 재생할 수 있다.
- `LibraryDetailBuilder`가 활성 파일 연결, 사용자 메타데이터 교정과 작품·녹음 canonical alias를 반영한다. 화면은 repository, SQLite와 오디오 엔진에 직접 접근하지 않는다.
- `PlayMovementRow`는 악장 번호·원어명·길이·파일 가용성·현재 재생 상태를 글자와 semantics로 함께 표시하며 전체 파일 경로를 노출하지 않는다.
- 상세 화면을 위해 SQLite schema나 공통 UI 패키지를 변경하지 않았다. 현재 schema는 v13이다.

### 서른여섯 번째 마일스톤

- 출시 후보 안정화에서 저장소 초기화와 실제 폴더 스캔 실패를 사용자에게 경로·native 오류 없이 안내하고, 같은 화면에서 다시 시도할 수 있게 했다. 실패 뒤 busy 상태도 정상적으로 해제한다.
- 검색·파일 재연결·정리 화면의 legacy 데이터에서도 전체 경로 대신 파일명만 표시한다. 로컬 데이터 초기화와 외부 링크 실패 문구에도 내부 경로나 native 예외를 포함하지 않는다.
- 개인정보 처리방침과 지원 링크는 공개 `https` URL만 열며, 값이 없거나 잘못된 경우 `공개 HTTPS URL 준비 중`으로 표시한다.
- 320px 폭, Dynamic Type 200%, dark theme, reduced motion, 상세 화면 왕복 뒤 검색 상태 보존을 widget test로 고정했다.
- iPhone 17 Pro와 iPad Pro 13-inch iOS 26.5 Simulator에서 production startup을 확인했고, iPhone에서 synthetic WAV/AAC/ALAC 재생과 로컬 파일 가져오기·재기동 회귀를 통과했다.
- 출시 준비 감사 결과와 사람이 확인해야 할 항목은 [`docs/quality/classical-local-library-release-readiness-audit-2026-10-23.md`](../../docs/quality/classical-local-library-release-readiness-audit-2026-10-23.md)에 기록한다. 승인된 최종 아이콘, 공개 지원·개인정보 URL, 배포 서명과 App Store Connect 수동 선언이 준비되기 전에는 공개 출시 후보로 승인하지 않는다.

### 서른일곱 번째 마일스톤

- `release_candidate_preflight`가 버전·bundle ID·표시명·production define, 공개 URL, AppIcon, privacy manifest, 권한, 민감 문자열, 배포 metadata, 물리 기기 피드백과 선택 release artifact를 `pass`·`warning`·`blocked`·`fail`로 구분한다.
- 기본 검사는 외부 결정이 없어도 실행할 수 있으며 구현 오류가 있으면 exit 1, `--require-ready` 상태에서 외부 차단이 남으면 exit 2를 반환한다. 보고서에는 비밀값이나 로컬 경로를 넣지 않는다.
- `ReleaseCandidateFeedbackReport`는 앱/build, generic 기기 분류, OS major, 승인 fixture·format, VoiceOver·Dynamic Type·가져오기·재생·재실행·출력 route·interruption·청감과 P0–P3만 받는다. 파일명·경로·곡 metadata·기기 ID·native 오류는 허용하지 않는다.
- 제출 준비 판정에는 iPhone과 iPad 물리 기기 피드백이 모두 필요하며, 미확인 항목 또는 P0/P1이 있으면 차단한다. 앱은 report를 저장하거나 업로드하지 않는다.
- screenshot fixture를 앱 integration test와 배포 adapter가 공유한다. 각 장면은 앱 root에서 독립적으로 시작하고 lazy vertical list를 제한 횟수 안에서 탐색한다.
- `library`, `movement_queue`, `work_detail`, `recording_detail` 계약을 iPhone 17 Pro와 iPad Pro 13-inch iOS 26.5 Simulator에서 통과했다. 이는 실제 screenshot 촬영·시각 검수 또는 물리 기기 증거가 아니다.

### 서른여덟 번째 마일스톤

- 설정의 `라이브러리 백업`은 카탈로그, 메타데이터 후보·교정, 파일 연결, 병합 감사 기록, 재생 위치·감상 이력·보관 설정과 IMSLP 작품 연결을 versioned JSON으로 내보내고 복원한다. 원본 음원, 앱 관리 음원 복사본, 실제 파일·폴더 경로, scan location, IMSLP 다운로드 cache와 일시적인 재생 큐 snapshot은 포함하지 않는다.
- 백업은 20 MiB와 100,000행 상한, 정확한 scope와 count, ID·참조·alias cycle, 경로·credential 비포함 계약을 먼저 검사한다. 가져오기는 preview와 사용자 확인 뒤 한 SQLite transaction에서 실행하고, 같은 파일을 다시 가져와도 중복되지 않으며 실패하면 전부 rollback한다. 복원된 파일은 `누락됨`으로 두어 사용자가 실제 음원을 다시 연결해야 한다.
- `파일 정리`의 누락 음원은 기존 미연결 후보 또는 새로 가져온 파일과 비교한다. lightweight fingerprint, 크기, 포맷과 안전한 태그 근거를 한국어로 보여준 뒤 사용자 확인을 받아 기존 file ID, 교정값, 링크, 재생 위치·감상 이력과 출처를 한 transaction에서 새 경로로 옮긴다. 이미 다른 트랙에 연결된 파일과 미지원 형식은 거부한다.
- SQLite schema v14의 `playback_queue_state`는 track ID와 현재 track ID만 저장한다. 앱 재시작 시 현재 카탈로그와 실제 연결 파일로 큐를 다시 만들고 누락 악장은 제외하며, 모든 파일이 없으면 재생하지 않고 한국어 상태를 표시한다. 플레이어 명령과 dispose는 직렬화해 연속 탭과 lifecycle 경쟁을 줄였다.
- 100명·1,000작품·1,000녹음·5,000트랙의 결정론적 fixture로 검색, 상세, discovery와 큐 계획을 회귀 검증한다. `dart run tool/benchmark_large_library.dart`의 이 개발 환경 기준값은 검색 약 189 ms, 작품 상세 2.6 ms, 녹음 상세 2.1 ms, discovery 0.9 ms, 큐 계획 0.3 ms이며 기기 성능 보장은 아니다. 실제 SQLite 카탈로그 load는 규모와 무관하게 9개 query를 사용하며 5초의 넉넉한 회귀 상한을 통과한다.
- 현재 재생·큐·파일 행은 상태와 순서, 선택 여부, 동작 가능 여부를 semantics로 제공한다. 누락 파일 확인 대화상자는 320px 폭과 Dynamic Type 200%에서도 취소·재연결 명령에 도달할 수 있게 스크롤한다. VoiceOver의 실제 발화 품질은 물리 기기 검수 대상으로 남긴다.

## 재생 검증 범위

- iOS Simulator와 Android emulator에서 실제 `just_audio`와 SQLite를 연결한 synthetic WAV/AAC-in-M4A 통합 테스트를 통과했다. ALAC-in-M4A는 iOS Simulator에서 추가 통과했다. 상세 증적은 `docs/quality/classical-local-library-device-audio-evidence-2026-10-19.md`에 남긴다.
- 물리 iOS/Android 기기의 실제 디코딩과 가청 출력, Android ALAC 및 FLAC/MP3/OGG/Opus 포맷 호환성, 오디오 포커스와 헤드폰 동작은 별도 검증이 필요하다.
- LLM/코딩 에이전트는 trace와 seed 기반 테스트 로그를 분석해 반례와 회귀 테스트를 추가할 수 있지만, 이 결과는 사람의 청감 검증을 대체하지 않는다.

## Musicus 참고점

Musicus의 UI를 복제하지 않고 모델링 아이디어만 참고했다.

- `works -> recordings -> tracks` 흐름을 Flutter/Dart 모델로 축소했다.
- 앨범은 작품 계층이 아니라 녹음을 담는 발매 정보로 따로 두었다.
- `track_works` 개념은 `Track.workPartIds`로 시작했다.
- program/random playback은 `ClassicalPlaybackPlanner`의 재생 계획으로 작게 시작했다.

우리 앱에서 다르게 잡은 점:

- 첫 마일스톤에서는 SQLite/파일 스캔/실제 오디오 재생을 넣지 않았다.
- 랜덤 선택은 테스트 가능하도록 selector를 주입할 수 있게 했다.
- 한국어 로컬라이징과 IMSLP 권리 메모 확장 지점을 초기 모델에 포함했다.

두 번째 마일스톤에서는 Musicus의 로컬 라이브러리 방향을 따라가되, 아직 DB 스키마를 굳히지 않았다. 스캔 결과는 JSON 저장소에 보존하고, 작품/녹음 연결은 `needsReview` 상태로 남긴다.

## 실행

```sh
cd apps/classical_local_library
flutter run
```

샘플 카탈로그를 사용하는 개발 실행:

```sh
flutter run --dart-define=ENABLE_DEMO_LIBRARY=true
```

## 릴리스 빌드

Android release artifact는 debug key로 서명하지 않는다. 저장소 밖의 keystore와 아래
환경 변수를 사용한다.

```sh
export CLASSICAL_RELEASE_STORE_FILE=/absolute/path/to/upload-keystore.jks
export CLASSICAL_RELEASE_STORE_PASSWORD=...
export CLASSICAL_RELEASE_KEY_ALIAS=...
export CLASSICAL_RELEASE_KEY_PASSWORD=...
flutter build appbundle --release \
  --dart-define=APP_VERSION_LABEL='0.1.0 (1)' \
  --dart-define=PRIVACY_POLICY_URL="$PRIVACY_POLICY_URL" \
  --dart-define=SUPPORT_URL="$SUPPORT_URL"
```

`android/key.properties`, `*.jks`, `*.keystore`는 git에서 제외한다. iOS archive와 배포는
Apple Developer Team과 배포 인증서가 준비된 뒤 Xcode/Flutter 표준 서명 절차를 따른다.
공개 URL이 정해지기 전까지 개인정보·지원 항목은 앱 안에서 `준비 중`으로 표시한다.
두 URL은 공개 `https` 주소만 허용하며 자격 증명이 포함된 URL은 거부한다.

## 검증

```sh
cd apps/classical_local_library
dart format lib test integration_test tool
flutter test
flutter analyze
dart run tool/generate_audio_fixtures.dart --check
```

iOS Simulator 네이티브 검증:

```sh
flutter test integration_test/ios_app_smoke_integration_test.dart -d <ios-simulator-id>
flutter test integration_test/local_audio_import_integration_test.dart -d <ios-simulator-id>
flutter test integration_test/audio_playback_integration_test.dart -d <ios-simulator-id>
flutter test integration_test/imslp_import_integration_test.dart -d <ios-simulator-id>
flutter test integration_test/imslp_live_search_integration_test.dart -d <ios-simulator-id>
flutter test integration_test/screenshot_scene_contract_integration_test.dart -d <ios-simulator-id>
flutter build ios --simulator --no-codesign
flutter build ios --release --no-codesign \
  --obfuscate --split-debug-info=/secure/archive/symbols
```

마지막 live 검색은 IMSLP 실서버 상태와 네트워크에 의존하는 선택 검사다. 상세 실행 증적은 `docs/quality/classical-local-library-ios-simulator-evidence-2026-10-20.md`에 있다.

익명 재생 진단 report 검증:

```sh
cat diagnostic-report.json | dart run tool/validate_playback_diagnostic_report.dart
cat local-file-feedback.json | dart run tool/validate_local_file_feedback.dart
cat release-candidate-feedback.json | dart run tool/validate_release_candidate_feedback.dart
```

출시 사전 점검:

```sh
cd ../../deployment
bundle exec fastlane release_candidate_preflight \
  manifest:apps/classical-local-library/ios-metadata.yaml \
  artifact:../apps/classical_local_library/build/ios/iphonesimulator/Runner.app \
  review_details:/external/review-contacts.json
```

`feedback:`에는 validator를 통과한 쉼표 구분 JSON 경로를 전달한다. 외부 입력이 모두 준비된
최종 게이트에서만 `require_ready:true`를 사용한다. 운영 문의 연락처는 저장소 밖 JSON을
`review_details:`로 전달하며 보고서에는 연락처 값이나 파일 경로가 출력되지 않는다.

현재 의존성:

- `path_provider`: SQLite와 iOS managed audio를 앱 지원 디렉터리에 두기 위해 사용한다.
- `file_picker`: iOS의 다중 음원 파일 선택과 지원 플랫폼의 폴더 선택에 사용한다. 테스트에서는 picker 반환값을 주입한다.
- `sqflite`: 런타임 SQLite DB 파일, 사용자 메타데이터 교정과 작품·녹음 병합 감사 기록을 포함한 로컬 라이브러리 저장소에 사용한다.
- SQLite schema v14는 로컬 파일·태그·누락 상태, 재생 위치·이력·보관 설정, ID 기반 재생 큐 snapshot, IMSLP/로컬 가져오기 provenance, 필드별 교정 출처, 되돌릴 수 있는 병합 감사 기록과 MusicBrainz cache를 additive migration으로 관리한다. 이전 schema 데이터와 legacy JSON 원본은 삭제하지 않는다.
- `just_audio`: 앱이 실행 중일 때 연결된 로컬 오디오 큐를 실제로 재생한다.
- `audio_session`: 음악용 오디오 포커스, interruption, 출력 장치 분리 이벤트를 처리한다.
- `audio_metadata_reader`: 네이티브 플러그인 없이 로컬 오디오 태그를 읽어 앱 내부 메타데이터 후보로 변환한다.
- `http`: IMSLP 공식 MediaWiki 검색 API, MusicBrainz 후보 검색과 준비된 AcoustID lookup 경계에 사용한다.
- `crypto`: 다운로드 파일의 SHA-256 provenance와 중복 확인에 사용한다.
- `url_launcher`: 직접 처리할 수 없는 IMSLP 자료를 공식 페이지에서 확인하도록 연다.
- `share_plus`: 앱 관리 음원 복사본을 iOS/Android 시스템 공유 대상으로 내보낸다.
- `sqflite_common_ffi`: 테스트 환경 SQLite DB 검증에 사용한다.

## 메타데이터 식별과 병합

- 파일 관리 화면에서 작곡가, 작품명·번호, 악장명·순서, 연주자, 지휘자, 앙상블, 연도를 앱 내부 DB에서 교정할 수 있다. 원본 오디오 태그는 수정하지 않는다.
- 유효값 우선순위는 사용자 교정 > MusicBrainz 승인 > 원본 태그 > 자동 추론이다. 필드별 값과 출처를 보존하며 사용자 교정을 초기화하면 아래 승인값으로 복원한다.
- MusicBrainz 검색은 로컬 경로나 파일명을 보내지 않고 유효 메타데이터만 사용한다. 후보와 반영 필드를 사용자가 각각 승인해야 하며 `--dart-define=MUSICBRAINZ_CONTACT=mailto:...`처럼 연락 가능한 User-Agent 설정이 있어야 실제 조회한다.
- MusicBrainz 호출은 공식 정책에 맞춰 1초에 1회 이하로 직렬화한다. 동일 요청은 합치고 검색 30일, 상세 90일, 빈 결과 1일 TTL로 SQLite에 저장한다. 429/503과 일시적 네트워크 오류는 `Retry-After`를 우선해 최대 3회만 재시도하며 영구 오류와 잘못된 응답은 cache하지 않는다.
- 작품·녹음 중복은 작곡가, 작품 번호, 정규화 제목, MusicBrainz ID 같은 강한 근거가 있을 때만 후보로 제시한다. 사용자 확인 후 감상 이력과 IMSLP 참조를 한 SQLite transaction에서 대표 ID로 옮기고 전후 스냅샷을 남긴다. 병합 이후 관련 행이 바뀌지 않았을 때만 transaction으로 되돌리며, 연결된 후속 병합은 최근 기록부터 되돌려야 한다.
- 활성 병합 alias는 검색 결과, discovery 결과와 새 재생 큐의 작품·녹음 ID에 적용한다. 되돌린 감사 기록은 보존하며 같은 원본을 다시 병합해도 이전 기록을 덮어쓰지 않는다.
- AcoustID lookup은 공식 권고에 따라 긴 fingerprint를 URL이 아닌 gzip POST body로 전송하며 3회/초 제한, 키·timeout·API 오류와 fixture 파싱을 검증한다. 공식 서비스는 비상업 무료 사용 조건이고 fingerprint DB는 CC BY-SA 3.0, MusicBrainz-AcoustID mapping은 CC0다.
- 2026-10-20 조사한 `chromaprint` Flutter FFI 패키지는 iOS/Android build를 제공하지만 16-bit raw PCM 입력이 필요하다. 현재 앱에는 MP3/FLAC/M4A를 PCM으로 디코딩·리샘플링하는 검증된 공통 경로가 없고 패키지도 도입 초기이므로 production 지문 생성은 capability가 `unavailable`인 상태로 유지한다. 임의 바이너리를 내려받지 않는다.
- discovery 화면은 같은 작곡가의 작품, 같은 작품의 다른 녹음, 최근 감상과 교정·승인 메타데이터 기반 결과를 한국어 추천 근거와 함께 표시한다. 행을 누르면 상세 화면으로 이동하고 별도 재생 아이콘은 기존 녹음 큐를 바로 시작한다.
- 활성 감상 세션은 재생 상태 이벤트를 기준으로 30초마다 checkpoint해 강제 종료 시 손실 범위를 줄이며 pause, stop, 완료와 dispose 저장은 그대로 유지한다.

정책 근거:

- MusicBrainz API와 rate limit: https://musicbrainz.org/doc/MusicBrainz_API
- MusicBrainz 데이터 라이선스: https://musicbrainz.org/doc/About/Data_License
- AcoustID Web Service: https://acoustid.org/webservice
- AcoustID/Chromaprint license: https://acoustid.org/license
- Chromaprint: https://acoustid.org/chromaprint

아직 하지 않은 것:

- 원본 파일 태그 쓰기.
- 백그라운드 재생과 잠금 화면/알림 제어.
- 헤드폰 버튼과 시스템 미디어 세션 명령.
- gapless/crossfade 품질과 실제 기기별 포맷 호환성 검증.
- JSON migration 이후 cleanup/archive 정책.
- 감상 이력 내보내기.
- 사용자 계정과 클라우드 이력 동기화.
- IMSLP가 문서화하지 않은 파일 목록 자동 조회와 직접 다운로드 URL 자동 추출.
- 검증된 native Chromaprint 어댑터와 AcoustID live 매칭.
- MusicBrainz와 AcoustID의 상용 이용 조건 확정.
- 실제 iOS 문서 선택기, iCloud Drive 제공자와 대용량 파일 가져오기·공유 시트 저장 UX 검증.

## 로컬 QA와 데이터 초기화 고도화 (2026-10-23)

사용자 요청에 따라 출시 작업과 아이콘 확정은 보류한다. 디자인 승인은 별도 디자인 작업에서
진행하며, 이 단계는 데이터 무결성과 로컬 자동 검증에 집중한다.

- 전체 초기화 전에 재생을 멈추고 메모리 큐를 비우며 위치·이력·큐 저장을 마친다. 이후
  SQLite 삭제에 `playback_queue_state`도 포함한다. 준비 실패 시 삭제를 시작하지 않는다.
- 큐 저장 실패 뒤 동일 큐를 재시도할 수 있고, 명시적 clear는 대기 중 쓰기 뒤 실행된다.
  시작 시 idle 이벤트는 복원할 큐를 지우지 않는다.
- 재생 진단을 다시 실행하면 이전 청감 응답을 지우고, runner 예외는 경로 없는 오류로
  표시한다. 자동 확인과 사람의 청감은 별개다.
- 자체 PCM에서 FLAC fixture를 생성한다. 호스트 `afconvert`로 WAV/AAC/ALAC/FLAC을 실제
  디코딩해 길이·세 marker 주파수·무음 RMS·clipping을 검사한다. 이는 iOS 디코더나
  실제 스피커·Bluetooth의 음질 검증이 아니다. MP3 encoder는 로컬에 없어 미검증이다.

앱 디렉터리에서 실행한다:

```sh
dart run tool/run_local_qa.dart
dart run tool/verify_decoded_audio.dart
```

전용 시뮬레이터는 `DDIRORI-QA-`로 시작하는 이름으로 새로 만들고 boot한 뒤
`dart run tool/run_local_qa.dart --simulator <UUID>`로 검사한다. 기존 사용자 기기는 사용하지
않는다. smoke는 테스트 앱 DB를 초기화하므로 이 실행기는 일반 이름의 시뮬레이터와
물리 기기를 거부한다. 전용 기기도 개인 라이브러리 없이 유지한다.

`build/local_qa/run-*/report.json`에는 실제 exit code·시간·로그 SHA-256과 실행 전후
소스 fingerprint를 기록한다. 실패해도 독립 검사는 이어가며 timeout/도구 없음/소스 변경은
PASS가 아니다. 원시 로그는 checkout 경로가 포함될 수 있는 **로컬 전용 개발 증적**이며
익명 사용자 피드백과 다르다. 자동 업로드하지 않는다. Flutter 의존성 확보 이후 검사는
로컬 fixture를 사용하며 paid farm·상시 서버·LLM API를 요구하지 않는다.

5000트랙 benchmark는 호스트 프로세스 생성 시간·RSS·검색/상세/큐 시간을 기록한다.
query 수는 측정값이 아니라 코드 검사값으로 별도 표기한다. 실기기 시작·스크롤 성능과
대규모 개인 라이브러리 성능을 대신 보증하지 않는다.

## 배포 재개 후 후보

1. 승인된 최종 App Store 아이콘과 공개 개인정보·지원 URL을 반영하고 signed archive의 App Store validation을 통과한다.
2. App Store Connect의 개인정보, 연령 등급, 콘텐츠 권리, 수출 규정, 가격·배포 지역과 TestFlight 연락처를 운영자가 확정한다.
3. 물리 iPhone/iPad에서 VoiceOver, Dynamic Type, Files/iCloud 문서 선택기, 실제 음원 재생과 출력 route를 사용자 피드백으로 검증한다.
4. 첫 TestFlight 후보에서 P0/P1 회귀가 없음을 확인한 뒤 screenshot capture와 메타데이터 검수를 완료한다.
5. 공개 출시 뒤에만 Chromaprint, 상용 외부 서비스 정책, 백그라운드 재생 같은 비필수 확장을 다시 평가한다.

# Classical Local Library Physical Device Checklist

## 안정성 후속 — 2026-11-11, 새 후보 제공 후5~10분

기존 TestFlight0.1.0(4)에서는 이번 기능을 검수할 수 없다. 새 후보를 별도 받은 뒤 실제 build/OS만 기록하고 개인 보관함을 초기화하지 않는다. 각 항목은 `passed / issue / notChecked`로 답하며 무응답은 notChecked다.

1. 곡 세 개로 예약·미래 항목 이동/제거·셔플/반복을 확인한다. 일시정지 후 같은 조작으로 재생이 시작하지 않아야 한다. 앱 재시작 시 순서·선택과 기존 위치 정책을 확인한다.
2. 즐겨찾기를 저장/해제하고 화면을 왕복한다. 새로고침만 실패했다는 안내가 있으면 `즐겨찾기 다시 불러오기`를 사용한다. 이미 저장한 곡을 다시 토글하라고 안내하면 issue다. 재생 오류의 `재생 다시 시도`는 첫 항목부터 재생하는 명시적 동작이다.
3. IMSLP 공식 페이지 확인→Files/iCloud 저장→앱 가져오기→보기/명시적 재생→출처 확인을 검사한다. 취소는 완료가 아니며 가져온 파일은 정리/출처 취소로 지워지지 않아야 한다.
4. VoiceOver·큰 글자로 미니/전체 재생·즐겨찾기·큐 메뉴·slider·오류 재시도에 접근한다. 상태 낭독·읽기 순서·modal 종료 후 focus와 조작을 실제로 확인한다. 자동 semantics 검사와 별도다.
5. 가능한 본인 권리 음원의 MP3/FLAC/M4A를 듣고 스피커·유선·Bluetooth·전화/다른 오디오를 확인한다. 액세서리가 없으면 미확인이다. simulator/host PCM 통과를 실제 들림으로 대신 답하지 않는다.

JSON을 직접 작성할 필요 없이 번호별 `통과 / 문제 / 미확인`과 문제 재현 순서만 회신해도 된다. LLM이 report로 옮길 때도 실제 응답만 사용하며 OS/build를 모르면 값을 추측하지 않고 응답 초안으로 남긴다.

선택적 report의 기존 platform/deviceClass/osMajor·format/provider·VoiceOver/listening/interruption 필드는 유지한다. schema2의 `musicActions`는 queueReservation/queueEditing/queueModes/queueRestoration/favorites/imslpPageReturn/imslpImport/imslpSourceConfirmation이며 각각 위 결과 enum만 받는다. `automaticChecks`는 semantics/decoderSignal/nativeTransport/simulatorLifecycle이며 실제 runner 증거를 따로 보관한다. 사용자가 실행하지 않은 자동 항목은 notChecked로 두며 자동 통과로 사용자 응답을 채우지 않는다. v1도 읽지만 새 항목은 미확인이다.

`dart run tool/validate_release_candidate_feedback.dart`는 stdin JSON의 unknown/private 필드를 거부하고 issue를 고정 회귀 ID로 출력한다. 이 ID에 개인정보 없는 synthetic 재현 순서를 붙여 다음 회귀를 만든다. 곡명·파일명·경로·음원·계정·기기 ID·로그 전문을 넣지 않으며 자동 전송하지 않는다. P0/P1 신고 없음은 출시 승인이 아니다.

## 대기열·즐겨찾기·IMSLP — 2026-11-11, 미배포 후속

기존 내부 TestFlight0.1.0(4)에는 이 기능이 없다. 새 후보가 별도 제공된 뒤 iPhone Xs에서5~10분간 확인하며 기존 보관함을 초기화하지 않는다. 빌드·OS·통과/문제/미확인과 재현 순서만 남기고 개인 곡명·파일 경로·음원을 보내지 않아도 된다.

1. 세 곡 이상을 재생하며 다른 곡의 더보기에서 바로 다음/마지막에 추가한다. 실제 다음 곡과 대기열이 같고 현재 곡·위치가 이어져야 한다. 일시정지 후 예약해도 소리가 다시 시작하면 안 된다.
2. 현재 재생 상세에서 미래 항목의 이동·제거·남은 항목 비우기를 확인한다. 현재/과거는 보호하고 저장된 재생목록·보관함 곡은 그대로여야 한다. 셔플·반복과 중복 곡도 확인하고 재시작 시 같은 순서·선택·위치를 자동 재생 없이 복원하는지 본다.
3. 곡·현재 재생에서 즐겨찾기를 추가/해제하고 보관함 즐겨찾기 검색·정렬·뒤로 복귀를 확인한다. 앱 재시작·누락 파일 재연결 후에도 같은 곡의 선택이 유지되어야 한다. 실패 안내가 성공으로 남으면 문제로 기록한다.
4. IMSLP 자료에서 작품을 등록하지 않고 검색·공식 페이지를 연다. 직접 이용 조건을 확인한 음원을 Files에 저장하고 앱으로 돌아와 가져온다. 가져온 곡 보기/재생을 확인하고 페이지 출처는 확인 dialog에서 의도한 파일에만 연결한다. 실제 Files/iCloud 제공자의 선택·취소와 앱 복귀를 검사한다. 외부 페이지 열기만으로 다운로드 완료라고 표시하면 안 된다.
5. VoiceOver와 큰 글자에서 새 곡 메뉴·예약·즐겨찾기 상태·큐 편집·검색/오류·완료 행동에 접근하는지 본다. 화면을 잠가 실제 전환의 청감·갭·출력을 듣고 가능한 전화/장치 분리 후 자동 재개가 없는지 확인한다. 제공되지 않는 액세서리는 미확인으로 남긴다.

로컬 widget·loopback·실제 native SQLite/transport와 시뮬레이터 OS 전환은 이 물리 청감·제공자·발화·시스템 버튼 결과를 대신하지 않는다. 공개 출시 승인을 뜻하지 않는다.

## 셔플·반복 후속 QA — 2026-11-03, 미배포

**현재 TestFlight0.1.0(4)에는 아래 모드가 없다.** 이 항목은 새 후보 제공 후 사용하며 이번 작업에서는 업로드하거나 설치 가능하다고 주장하지 않는다. 기존 보관함을 초기화하지 않고 개인 음원명·경로 없이 통과/문제/미확인만 기록한다. 아래 과거 큐 복원/생명주기 표와 다르면 이 절 및 현재 빌드 정책을 따른다.

1. 세 곡 이상을 재생하고 전체 재생에서 셔플을 켠다. 현재 곡·시간이 유지되고 대기열의 남은 순서로 다음 곡이 재생되는지 확인한다. 끄면 같은 곡·위치에서 원래 순서로 돌아가며 재생목록 수동 순서는 바뀌지 않아야 한다.
2. 한 곡 반복으로 끝 부근을 탐색하고 같은 곡으로 이어지는지 듣는다. 수동 다음/이전은 다른 곡으로 이동한다. 일시정지 후 같은 조작을 하면 자동 재생하지 않아야 한다. 전체 반복은 마지막에서 첫 항목으로, 반복 끔은 완료로 끝나야 한다.
3. 셔플+전체 반복은 같은 순서를 유지한다. 화면을 잠가 자연 전환을 듣고 시스템 다음/이전/seek와 앱의 곡·시간·대기열이 일치하는지 확인한다. 실제 출력의 무음·갭·클릭·클리핑은 simulator 상태 값으로 판정하지 않는다.
4. 일시정지한 중간 항목에서 앱을 종료·재실행한다. 같은 모드·셔플 순서·선택 occurrence·저장 위치를 복원하고 직접 재생하기 전에는 소리가 나지 않아야 한다. 이전 저장 데이터는 셔플/반복 끔이며 누락 파일은 건너뛴다. 완료 상태의 재실행은 마지막 항목을 준비 상태로 복원하는 기존 정책이다.
5. VoiceOver로 셔플 켜짐/꺼짐과 반복 세 상태·선택·사용 불가를 구분한다. 큰 글자에서 이전·재생·다음·정지·재생목록 추가·모드·seek에 스크롤로 도달하는지 확인한다. 전화/출력 장치 분리·진단 종료가 자동 재개하지 않는지도 확인한다.

실제 기기·OS·후보 빌드와 재현 순서만 선택적으로 기록한다. 자동 캡처·native 반복·명령 주입은 물리 청감·OS 버튼·VoiceOver 통과의 대체 증거가 아니다.

## iPhone Xs 보관함·검색 QA — 0.1.0(4), 2026-11-02

사용자가 요청한 내부 TestFlight 새 빌드의 검수다. 배포 기록에서 실제 설치 가능 상태를 확인한 뒤 TestFlight의 빌드4로 업데이트한다. 기존 개인 보관함을 초기화하지 않고 OS 버전과 통과/문제/미확인만 기록한다.

1. 기존 곡과 재생목록이 남아 있는지 확인한다. 곡을 재생하며 전체 검색에 제목·초성을 빠르게 입력하고 지워 최신 결과만 표시되는지 본다. 입력·뒤로·스크롤·재생/일시정지에 접근하고 검색만으로 큐·위치가 바뀌지 않아야 한다.
2. 새 재생목록을 저장하면 원래 화면에 완료 안내가 나타나고 ‘보기’를 누를 때만 상세로 이동해야 한다. 뒤로 돌아와 이전 목록/검색/스크롤과 현재 재생을 확인한다. 분류·정렬을 바꾸고 재시작해 목록이 유지되는지 본다.
3. 재생목록 표지를 선택·교체·제거한다. 실제 Files/iCloud 선택·취소와 누락 파일 복구를 확인한다. 표지 오류가 원본 삭제나 재생 실패로 이어지면 안 된다.
4. 전원 버튼으로 잠그고30초 청취한 뒤 잠금 화면·제어센터에서 곡 정보와 재생/일시정지·다음·이전·seek를 확인한다. 아래 빌드3의 중단/분리·진단 정책도 유지되어야 한다.
5. VoiceOver로 검색 준비·오류/다시 검색·곡 행·현재 재생을 탐색한다. 실사용 대형 보관함의 입력 지연·열·메모리 문제는 개인 곡명/경로 없이 재현 순서만 전달한다.

499개 앱 테스트와 simulator/fixture 결과는 실제 iPhone Xs 설치·청감·제공자·발화·성능 결과를 대신하지 않는다.

## iPhone Xs 시스템 미디어 QA — 0.1.0(3), 2026-10-30

TestFlight에서 build 3을 선택하고 iOS 버전을 함께 기록한다. 개인 곡명·파일 경로·계정 정보 대신 각 항목을 통과/문제/미확인으로 답한다.

1. 1분 이상 음원 두 곡을 재생한다. 잠금 화면과 제어센터의 곡명·아티스트·시간이 앱의 현재 곡과 일치하는지 확인한다. 정보가 없는 음원은 없는 정보를 만들지 않아야 한다.
2. 시스템 재생/일시정지·다음·이전·진행 위치를 조작하고 앱으로 돌아와 큐·위치·상태를 비교한다. 일시정지 중 다음/이전은 음악을 시작하지 않아야 한다. 이전은 3초 이상에서 현재 곡 처음, 3초 미만에서 이전 곡이다.
3. 잠금 상태에서 30초 청취하고 다음 곡·마지막 완료를 확인한다. 완료 뒤 재생은 큐 첫 곡, 정지 뒤에는 오래된 앱 명령이 음악을 다시 시작하지 않아야 한다. 버튼 표시는 iOS가 결정하므로 노출되지 않는 버튼은 미확인으로 기록한다.
4. 재생 진단을 실행하고 화면을 닫아도 음악이 겹치지 않는지 확인한다. 진단 정리 후 본재생 큐·위치는 유지되고 직접 재생을 눌러야 다시 시작해야 한다.
5. 가능한 경우 전화/다른 오디오, 헤드폰 분리·재연결을 확인한다. 종료·재연결만으로 음악을 자동 재개하지 않아야 한다. 없는 액세서리는 미확인으로 둔다.

자동 QA의 채널 주입·Now Playing 센터 조회·시뮬레이터 OS 앱 전환은 이 물리 기기 검수를 대신한 통과 결과가 아니다.

## iPhone Xs 화면 잠금 QA — 0.1.0(2), 2026-10-30

이 항목은 아래 2026-10-23 배포 보류 기록 이후 재개된 내부 TestFlight용 검수다. 새 빌드 번호와 iOS 버전을 먼저 확인한다.

1. 권리가 있는 1분 이상 음원을 재생한 뒤 전원 버튼으로 화면을 잠그고 30초 동안 계속 들리는지 확인한다.
2. 잠금 상태에서 곡이 끝나면 다음 곡으로 넘어가는지 확인한다. 잠금을 풀었을 때 큐·현재 곡·진행 위치가 이어져야 한다.
3. 직접 일시정지한 뒤 잠금·잠금 해제해도 자동 재생하지 않는지 확인한다. 홈 화면이나 다른 앱으로 전환해도 재생은 이어져야 한다.
4. 가능한 경우 전화/다른 오디오 시작과 헤드폰 분리 시 일시정지하고, 종료/재연결만으로 자동 재생하지 않는지 확인한다.
5. 마지막 곡 완료와 정지 후 뜻하지 않은 재생이 없는지 확인한다. 강제 종료 후 자동 재생과 잠금 화면 재생 버튼은 이번 기능에 포함되지 않는다.

각 항목을 `통과 / 문제 / 미확인`으로 답하고, 문제는 개인 음원명·경로 없이 재현 순서만 남긴다. 시뮬레이터의 OS 앱 전환과 상태 trace는 실제 화면 잠금·청감의 대체 통과 근거가 아니다.

## 5~10분 사용자 점검 (배포 재개 시)

2026-10-26 출시 준비를 재개했고 사용자가 현재 Play 아이콘을 승인했다.
사용자가 iPhone XS에서 직접 QA를 진행한다. OS 버전·결과는 아직 받지 않았으며
iPad 물리 검수와 스토어 제출은 별도다. 자동화로 대체하지 못한 실기기 검수만 다음과 같이 묶어 둔다.
앱의 iOS 최소 버전은 15.0이다. Apple의 호환 목록에서 iPhone XS는 iOS 18에 포함되지만
iOS 26에는 포함되지 않는다. 따라서 iOS 26.5 시뮬레이터 통과와 별개로 실제 iPhone XS의
설치·첫 실행·재생을 확인하고 기기의 iOS 버전을 기록한다.
호환성 근거: [Apple iOS 18](https://support.apple.com/en-us/104985),
[Apple iOS 26](https://support.apple.com/en-us/123705).
자체 fixture만 들어 있는 테스트 설치를 사용하고 개인 라이브러리를 초기화하지 않는다.

1. 1분: VoiceOver로 검색, 가져오기, 재생/일시정지, 다음, 정지에 접근한다.
   이름과 상태가 낭독되고 이동 순서가 자연스러운지 통과/문제/미확인으로 답한다.
2. 2분: Files에서 기기 내 fixture 하나를 가져오고, iCloud 제공자는 가능할 때만 별도로
   선택·취소·다시 가져오기 한다. 앱을 다시 열어 복사본 재생 여부를 확인한다.
3. 2분: 재생 진단을 실행하고 들림/무음 또는 이상/미확인 중 하나를 고른다. 재실행하면
   이전 청감 답은 초기화된다. 권리 확인된 MP3/FLAC/M4A도 가능할 때 짧게 듣는다.
4. 2분: 사용 가능한 스피커·유선·Bluetooth 출력에서 재생/정지를 확인한다. 액세서리가
   없으면 미확인으로 남긴다. 다른 오디오나 interruption 뒤 뜻하지 않은 자동 재생이 없는지 확인한다.
5. 1분: 큰 글씨로 현재 큐와 감상 기록 도구를 살펴보고 stop 후 재실행의 상태를 확인한다.
6. 1분: 가져온 곡 두 개를 재생목록에 담고 순서를 바꾼 뒤 재생한다. 목록에서
   한 곡을 제거해도 보관함의 원본이 남고, 앱 재실행 뒤 목록 순서가 유지되는지 확인한다.

`PlaybackDiagnosticReport`는 자동 transport와 청감 응답을 분리한다. Files의 결과는
`LocalFileFeedback`, 전체 후보 결과는 `ReleaseCandidateFeedbackReport`의 기존 제한된
enum으로 기록한다. 부족한 항목을 통과로 채우지 않는다. 연락처·곡명·파일명·경로·기기
식별자·음원·로그 전문 대신 fixture 분류와 결과만 사용자 의사로 전달한다.

자동 대체 증거는 host unit/widget, 호스트 decoder PCM, iOS Simulator native transport로
구분한다. 셋 중 어느 것도 실제 VoiceOver 발화, 제공자 로그인 UI, 물리 출력 route나
청감을 증명하지 않는다. 대형 실제 개인 라이브러리는 별도 자발적 사용자 검증 범위다.

Use this checklist on a physical iOS device and a physical Android device.
Record only fixture identifiers or user-approved test files; do not export a
user's personal paths, titles, metadata, or listening history.

| Area | Procedure | Expected result | Record |
| --- | --- | --- | --- |
| Cold start | Launch after install, force quit, then relaunch; repeat once after interrupting storage preparation | The library opens or presents a path-free Korean retry action; retry restores normal use | Device, OS, stage, result |
| Accessibility | Traverse first use, import, search, work detail, recording detail, and playback with VoiceOver | Reading order is coherent; icon actions have names; status is not color-only | Device, OS, screen, result |
| Large text | Repeat the main flow at the largest practical Dynamic Type size in light and dark appearance | Text remains readable without overlap; critical commands remain reachable | Device, OS, size, appearance, result |
| Layout | Repeat first use and details on one iPhone and one iPad orientation supported by the app | No clipped labels, inaccessible controls, or incoherent empty space | Device, orientation, result |
| Public links | Open privacy and support links from Settings | Approved public HTTPS pages open; unavailable configuration is clearly reported | URL class only, result |
| Format | Try `movement_1.wav`, `movement_1_aac.m4a`, `movement_1_alac.m4a`, then approved MP3/FLAC fixtures when available | Clear success or Korean error without app termination | Device, OS, fixture ID, container/codec, result |
| iOS import | In Files, iCloud Drive, and one installed provider, select one and multiple approved fixture files | Files copy into the app library, appear in review, and remain after relaunch | Provider class, count, format, result |
| Import cancel | Cancel selection, then cancel or background during a large approved fixture copy | No completed partial file; relaunch removes `.part` and remains usable | Stage, approximate size, result |
| Duplicate | Import the same fixture twice, then a different fixture with the same filename | Checksum duplicate is reported once; different content is retained without overwrite | Fixture IDs, result |
| Source safety | Compare an approved source fixture before and after import | Original still exists and its SHA-256 is unchanged | Fixture ID and hash equality only |
| Import recovery | Relaunch after a successful import, then play the managed copy | Library record and playback remain available without reselecting the source | Fixture ID, result |
| Logical backup | Export a library backup, inspect the preview on import, then restore it into a clean test install | Catalog and listening state return; no audio bytes or original file/folder paths are present; restored files require relinking | Backup format/version, counts, result |
| Missing file relink | Make an approved fixture unavailable, choose the same fixture from Files, review the confidence reasons, and confirm relinking | Existing library identity, correction, link and listening state are retained; playback uses the selected copy | Fixture ID, confidence class, result |
| Export | Export an app-managed fixture through the share sheet and save it to an approved provider | Export completes or reports cancellation/failure in Korean; the managed copy remains unchanged | Provider class, fixture ID, result |
| Transport | Play, pause, resume, seek, next, stop | State, position, and queue index remain consistent | Device, OS, result |
| Queue | Play a multi-movement work | Movement order and completion are correct | Fixture IDs, result |
| Queue recovery | Stop the app on a middle movement, relaunch, then repeat with one fixture unavailable | Current movement is first after recovery; unavailable movements are skipped and explained without exposing paths | Fixture IDs, available count, result |
| Lifecycle | Background then foreground the app | Current policy pauses and stores position | OS, result |
| Interruption | Start another audio source or receive an interruption | Playback pauses and does not auto-resume unexpectedly | Source type, result |
| Wired route | Connect/disconnect wired headphones | Route change does not crash; playback policy is observed | Accessory class, result |
| Wireless route | Connect/disconnect Bluetooth headphones | Route change does not crash; playback policy is observed | Accessory class, result |
| Long file | Seek and pause after sustained playback | Resume position is credible and persisted | Format, duration, result |
| Listening | Listen for clipping, silence, distortion, unexpected gaps | Observations are explicitly human observations | Device, route, volume, notes |

Every failure message captured for feedback must omit the full local path and
native exception text. Retry startup, scan, import, playback stop, or a fresh
queue load as appropriate and record whether recovery succeeds.

`movement_1.wav`, `movement_1_aac.m4a`, and `movement_1_alac.m4a` are synthetic repository fixtures.
They do not contain a third-party performance and may be recorded by fixture
identifier only. Do not substitute a personal music file in an automated log.

## Low-Cost Diagnostic Flow

1. Open `재생 진단` from the app bar.
2. Run the repository synthetic WAV/AAC/ALAC-in-M4A transport check.
3. Select only one human listening result: heard, silent/abnormal, or not checked.
4. Tap `진단 결과 복사`. The JSON contains only a generic platform, fixture/container/codec, transport booleans, structured failure kind, and the selected listening result.
5. Send it only when the user explicitly chooses to do so. The app does not save or upload it.
6. Validate a received report locally with `dart run tool/validate_playback_diagnostic_report.dart` through standard input. The tool neither uses the network nor stores the report.
7. For picker/provider feedback, use the path-free schema and validate it with `dart run tool/validate_local_file_feedback.dart`. Do not add paths, filenames, metadata, device identifiers, or free-form native errors.
8. Record the release decision fields in `ReleaseCandidateFeedbackReport` JSON and validate it with `dart run tool/validate_release_candidate_feedback.dart`. Exit 2 means the valid report contains a release-blocking P0/P1.
9. Run the release preflight with both an iPhone and iPad report. Missing device classes, unchecked required fields, and P0/P1 remain blocked.

The displayed automatic result proves load/position/pause/resume/stop state
transitions only. It does not prove acoustic quality, Bluetooth routing, or
human audibility.

An LLM/coding agent may run deterministic tests, inspect the seed and
`PlaybackStateTrace`, minimize a counterexample, and add a synthetic regression
test. It must not claim to hear sound or infer physical route/quality from a
passing report. A failed fixture is investigated as that fixture/platform path
first, not declared a failure of the entire codec.

## Failure Record

- Date and tester
- Device model and OS version
- App build identifier
- Audio format and fixture identifier
- Reproduction steps
- Observed player state and Korean error message
- Whether the problem reproduces after stop and a fresh queue load

Do not add user audio file paths or personal listening-history contents to the
failure record.

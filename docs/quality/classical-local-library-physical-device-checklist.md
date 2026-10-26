# Classical Local Library Physical Device Checklist

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

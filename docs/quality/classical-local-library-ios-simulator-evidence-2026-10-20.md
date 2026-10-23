# Classical Local Library iOS Simulator Evidence

Date: 2026-10-20

## Target

- Device: iPhone 17 Simulator
- Runtime: iOS 26.5
- Device ID: `179447AC-F99C-4746-B9C1-CDA653EA9B2D`
- Bundle ID: `app.inc.classicalLocalLibrary`

## Production App

`flutter build ios --simulator --debug --no-codesign`로 production entry app을 빌드하고 `simctl install`, `simctl launch`로 설치·기동했다. 한국어 홈 화면, 라이브러리 요약, 검색, 파일 가져오기, IMSLP·파일 정리·재생 진단 도구가 렌더링되며 확인한 범위에서 clipping이나 비정상 overlap은 없었다. iOS에서는 `파일 가져오기`와 `데모 스캔`이 보이고 외부 `폴더 추가`는 표시되지 않았다.

Screenshot: [iOS import home](classical-local-library-ios-import-home-2026-10-20.png)

앱 지원 디렉터리에 `classical_local_library.sqlite`가 생성되었다. 2026-10-20 최신 재검증에서 `schema_migrations`의 version은 11이며 병합 undo 스냅샷과 `musicbrainz_cache`를 포함한 additive migration을 확인했다. 로컬 가져오기 provenance, 필드별 교정·fallback 출처, 되돌릴 수 있는 작품·녹음 병합 감사 기록과 외부 metadata TTL cache를 관리한다.

- `scanned_audio_files`
- `scan_locations`
- `metadata_candidates`
- `audio_file_track_links`
- `playback_positions`
- `playback_history`
- `playback_history_preferences`
- `imslp_work_links`
- `imslp_resources`
- `imslp_imports`
- `local_audio_imports`
- `metadata_overrides`
- `library_entity_merges`
- `musicbrainz_cache`

SQLite `PRAGMA integrity_check` 결과는 `ok`였다.

## Automated Runs

다음 integration test를 위 시뮬레이터에서 각각 실행했다.

```sh
flutter test integration_test/ios_app_smoke_integration_test.dart -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/local_audio_import_integration_test.dart -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/audio_playback_integration_test.dart -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/imslp_import_integration_test.dart -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
flutter test integration_test/imslp_live_search_integration_test.dart -d 179447AC-F99C-4746-B9C1-CDA653EA9B2D
```

검증 범위:

- production 저장소 wiring과 깨끗한 SQLite v11 startup
- 홈 화면의 iOS 파일 가져오기 정책과 IMSLP route의 한국어 UI
- 선택 결과로 제공된 synthetic WAV의 원본 보존, 앱 관리 저장소 복사, SHA-256 일치, SQLite provenance, scanner·metadata 후보 등록
- 관리 복사본의 production `just_audio` 재생 위치 증가와 SQLite 재개방 후 가져오기·파일·후보 복원
- 관리 음원 사용량 계산, 원본 보존 삭제와 연관 repository 정리
- production `just_audio` adapter의 합성 WAV/AAC load, play, pause, resume, seek, queue transition, completion, 오류 복구
- 재생 위치와 감상 이력 SQLite 저장·복원
- loopback HTTP WAV의 임시 다운로드, SHA-256, 완료 파일 이동, scanner 등록
- iOS runtime에서 IMSLP 공식 MediaWiki HTTPS 검색, JSON 파싱과 공식 URL 정책

live IMSLP test는 외부 서비스 상태와 네트워크에 의존하므로 기본 `flutter test`의 통과 조건에는 포함하지 않는다. 기본 단위·widget test는 fixture와 loopback server를 사용한다.

결과:

- 외부 네트워크를 쓰지 않는 위 integration test 4개 각각 통과
- `flutter test`: 228개 통과
- `flutter analyze`: issue 없음
- `flutter build ios --simulator --debug --no-codesign`: 성공
- deterministic audio fixture check와 placeholder 잔여 검색 통과

production 실행 뒤 앱 container를 직접 조회해 SQLite version 11과 `integrity_check=ok`를 다시 확인했다. 2026-10-20의 병합 undo, discovery와 MusicBrainz cache 마일스톤에서도 iPhone 17 Simulator에서 최신 `ios_app_smoke_integration_test`와 `flutter build ios --simulator --no-codesign`가 통과했다. 최종 재검증의 app build는 13.0초, smoke test Xcode build는 17.6초였고 테스트는 1개 통과했다. 같은 시뮬레이터에서 `audio_playback_integration_test`도 Xcode build 16.2초 뒤 1개 통과해 fixture WAV/AAC/ALAC의 native queue와 상태 전이를 다시 확인했다. 최종 production process를 대상으로 `DatabaseException`, unhandled exception, crash를 검색했으며 일치하는 로그는 없었다. 앞선 native audio test process의 unified log에는 CoreAudio hardware plist와 Flutter focus cache 등 simulator framework 진단이 error level로 기록되었지만 테스트의 decoder 상태와 종료 코드는 정상이다.

후속 검증에서 `share_plus`를 포함한 모든 iOS plugin이 `FlutterGeneratedPluginSwiftPackage`에 포함됨을 확인했다. Flutter 공식 절차로 CocoaPods를 deintegrate하고 Podfile, lock, Pods 참조와 xcconfig include를 제거했다. `flutter clean` 이후 Swift Package만으로 `flutter build ios --simulator --debug`가 성공했으며 local audio import와 audio playback integration test도 다시 통과했다.

같은 audio integration에 repository PCM에서 `afconvert -f m4af -d alac`로 만든 `movement_1_alac.m4a`를 추가했다. production `just_audio` adapter가 ALAC를 ready 상태로 load하고 약 2.4초 duration, 300ms 이상 position 증가와 stop을 확인했다. 이는 iOS Simulator decoder 증거이며 Android 또는 물리 iPhone의 지원·가청 품질을 뜻하지 않는다.

## Limits

- iOS Simulator는 물리 iPhone의 스피커, DAC, Bluetooth·유선 출력 route와 실제 청감 품질을 검증하지 않는다.
- `file_picker`가 반환한 스트림 이후는 자동화했지만 시스템 문서 선택기 UI, Files/iCloud/서드파티 provider별 선택과 대용량 파일 UX는 물리 기기 사용자 피드백이 필요하다.
- 앱은 security-scoped bookmark를 유지하지 않고 선택 직후 sandbox로 복사하므로 외부 provider의 장기 접근을 검증하거나 요구하지 않는다.
- 전화·Siri·다른 오디오 앱에 의한 실제 interruption과 시스템 미디어 버튼은 검증하지 않았다.
- live 검색은 IMSLP 파일 다운로드, 국가별 권리 상태 또는 대기·회원 절차를 검증하지 않는다.
- MP3, FLAC, OGG, OPUS과 물리 기기의 ALAC decoder·태그 호환성은 남아 있다.

## 2026-10-23 재검증

- 환경: macOS 26.6.2, iOS 26.5, iPhone 17 Pro Simulator와 iPad Pro 13-inch (M5) Simulator.
- `flutter build ios --simulator --no-codesign`가 19.1초에 성공했다.
- 두 simulator에서 production startup과 작품·녹음 상세 큐 smoke test를 통과했다. 새 DB의 `schema_migrations`는 v14이며 `playback_queue_state`를 포함하고 `PRAGMA integrity_check`가 `ok`였다.
- 두 simulator에서 `library`, `movement_queue`, `work_detail`, `recording_detail` 화면 계약을 앱 root부터 각각 통과했다. 이는 실제 screenshot 촬영이나 디자인 승인이 아니다.
- iPhone에서 synthetic WAV/AAC/ALAC의 실제 `just_audio` 큐, 위치, seek, 완료, 오류 복구와 SQLite 위치·이력을 통과했다.
- iPhone에서 선택 결과 이후 앱 관리 복사, checksum, scanner·SQLite 등록, 재생, 재기동 복원과 원본 보존을 통과했다. 시스템 Files/iCloud 선택기 UI 자체는 자동화하지 않았다.
- 순수 Flutter 회귀 303개, `flutter analyze`, fixture `--check`와 100명·1,000작품·1,000녹음·5,000트랙 benchmark 및 SQLite load 상한도 통과했다.

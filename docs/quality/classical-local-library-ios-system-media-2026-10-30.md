# 띠로리 Play iOS 시스템 미디어 — 2026-10-30

## 범위와 방식

0.1.0(3)은 기존 just_audio와 iOS background audio를 유지하며 공개 `MPNowPlayingInfoCenter`/`MPRemoteCommandCenter`에 현재 곡 정보와 play/pause/toggle/이전/다음/seek/stop을 연결한다. Flutter와 시스템은 같은 SerializedLocalPlaybackController를 사용한다. 새로운 플레이어·의존성·권한·SQLite migration은 없다.

진단은 별도 just_audio 인스턴스를 생성한다. 단일 player를 요구하는 just_audio_background 대신 iOS에 한정한 얇은 MediaPlayer 채널을 선택했다. audio_service의 AudioHandler 방식도 공식 문서에서 확인했으며, 이번 iOS 범위에는 엔진·진단 구조를 유지하는 직접 adapter가 적합하다고 판단했다. Android 서비스·알림·CarPlay는 별도 범위다.

태그/교정 값의 artist·album을 전달하고, 녹음명을 artist로 바꾸지 않는다. 클래식 title은 작품·악장을 사용하며 표시 ID는 track ID의 SHA-256이다. 파일 경로·URL·외부 artwork 요청은 전달하지 않는다.

## 조작 계약

- 재생 중 이동은 재생을 이어가고, paused 이동은 paused를 유지한다. ready/stopped에서 이동은 재생을 시작하지 않고 ready가 된다.
- 이전: 3초 이상이면 현재 곡 처음, 미만이면 이전 항목, 첫 항목에서는 처음. completed에서 이전은 마지막 항목 처음의 paused 상태다.
- 마지막 다음은 completed와 currentIndex == queue.length를 유지한다. completed의 재생은 첫 항목부터다. 시스템 표시용 마지막 항목과 실제 currentItem(null)을 구분한다.
- 알 수 없는 길이의 seek·준비 중 명령은 비활성화한다. stop·빈 큐·오류·dispose는 시스템 정보와 명령을 정리한다. 실제 버튼 배치는 iOS가 결정한다.
- 시스템 명령은 선택의 ID/generation과 실행 시점 queue/index를 확인한다. UI next 뒤 늦은 seek, 큐 교체, stop/진단 전 명령은 잘못된 항목에 적용하지 않는다. 미디어 publish는 순서를 보존하고 최신 상태로 합치며, 실패가 음악 재생을 중단하지 않는다.
- 진단은 본재생을 pause한 후 앱/시스템 명령을 잠근다. 화면을 닫아도 실행 중 진단이 정리될 때까지 lease를 유지한다. 완료·실패 후 본재생의 큐·위치를 유지하며 자동 재개하지 않는다.

## 검증

| 범위 | 증거 | 결과 |
| --- | --- | --- |
| 상태/정보/완료·길이 미확정·loading·파일 오류 | system_media_test.dart | 엔진 상태 반영, 정보·명령 정리 |
| remote 조작·3초 경계·paused 보존 | 같은 domain 테스트 + native 채널 integration | play/pause/next/previous/seek/stop 전달 |
| 오래된 seek·큐 교체·publish 실패 순서·pending dispose | 같은 domain 테스트 | 다른 항목 오염 방지, 후속 갱신 복구 |
| 진단 success/failure·화면 닫기 | domain + home widget + native 실제 fixture 진단 | 본재생 pause·큐/위치 보존, 자동 재개 없음 |
| UI 이전 버튼·완료/오류 비활성 | play_playback_components_test.dart | 공통 IconButton과 동작 상태 확인 |
| 전체 Flutter 회귀 | flutter test --no-pub | 418개 통과 |
| 정적 분석·fixture | flutter analyze / generate_audio_fixtures --check | 통과 |
| 공개 Now Playing 센터 조회 + native bridge 명령 주입 | ios_system_media_integration_test.dart | 실제 엔진과 정보 일치, 완료·정지 정리 |
| 기존 native audio | audio_playback_integration_test.dart | FLAC/WAV/AAC/ALAC, seek·완료·복원·오류 복구 통과 |
| 실제 OS 앱 전환 | run_ios_background_audio_qa.py | 6초 전환 중 큐 0→3, 복귀 후 합성 곡명과 rate 1.0 일치, 전체 완료 |
| 기존 화면·캡처 동선 | screenshot_scene_contract_integration_test.dart 두 테스트 | 클래식 계획 패널의 이전·다음과 기존 R2 탐색 중 재생 보존 |
| 물리 iPhone Xs 시스템 UI·청감 | 사용자 QA | 미검증 |

환경은 macOS 26.6.2, Xcode 26.5 (17F42), iPhone 17 Pro 유형의 전용 iOS 26.5 Simulator다. 합성 PCM은 테스트 임시 디렉터리에서만 확장하며 저장소의 음원·태그를 수정하지 않는다.

[실제 background 결과](evidence/play-ios-system-media-background-20261030.json)와 [native bridge 로그](evidence/play-ios-system-media-native-20261030.log)는 실행 결과를 복사한 증적이다. 공개 센터 조회와 명시적 채널 이벤트 주입이며, 실제 OS 잠금 화면 버튼을 눌렀다는 증거가 아니다. 사용 가능한 simctl IO/UI 명령에는 버튼 입력 기능이 없어 실제 시스템 UI·headset·물리 청감은 사용자 검수로 남긴다.

첫 integration 검사에서 Runner에 Swift DEBUG 조건이 빠진 점을 수정했다. 기존 native 회귀는 play 요청 직후의 interruption 경합과 엔진 이벤트 전달 지연을 드러냈다. 실제 player.playing 확인과 명령 이후의 엔진 snapshot 반영을 보완하고 native 검사를 재실행해 통과했다. QA inspect/testCommand는 Swift DEBUG에서만 빌드하고 Release 바이너리 제외 여부를 archive 검사에서 확인한다.

화면 계약 검사는 클래식 계획 패널의 이전 callback 누락을 발견했다. 해당 adapter와 진단 busy 상태 전달을 보완하고 두 화면 integration을 재실행해 통과했다. 이는 실제 스토어 이미지 촬영·검수 결과가 아니다.

데이터 초기화가 사용하는 stop은 진단 완료 뒤 직렬 실행되도록 보존한다. 일반 재생/큐 변경 명령처럼 이 shutdown 경계를 버리지 않으며, 진단 정리 후 stop→빈 큐 순서를 테스트했다.

## 재현과 배포

```sh
cd apps/classical_local_library
flutter test
flutter analyze
flutter test integration_test/ios_system_media_integration_test.dart -d <QA simulator>
flutter test integration_test/audio_playback_integration_test.dart -d <QA simulator>
python3 tool/run_ios_background_audio_qa.py --device <QA simulator> --output /tmp/play-media-qa
```

제품 commit·서명·IPA 해시와 Apple 처리 결과는 [내부 TestFlight 기록](classical-local-library-testflight-internal-2026-10-30.md)에 확인 후 추가한다. 기존 빌드 1·2는 보존하며 사용자 iPhone Xs는 [물리 점검표](classical-local-library-physical-device-checklist.md)의 build 3 절차를 사용한다. 로컬 검증과 원격 CI를 구분하며 CI 결과는 수집하지 않았다.

## 공식 자료 확인 — 2026-10-30

- [MPRemoteCommandCenter](https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter)
- [changePlaybackPositionCommand](https://developer.apple.com/documentation/mediaplayer/mpremotecommandcenter/changeplaybackpositioncommand)
- [MPNowPlayingInfoCenter](https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter)
- [audio_service AudioHandler](https://pub.dev/documentation/audio_service/latest/audio_service/AudioHandler-class.html)
- [just_audio_background 단일 player 구현](https://github.com/ryanheise/just_audio/blob/minor/just_audio_background/lib/just_audio_background.dart)

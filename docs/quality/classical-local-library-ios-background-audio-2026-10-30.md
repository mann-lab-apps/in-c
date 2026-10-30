# 띠로리 Play iOS 화면 잠금 재생 — 2026-10-30

## 구현 계약

iOS에서 사용자가 시작한 로컬 재생은 화면 잠금·앱 전환 중 유지한다. lifecycle 이벤트는 위치만 저장하고 재생 명령을 만들지 않는다. 사용자의 pause/stop은 복귀 후에도 유지한다. interruption·헤드폰 분리는 기존 일시정지 정책을 사용하며 자동 재개하지 않는다. Android는 기존 foreground 정책이다. 종료·강제 종료 후 자동 재생과 시스템 잠금 화면 조작·CarPlay는 범위 밖이다.

- 기존 `just_audio` 0.10.6과 `audio_session` 0.2.4를 사용하며 의존성 추가는 없다.
- `AudioSessionConfiguration.music()`은 설치된 패키지에서 `AVAudioSessionCategory.playback`을 사용함을 확인했다.
- iOS `UIBackgroundModes`는 `audio` 하나만 선언한다. 배포 preflight는 Play의 이 모드를 요구하고 추가 모드·권한·ATS 전면 허용은 차단한다.
- 사용자 승인한 암호화 답변을 `ITSAppUsesNonExemptEncryption=false`에 반영했다. 새로운 암호화 기능은 없다.

## 실행 증거

| 항목 | 증거 | 결과 |
| --- | --- | --- |
| iOS playing 상태의 inactive/hidden/paused/detached/복귀 | `test/ios_background_playback_test.dart` | 큐·위치·playing 보존, 위치 checkpoint 저장 |
| idle/ready/사용자 pause/stop 복귀 | 같은 widget 테스트 | 자동 재생 없음 |
| 저장 중 연속 lifecycle·저장 실패 | 같은 widget 테스트 | 중복 저장 억제, 재생 보존, 후속 저장 복구 |
| Android background | `test/home_screen_test.dart` | 기존 pause·위치·이력 저장 정책 유지 |
| 전체 Flutter 회귀 | `flutter test --no-pub --reporter expanded` | 406개 통과 |
| 정적 분석 | `flutter analyze --no-pub` | 오류 없음 |
| fixture 무결성 | `dart run tool/generate_audio_fixtures.dart --check` | 통과 |
| 실제 시뮬레이터 OS 앱 전환 | `tool/run_ios_background_audio_qa.py` | 6초 앱 전환, 실제 lifecycle 수신, native 큐 진행·완료·위치 저장 |
| native 플레이어 + 주입한 interruption/route 이벤트 | 신규 integration 두 번째 테스트 | pause, 자동 재개 없음, stop |
| iPhone Xs 잠금·가청 출력 | 사용자 QA | 미검증 |

시뮬레이터: 전용 `DDIRORI-QA-Play-20261023`, iOS 26.5. 앱에서 합성 WAV 12항목을 재생한 뒤 Settings 앱을 열고 6초 뒤 복귀했다. `inactive → hidden → paused → hidden → inactive → resumed`를 실제 OS에서 받았고, 0번에서 3번 큐 항목으로 진행했다. 완료 인덱스는 기존 앱 계약대로 queue.length(12)이며 failure가 없다. 저장 위치도 확인했다.

첫 실행에서는 완료 인덱스를 마지막 항목 11로 잘못 기대한 테스트가 실패했다. 앱의 기존 완료 계약을 확인해 기대값을 바로잡은 뒤 재실행하여 두 integration 테스트 모두 통과했다. 엔진의 완료 동작은 변경하지 않았다.

자동 생성된 요약: [native result](evidence/play-ios-background-20261030.json). 상세 로그는 실행 output에 남긴다. 실제 화면 잠금·스피커/Bluetooth·청감·배터리 수치는 이 증거에 포함되지 않는다.

## 재현

```sh
cd apps/classical_local_library
python3 tool/run_ios_background_audio_qa.py \
  --device <전용 iOS simulator UDID> --output /tmp/play-background-qa
flutter test integration_test/audio_playback_integration_test.dart -d <simulator UDID>
```

## 기기 검수와 배포

0.1.0(1)은 보존하고 0.1.0(2)를 내부 테스트 전용으로 준비한다. 제품 소스 commit·서명·IPA 해시와 Apple 처리 결과는 실제 확인 후 별도 배포 기록에 남긴다. iPhone Xs에서는 [물리 기기 점검표](classical-local-library-physical-device-checklist.md)의 화면 잠금 QA를 실행한다.

## 공식 근거

2026-10-30 확인: [Apple media playback 구성](https://developer.apple.com/documentation/avfoundation/configuring-your-app-for-media-playback), [AVAudioSession playback](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback), [just_audio](https://pub.dev/packages/just_audio), [audio_session](https://pub.dev/packages/audio_session). 잠금 중 음원 출력 유지에는 playback session과 audio background mode를 사용한다. 시스템 미디어 조작은 이번 구현에 추가하지 않았다.

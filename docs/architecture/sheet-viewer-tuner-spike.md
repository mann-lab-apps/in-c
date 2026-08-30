# Clef 튜너 1차 spike

작성일: 2026-08-22

## 결론

튜너는 `record` 7.1.1 기반 raw PCM stream을 붙여 실제 microphone input pipeline 1차까지
구현했다. V1 전달 전 보강으로 Concert/Bb/Eb/F/Strings/Guitar/Bass 표시, 표시 모드와 별개인
detection profile, Chromatic/Target mode, Guitar standard/Drop D/Bass/Strings/Bb/Eb/F preset,
target 기준 cents 계산, 상용 튜너형 feedback label/meter를 추가했다. 이번 단계의 목표는
상용급 튜너 정확도 보장이 아니라, 연습자가 악보 viewer 안에서 바로 이해할 수 있는 note/cents
피드백을 crash 없이 받는 것이다.

Android 태블릿 실기기에서 pitch 정확도, latency, 소음 환경 안정성은 별도 검증이 필요하다.

## 구현한 범위

- `SheetTunerSettings`
  - A4 기준음 저장.
  - tuning mode는 `Chromatic`과 `Target`을 저장한다.
  - tuning preset은 Chromatic, Guitar standard, Guitar drop D, Bass standard, Violin, Viola,
    Cello, Double Bass, Bb Trumpet, Bb Clarinet, Alto Sax, Tenor Sax, Horn in F, Manual을 저장한다.
  - 표시 모드는 `Concert`, Bb/Eb/F 악기, Strings, Guitar/Bass 계열을 저장한다.
  - 감지 profile은 `Chromatic`, `Bb Trumpet`, high/low instruments, strings, guitar/bass를 저장한다.
  - 표시 모드는 음 이름 표기 방식이고, 감지 profile은 마이크 입력 range/안정화 정책이다.
  - 기본값 440Hz, Chromatic mode/preset, Concert 표시, Chromatic profile, target 없음.
  - 415-466Hz 범위 clamp.
  - 기존 A4/표시/profile/target만 있던 JSON도 기본값으로 decode한다.
- `SheetTunerPitch.detect`
  - frequency를 가장 가까운 chromatic note로 변환.
  - target frequency 대비 cents offset 계산.
  - invalid frequency는 null 처리.
- `SheetTunerPitch.displayPitch`
  - `Concert` 모드에서는 감지된 concert pitch를 그대로 표시한다.
  - Bb/Eb/F transposing instrument와 guitar/double bass octave transposition에서는 written pitch와
    concert pitch를 함께 표시한다.
  - `Bb Trumpet` 모드에서는 감지된 concert pitch보다 장2도 높은 written pitch를 표시한다.
  - 예: concert A#4/Bb4는 written C5, concert C4는 written D4, concert F4는 written G4로
    표시한다.
  - cents offset은 실제 감지 주파수와 가장 가까운 concert pitch 기준 값을 유지한다.
- `SheetTunerPitch.centsFromTarget`
  - Target mode에서 선택한 concert target frequency 대비 cents를 계산한다.
  - Target이 없거나 invalid frequency면 0으로 안전 처리한다.
- `SheetTunerPreset`
  - Guitar standard EADGBE, Guitar drop D DADGBE, Bass standard EADG, Violin/Viola/Cello/
    Double Bass open strings, Bb/Eb/F 악기 기본 target을 제공한다.
  - Preset 선택 시 권장 표시 모드, detection profile, target list를 함께 맞춘다.
- `SheetTunerPitchDetector`
  - PCM16 mono sample을 rolling buffer로 모아 autocorrelation 기반 pitch를 추정.
  - 기본 Chromatic profile은 44.1kHz, 4096 sample window, 70-1200Hz 탐지 범위다.
  - Bb Trumpet profile은 concert E3-C6 중심 range를 사용해 낮은 rumble과 과도한 고역 잡음을
    더 엄격히 제외한다.
  - RMS threshold 아래 입력은 no signal로 처리한다.
  - 가장 큰 상관 peak만 쓰면 octave/subharmonic으로 내려가는 문제가 있어, 충분히 강한 첫
    local peak를 우선 선택한다.
  - 선택된 local peak의 correlation을 parabolic interpolation에 사용해 peak 보정값이 다른
    peak의 correlation에 끌려가지 않게 했다.
- `SheetTunerInputService`
  - `AudioRecorder.hasPermission`으로 runtime microphone permission을 확인/요청한다.
  - `AudioRecorder.startStream`과 `RecordConfig(encoder: pcm16bits, numChannels: 1,
    sampleRate: 44100, streamBufferSize: 4096)`로 raw PCM stream을 받는다.
  - bottom sheet에서 start/stop하고, sheet dispose 시 subscription, recorder, detector를
    정리한다.
  - `SheetTunerReadingStabilizer`로 최근 5개 reading의 median frequency를 사용하고, 낮은
    confidence reading은 무시한다.
  - Bb Trumpet profile에서는 signal threshold와 no-signal debounce를 조금 더 엄격하게 적용한다.
  - note boundary 근처에서는 이전 안정 note를 잠깐 유지하는 hysteresis를 적용해 label
    깜빡임을 줄인다.
  - 직전 안정 reading에서 크게 벗어나는 짧은 octave jump는 같은 pitch class 안에서 한 octave
    접어 안정화한다.
  - no signal은 4 frame debounce 후 표시해 순간적인 입력 끊김이 note label 깜빡임으로 바로
    이어지지 않게 한다.
  - permission denied, unsupported/error, no signal 상태를 UI가 분리해서 표시할 수 있게 한다.
- `SheetTunerFeedback` / `SheetTunerFeedbackStabilizer`
  - input status, confidence, cents를 `소리가 너무 작습니다`, `음을 잡는 중`, `조금 낮아요`,
    `조금 높아요`, `맞았습니다` 상태로 변환한다.
  - In-tune dead zone에서는 표시 cents를 0으로 고정한다.
  - 표시용 needle damping과 짧은 in-tune hold로 label/needle이 과하게 흔들리지 않게 한다.
- Viewer 튜너 UI
  - AppBar 또는 overflow menu에서 진입.
  - 공연 모드에서도 진입 가능.
  - 현재 음 이름, Chromatic/Target mode, tuning preset, 표시 모드, 감지 profile, concert pitch
    보조 표시, target 기준 cents meter, target shortcut, target을 기준음/드론 root로 맞추는 action,
    A4 기준음 slider, start/stop, signal/confidence 표시.
  - listening이 아닐 때는 테스트 주파수 slider로 visual tuner 계산을 확인할 수 있다.
- Persistence
  - A4 기준음, tuning mode, tuning preset, 표시 모드, 감지 profile, target MIDI는 앱 전역
    SharedPreferences 설정으로 저장.
- Platform permission declaration
  - Android: `RECORD_AUDIO`.
  - iOS: `NSMicrophoneUsageDescription`.

## 패키지 선택

실제 마이크 입력은 `record` 7.1.1을 사용한다.

- Flutter 공식 cookbook은 오디오 녹음/stream 예제로 `record` package를 안내한다.
- `record` 7.1.1은 Android/iOS를 포함해 여러 플랫폼을 지원하고, `pcm16bits` stream과
  permission check를 제공한다.
- `record`는 앱에 필요한 raw PCM stream 확보, runtime permission, amplitude 확인에 맞다.
- 현재 앱의 Flutter 3.47.0 / Dart 3.13.0 환경에서 `flutter pub get`과 test/analyze 기준
  호환을 확인했다.

보조 후보는 `flutter_audio_capture`다.

- Android/iOS microphone buffer stream을 제공한다.
- API는 단순하지만 pub.dev 지표와 유지보수 신뢰도는 `record`보다 낮아 보인다.
- Linux까지 필요하지 않은 Android-first 악보앱에서는 `record` 우선 검토가 적절하다.

출처:
- https://docs.flutter.dev/cookbook/audio/record
- https://pub.dev/packages/record
- https://pub.dev/packages/flutter_audio_capture

## 후속 구현 방향

1. Android 태블릿에서 runtime permission prompt, microphone stream start/stop, sheet close
   cleanup을 실기기로 확인한다.
2. 44.1kHz 입력을 우선 사용하고, Android 태블릿에서 실제 지원 sample rate와 buffer cadence를
   확인한다.
3. Guitar/Bass/Strings/Bb/Eb/F preset별 target list와 display transpose가 실제 연주자 기대와
   맞는지 확인한다.
4. cents jitter가 여전히 크면 profile별 smoothing window, adaptive noise floor, attack frame
   ignore 또는 YIN/MPM 기반 detector를 비교한다.
5. Android 태블릿과 iPhone Simulator/실기기에서 latency, jitter, permission flow를 확인한다.

## 제외

- 고급 temperament.
- background listening.
- 사용자 custom tuning 저장.
- metronome audio와 동시 audio session 고도화.
- 외부 오디오 인터페이스 최적화.

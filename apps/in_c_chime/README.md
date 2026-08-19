# in C - Chime

Flutter-based iOS/Android reference tone and drone MVP for the in C utility app
portfolio.

This app is intentionally small: it provides a quick chime and sustained drone
for tuning by ear and intonation practice. It is not a microphone tuner.

## Local Setup

Run:

```sh
cd apps/in_c_chime
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --debug --no-codesign
```

The intended application id is `com.mannlab.inc.chime`.

## MVP Scope

- Pitch selection across 12 chromatic notes
- Octave selection: 2, 3, 4, 5
- A reference selection: 440, 441, 442 Hz
- Short Chime playback
- Sustained Drone playback
- Pure, Warm, Bright synthesized tone colors
- Volume control
- Local preferences only
- Top in C Chime feature suggestion link

No login, ads, payments, microphone, tuner pitch detection, recording, file
upload, server storage, AI, or protected third-party audio samples in the first
MVP.

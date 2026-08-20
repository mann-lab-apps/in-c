# in C - Click

Flutter-based iOS/Android metronome MVP for the in C utility app portfolio.

This directory is intentionally store-app first. The existing web metronome under
`site/metronome.html` is a prototype/reference surface; this app is the mobile
release target.

## Local Setup

Flutter is installed locally for this workspace. Run:

```sh
cd apps/in_c_click
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --debug --no-codesign
```

The intended application id is `com.mannlab.inc.click`.

## MVP Scope

- BPM display, stepper, slider
- Start/stop
- Tap-based BPM estimate behind a secondary control
- Classical tempo marking display and quick presets
- 2/4, 3/4, 4/4, 6/8 behind a secondary control
- First beat emphasis
- Visual pulse and current beat
- Local preferences only
- Top in C service suggestion link

No login, ads, payments, microphone, tuner, file upload, server storage, or
background playback in the first MVP.

# Clef & Staff

`Clef & Staff` is an Android-first sheet music viewer and practice tool prototype.

The current V1 beta focuses on the MobileSheets-style foundation plus rehearsal
helpers:

- import PDF files and JPG/PNG images
- store a local library with search, sort, filters, collection/group/rating metadata, and favorites
- view PDF scores with one-page, two-page, vertical scroll, and half-page modes
- keep bookmarks, setlists, hidden pages, display effects, and last page state
- draw pen/highlighter strokes and text annotations as app metadata
- share PDFs, annotated PDF copies, and full local backups
- block URL link taps and create URL-link-disabled PDF copies
- use visual metronome, reference tone/drone, local audio playback, auto scroll,
  hardware-key page turns, and microphone tuner
- switch tuner preset/profile across chromatic, target, guitar/bass, ukulele,
  mandolin, strings, and transposing-instrument flows

## Current Scope

Included:

- Android-first Flutter app with iOS TestFlight smoke-test support
- Android adaptive, themed, and legacy launcher icons for RC internal testing
- local PDF/image copies in the app documents directory
- `SharedPreferences` metadata persistence, automatic metadata snapshots, and ZIP full backup
- `pdfrx` PDF rendering
- tester info sheet with feedback template copy
- Korean-first app copy with feedback fields for awkward wording
- tuner quick A4 actions, target lock, calibration history, and adaptive
  noise-floor guard for practice-session tuning

Known limitations:

- tuner accuracy/latency still needs real-device QA
- Korean/non-ASCII text annotation PDF export can fall back to sharing the original PDF
- annotated PDF sharing stamps content into a copy; it does not embed editable PDF annotations
- crop/rotation/page hide are app metadata/display features unless the user explicitly creates an app-internal applied copy
- linked file management, S Pen pressure metadata, palm rejection guard, and pedal mapping UI have first-pass support
- folder direct references, HEIC/HEIF native conversion, OCR, iOS Share Extension, cloud sync, and account storage are not included
- real CamScanner/object-stream PDFs, S Pen tuning, pedal hardware, cloud providers, and audio latency need device/sample QA

## Commands

```sh
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter build apk --debug
flutter build appbundle
flutter build apk
flutter build ios --release --no-codesign
```

RC release checklist:

```sh
dart run tool/rc_release_check.dart
```

The checklist runs fixture inspection, non-mutating formatter check, analyze,
tests, whitespace scans, stale wording scans, and debug print scans.

Build outputs:

- debug APK: `build/app/outputs/flutter-apk/app-debug.apk`
- release APK: `build/app/outputs/flutter-apk/app-release.apk`
- release AAB: `build/app/outputs/bundle/release/app-release.aab`
- iOS no-codesign app: `build/ios/iphoneos/Runner.app`

Android release signing:

- `android/app/build.gradle.kts` reads `android/key.properties` when present and signs release APK/AAB
  with the configured upload keystore.
- `android/key.properties` and `android/app/upload-keystore.jks` are ignored secrets. Keep secure backups
  outside git.
- Use `android/key.properties.example` as the template if the local signing files need to be recreated.

Tester checklist:

- [`../../docs/qa/clef-tester-checklist.md`](../../docs/qa/clef-tester-checklist.md)
- [`../../docs/qa/clef-v1-device-qa-runbook.md`](../../docs/qa/clef-v1-device-qa-runbook.md)
- [`../../docs/qa/clef-beta-feedback-message.md`](../../docs/qa/clef-beta-feedback-message.md)

## PDF Fixtures

Local, copyright-safe PDF fixtures live under `test-fixtures/pdfs/`.

```sh
dart run tool/generate_pdf_fixtures.dart
dart run tool/inspect_pdf_fixtures.dart
```

The fixture set includes:

- `short-score.pdf`: 3-page score-like PDF
- `long-scan-like-score.pdf`: 90-page scan-like stress fixture
- `link-annotation-score.pdf`: 3-page PDF with a bottom-right URL link annotation

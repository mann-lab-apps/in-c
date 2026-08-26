# Clef

`Clef` is an Android-first sheet music viewer and practice tool prototype.

The current V1 beta focuses on the MobileSheets-style foundation plus rehearsal
helpers:

- import PDF files and JPG/PNG images
- store a local library with search, sort, filters, collection/group/rating metadata, and favorites
- view PDF scores with one-page, two-page, vertical scroll, and half-page modes
- keep bookmarks, setlists, hidden pages, display effects, and last page state
- draw pen/highlighter strokes and text annotations as app metadata
- share PDFs, annotated PDF copies, and full local backups
- block URL link taps and create URL-link-disabled PDF copies
- use visual metronome, auto scroll, hardware-key page turns, and microphone tuner
- switch tuner display/profile between Concert and Bb Trumpet flows

## Current Scope

Included:

- Android-first Flutter app with iOS TestFlight smoke-test support
- local PDF/image copies in the app documents directory
- `SharedPreferences` metadata persistence and ZIP full backup
- `pdfrx` PDF rendering
- tester info sheet with feedback template copy

Known limitations:

- tuner accuracy/latency still needs real-device QA
- Korean/non-ASCII text annotation PDF export can fall back to sharing the original PDF
- annotated PDF sharing stamps content into a copy; it does not embed editable PDF annotations
- crop/rotation/page hide are app metadata/display features, not source PDF rewrites
- linked file management UI, folder references, S Pen pressure, palm rejection, pedal mapping UI, cloud sync, and account storage are not included

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

Build outputs:

- debug APK: `build/app/outputs/flutter-apk/app-debug.apk`
- release APK: `build/app/outputs/flutter-apk/app-release.apk`
- release AAB: `build/app/outputs/bundle/release/app-release.aab`
- iOS no-codesign app: `build/ios/iphoneos/Runner.app`

Tester checklist:

- [`../../docs/qa/clef-tester-checklist.md`](../../docs/qa/clef-tester-checklist.md)
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

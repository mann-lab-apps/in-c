# in C - Sheet

`in C - Sheet` is an Android-first sheet music viewer prototype.

The first MVP focuses on the MobileSheets-style foundation:

- import a PDF score
- store a local library record
- search by title, composer, tags, or note
- mark favorites
- open the PDF in a viewer
- move to previous/next page
- persist the last opened page

## Current Scope

Included:

- Android Flutter app scaffold
- local PDF copy in the app documents directory
- `SharedPreferences` library metadata persistence
- `pdfrx` PDF rendering
- basic tablet-friendly list/grid layout

Excluded from this first pass:

- setlists
- annotations
- tuner/metronome
- PDF link annotation cleanup
- Bluetooth pedals
- cloud sync
- account/server storage

## Commands

```sh
flutter analyze
flutter test
flutter build apk --debug
```

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

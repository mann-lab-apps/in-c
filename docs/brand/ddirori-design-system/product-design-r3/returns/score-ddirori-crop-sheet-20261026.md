# Score Ddirori crop-sheet adoption — 2026-10-26

## Scope

The PDF margin/crop settings sheet now uses Ddirori spacing, section-title and
description typography, and secondary/primary action buttons. The four sliders
remain the existing interaction because they are a precise, direct crop-value
editor; no crop model or PDF operation was moved into the design package.

## Behaviour preserved

- Reset replaces only the local draft with `SheetCropSettings.none`.
- Save returns the normalized draft to the existing caller.
- Controller persistence, page/instance crop scopes, crop copy generation,
  and original-PDF preservation remain unchanged.

## Evidence

`flutter test test/score_r2_viewer_test.dart test/sheet_library_controller_test.dart`
passed 47 tests; `flutter analyze` passed. This covers real PDF viewer crop
state and controller crop-copy/original-preservation contracts, but does not
certify physical iOS touch, large-text, or VoiceOver behaviour.

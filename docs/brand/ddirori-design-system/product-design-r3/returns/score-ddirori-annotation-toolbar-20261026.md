# Score Ddirori annotation-toolbar adoption — 2026-10-26

## Scope

- Product: `apps/in_c_sheet`
- Product baseline: `8e0d4137`
- Surface: the existing PDF viewer's `주석 옵션` sheet.
- Design contracts: `DdiroriToolbar`, existing score-specific annotation
  adapter, and `specifications/services/score.md`.

## Actual implementation

The app-specific `_AnnotationToolbar` now composes `DdiroriToolbar` instead
of its own raw `Wrap`. The existing controls remain in the app adapter:

- pen, highlighter, eraser, text, shapes, and stamp selection;
- colour and width presets plus slider;
- default-layer visibility/export; undo/redo; saved favourite preset.

This deliberately does **not** replace the adapter with the smaller generic
`DdiroriAnnotationTools` API, because that would hide real score functions.
PDF coordinates, annotation persistence, history, and viewer state are not
changed.

## Verification boundary

- `flutter test test/score_r2_viewer_test.dart test/adoption_pilot_test.dart`
  — 34 passed.
- `flutter analyze` — passed.
- The R2 PDF widget flow asserts that the options sheet contains
  `DdiroriToolbar` and still opens the existing annotation tools.

This is not evidence for iOS VoiceOver order, stylus feel, finger hit targets,
or physical-PDF performance. Those checks remain pending in the iOS metadata.

## Shared impact and next review

No shared API changed; the app uses the current toolbar contract. The viewer's
dark page/performance overlay remains app-specific: it preserves page-reading
contrast and mode-dependent controls rather than pretending it is a general
light-surface toolbar. Review the next product surface only where the existing
common API preserves every real control and state.

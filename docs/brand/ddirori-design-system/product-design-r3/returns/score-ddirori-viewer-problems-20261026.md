# Score Ddirori viewer problem-panel adoption — 2026-10-26

## Scope and behaviour

Missing-file and PDF-open failure views now compose `DdiroriStatePanel`.
Their existing title and recovery message remain visible. File path, size, and
runtime error detail remain available as selectable diagnostic information,
rather than being the default reading surface.

No file recovery, import, backup, PDF engine, or state-transition logic moved
to the design package.

## Evidence

`flutter test test/score_r1_adoption_test.dart test/score_r2_viewer_test.dart`
passed 36 viewer/widget regressions and asserts the unavailable-PDF panel is a
`DdiroriStatePanel`. `flutter analyze` passed.

Physical iOS Files/iCloud provider error handling, VoiceOver expansion order,
and large-text diagnostics remain manual QA, not asserted by this result.

# Score Ddirori page-overlay token adoption — 2026-10-26

## Scope and change

The PDF page metadata badge and quick-jump overlay now use the same
`DdiroriStyle` overlay/on-overlay colours and control-radius token as the rest
of Score viewer chrome. The active page, jump-point target, rehearsal mark,
bookmark, and overflow-menu selection logic did not change.

## Evidence

`flutter test test/score_r2_viewer_test.dart` passed 8 real-PDF widget flows,
including narrow landscape and 200% text. `flutter analyze` passed.

The test is not physical-device evidence for touch hit targets, VoiceOver,
keyboard/pedal input, or the visual legibility of every long jump label. These
remain manual QA work in the iOS metadata.

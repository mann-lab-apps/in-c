# Score Ddirori performance-overlay token adoption — 2026-10-26

## Scope

The Score viewer's performance quick actions and auto-scroll countdown remain
app-owned because their available commands depend on performance policy,
setlist context, and timer lifetime. This slice changes only their visual token
sources.

## Actual change

- Replaced hard-coded black/white overlay colours with `DdiroriStyle`'s
  `overlay` and `onOverlay` tokens.
- Replaced the hard-coded active yellow with the score annotation-yellow token.
- Replaced local overlay radii with the shared control-radius token.

No bookmark, auto-scroll, metronome, tuner, setlist, page, or countdown state
transition changed.

## Evidence and boundary

`flutter test test/score_r2_viewer_test.dart` passed 8 real-PDF widget flows,
including light/dark, narrow landscape, 200% text, performance entry, long
scan, annotation, and input-focus paths. `flutter analyze` passed.

The test does not prove physical-device performance operation, output audio,
pedal input, VoiceOver, or long-session timer behaviour. Those remain manual
QA items in the iOS metadata.

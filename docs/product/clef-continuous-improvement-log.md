# Clef & Staff Continuous Improvement Log

## Execution Baseline

- Started: 2026-09-13, `dev` at `72b9314`, three local commits ahead of fetched `origin/dev`.
- Restored worktree: `/private/tmp/clef-next-polish` (previous directory was removed).
- Source: Clef & Staff, `lib/main.dart`, discovery home defaults to false,
  Android applicationId `com.mannlab.inc`, version `1.0.0+20`.
- The historical emulator analysis records `com.mannlab.clef`; do not assume that
  installation is this source revision. No connected emulator at baseline.
- No app builds, push, or merge authorized for this execution.
- Reference: `clef-mobilesheets-hands-on-analysis.md`, library/import/export rows;
  tester checklist, songbook and full-backup scenarios.

## Work Queue

| ID | User problem / evidence | Acceptance and failure criteria | Verification | State / dependency |
| --- | --- | --- | --- | --- |
| B1 | Songbook entries share a PDF, but full backup stores and restores a copy per entry. | One archive PDF per identical source path; restore shared references, page ranges and setlist IDs. Distinct same-name files stay distinct; legacy backups still restore. | New regression first failed (4 archive PDFs instead of 2), then passed. Store suite 20/20, full suite 448/448, analyze and RC check PASS. | VERIFIED LOCAL |
| B2 | Full restore skips absent archive entries and may replace the library with inaccessible references. | Reject incomplete archives before writing files/replacing metadata; retain explicitly missing-file compatibility. | Missing linked-file fixture reproduced false success. Seven corrupt fixtures preserve existing metadata/PDF bytes; store suite 28/28, full suite 456/456, analyze/RC PASS. | VERIFIED LOCAL |
| B3 | Backup codec tolerantly drops malformed records, potentially clearing a library on restore. | Reject missing/non-list collections, malformed records and duplicate IDs. Preserve explicit empty backups and optional legacy setting defaults. | Failure reproduced with a non-list scores value; eight rejection cases and one legacy fixture. Store suite 37/37, full Flutter suite, analyze/RC PASS. | VERIFIED LOCAL |
| B4 | Missing-file success copy does not explain absent bytes. | Expose unique missing source-file counts and a persistent confirmation dialog for partial full restore. | Shared missing PDF/linked/annotation store fixture; widget menu/confirm/warning/dismiss flow. Full suite 466/466, analyze/RC PASS (`/private/tmp/clef-rc-b4.log`). | VERIFIED LOCAL |
| S1 | Split songbook entries inherit full-book scrolling and cross-song jumps; hidden first page is selected on entry. | Hide out-of-range pages, start at first visible page, restrict jumps/marks/auto-scroll. Keep one page if the whole range was hidden; preserve source and repeated-split deduplication after compaction. | Regression reproduced hidden first-page selection; controller suite 52/52, full suite 468/468, analyze/RC PASS (`/private/tmp/clef-rc-s1.log`). Physical PDF gestures need device QA. | VERIFIED LOCAL |
| S2 | New songbook entries currently start with an empty annotation layer. | Copy current in-range strokes/texts and visibility/export flags, retain hidden-page marks, reset edit history and use independent inline storage. Source/sibling edits stay isolated. | Regression reproduced empty split annotations; copy/delete/reload isolation test PASS. Full suite 469/469, analyze/RC PASS (`/private/tmp/clef-rc-s2.log`). | VERIFIED LOCAL |
| Q1 | Friend feedback touch, audio, pedal and mini-panel behavior needs real-use evidence. | Record physical touch/audio/pedal results separately from synthetic or historical emulator evidence. | Android tablet, microphone, pedal and PDF samples. | DEVICE QA |

## Verification Policy

- Per slice: meaningful regression tests, `dart format lib test tool`,
  `flutter analyze`, `flutter test`, `dart run tool/rc_release_check.dart`.
- Review formatter diff; check whitespace, tabs and stale documentation wording.
- Each checkpoint records commit, evidence, unresolved gaps and next command.
- A completed slice advances to the next queue item; it does not complete the goal.

## Checkpoint

B1: `457a257`, store suite 20/20 and full suite 448/448, analyze/RC PASS.
B2: `f603e1c`, store suite 28/28 and full suite 456/456, analyze/RC PASS.
B3: `8714f23`, store suite 37/37 and full Flutter suite, analyze/RC PASS.
B4: `b40c7c9`, full suite 466/466, analyze/RC PASS.
S1: `f1707d5`, controller suite 52/52, full suite 468/468, analyze/RC PASS.
S2: current in-memory annotations copied per physical page range; external file-backed
hydration/migration remains outside this slice. Commit subject:
`fix: preserve Clef songbook annotations in split scores`.
Next: inspect existing emulator installations and remaining selection/setlist UX gaps.
AVD launch via Flutter returned without a connected device; direct emulator launch is
being inspected. Do not count either attempt as successful app verification.
Known limit: preflight validation is not a transaction for disk/preferences write failures.
No emulator evidence or app build claimed.

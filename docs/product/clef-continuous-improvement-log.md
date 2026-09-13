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
| B5 | Repeating a full restore overwrites PDF/annotation paths used by another library, even when the subsequent metadata write fails. | Fresh storage paths for restored bytes, stable score IDs/setlist links, display filenames and shared-PDF cache. Earlier library files and metadata remain unchanged. | Successful and injected first-metadata-write-failure regressions reproduced byte replacement before fix. Store 39/39, full suite 479/479, analyze/RC PASS (`/private/tmp/clef-rc-b5.log`). | VERIFIED LOCAL |
| B6 | Restore ignores false persistence results and can leave partially replaced metadata after an exception. | Capture only affected keys, check writes/removals, rollback attempted keys on failure, preserve previous automatic backup and other library metadata. Report rollback failure, never success. | JSON/ZIP, returned false/thrown error at early/late/remove keys, cache reload, retry and rollback failure. Store 56/56, full suite 496/496, analyze/RC PASS (`/private/tmp/clef-rc-b6.log`). | VERIFIED LOCAL |
| B7 | Backup import has no exclusive progress state in the UI. | Modal progress blocks editing, repeated entry and back dismiss until completion; always release on success/cancel/error/unmount. Shared PDF events wait; backup menu disables during PDF import. | Delayed JSON/automatic/ZIP fixtures, late error after unmount, native share ordering and active-import menu. Full suite 508/508, analyze/RC PASS (`/private/tmp/clef-rc-b7.log`). | VERIFIED LOCAL |
| S1 | Split songbook entries inherit full-book scrolling and cross-song jumps; hidden first page is selected on entry. | Hide out-of-range pages, start at first visible page, restrict jumps/marks/auto-scroll. Keep one page if the whole range was hidden; preserve source and repeated-split deduplication after compaction. | Regression reproduced hidden first-page selection; controller suite 52/52, full suite 468/468, analyze/RC PASS (`/private/tmp/clef-rc-s1.log`). Physical PDF gestures need device QA. | VERIFIED LOCAL |
| S2 | New songbook entries currently start with an empty annotation layer. | Copy current in-range strokes/texts and visibility/export flags, retain hidden-page marks, reset edit history and use independent inline storage. Source/sibling edits stay isolated. | Regression reproduced empty split annotations; copy/delete/reload isolation test PASS. Full suite 469/469, analyze/RC PASS (`/private/tmp/clef-rc-s2.log`). | VERIFIED LOCAL |
| U1 | Fixed home sections can leave almost no space for scores. Older emulator install shows a roughly 10px grid; current source overflows by 338px at 360x720. | One vertical scroll for header and lazy score list/grid; reach and select the last of 30 scores on phone/tablet/landscape. Empty/search states remain accessible. | Widget regression at 360x720, 1280x800 and 800x360, empty states and search reset. Full suite 475/475, analyze/RC PASS (`/private/tmp/clef-rc-u1.log`). | VERIFIED LOCAL |
| U2 | Six inline selection actions obscure the count at 320/360dp; MobileSheets uses contextual overflow actions. | Retain direct setlist add and select-all; secondary actions remain reachable and disabled when no selection. Preserve tablet shortcuts and deletion confirmation. | Count truncation reproduced before fix; width-specific widget count/menu/action/resize regression. Full suite 477/477, analyze/RC PASS (`/private/tmp/clef-rc-u2.log`). | VERIFIED LOCAL |
| U3 | Batch-imported scores can share a composer, but bulk editing omits this core metadata field. MobileSheets supports composer/artist assignment. | Add composer to existing bulk form/API, trim input, preserve unselected scores and omitted UI input. Search/facets/reload reflect the new value; no codec/schema change. | Missing field reproduced in widget test; apply/blank-preserve and selected/unselected/query/facet/reload regressions. Full suite 508/508, analyze/RC PASS (`/private/tmp/clef-rc-u3.log`). | VERIFIED LOCAL |
| R1 | Installed Clef package differs from this source's Android package. | Establish the intended release identity before building; do not revert another app's package change without product confirmation. | Source `com.mannlab.inc`; installed Clef `com.mannlab.clef`. Historical commit `5c416a6` changed the package for in C. | BLOCKED: release identity decision; does not block local UX work |
| Q1 | Friend feedback touch, audio, pedal and mini-panel behavior needs real-use evidence. | Record physical touch/audio/pedal results separately from synthetic or historical emulator evidence. | Android tablet, microphone, pedal and PDF samples. | DEVICE QA |

## Verification Policy

S19: VERIFIED LOCAL. Actual viewer toolbar widget tests first exposed unsafe pageNumber
access before the PDF controller is ready. Use the existing last-page fallback until
ready. After isolating that exception, retaining the previous false-on-error contract
reproduced a queued 'nothing to undo' message after the error snackbar expired. Return
null for failure and prevent undo/redo/text actions from queuing empty/success feedback.
Remove unconditional data-preservation promises from annotation storage errors.
Acceptance: undo/redo success, empty, failure including delayed follow-up, and closing
the viewer before completion. Missing-file viewer fixture exercises real toolbar/state;
it does not establish PDF rendering, touch drawing, or device I/O quality. Text action
branches are source-checked rather than native PDF gesture tested. All eight toolbar
widget cases pass; full suite 628/628, analyze/RC PASS (`/private/tmp/clef-rc-s19.log`).
Commit subject: `fix: preserve Clef annotation failure feedback`.

S18 commit: `be60864`.
S18: VERIFIED LOCAL. Controller regressions reproduced failed annotation edits remaining
in memory, including two failed consecutive saves. On single-score replacement failure,
read persisted scores only while that request still owns the current list/profile;
recheck after the read, notify after recovery, and propagate the original error. Do not
restore an earlier optimistic snapshot which may itself have failed. Acceptance:
success/failure pairs, late old failure, deletion, delayed recovery plus newer edit or
profile switch, unreadable recovery, notification, retry, and actual preferences false
responses. Full suite 620/620, analyze/RC PASS (`/private/tmp/clef-rc-s18.log`).
Bulk/import/setlist controller memory recovery is not included. No new build/device
verification. Annotation error copy still needs separate
review because failed storage compensation cannot guarantee data preservation.

S17 commit: `7afef9e`.
S17: VERIFIED LOCAL. Eight injected score-write failures reproduced false success or a
partially updated score/automatic-backup pair. Reuse the existing checked restore
writes and best-effort rollback for ordinary metadata saves. Because all writers share
the automatic backup, serialize score/setlist/tool/view/preset/restore metadata writes
across store instances; recover the queue after errors. No storage format changes.
Acceptance: primary or backup false/throw, absent keys, preset deletion, cache/disk
reload, other-profile preservation, failed rollback reporting, retry, and a delayed
failed score save followed by a setlist save. Store suite 98/98; full suite 608/608,
analyze/RC PASS (`/private/tmp/clef-rc-s17-final.log`). Initial full run was interrupted
after a shared completed-Future retained a previous widget test zone; clear the idle
queue before returning completion. Both card widgets and full suite now pass. Initial
style diagnostic was also fixed. Controller optimistic-memory rollback is next. Process
termination, persistent I/O failure, cross-isolate writers, and concurrent profile
deletion are not covered by this in-process compensation contract.

S16 commit: `190fe2b`.
S16: VERIFIED LOCAL. Favorite/pin callbacks retain the score rendered by a card. Repeated
calls before rebuild stayed enabled instead of toggling off and could replace newer
score content. Resolve the current score before toggling; ignore removed scores.
Acceptance: two stale commands restore the flag, all unrelated codec fields survive,
deleted score stays absent, real card double taps before pump and reload work.
Controller and actual card widget regressions pass, including reload. Full suite
566/566, analyze/RC PASS (`/private/tmp/clef-rc-s16.log`). No new app build or device QA.

S15 commit: `450f1e9`.
S15: VERIFIED LOCAL. Bookmark list actions retain a score captured before modal waits.
All toggle/rename/delete regressions reproduced loss of another newly added bookmark.
Apply only the requested page operation to current score state; reject missing scores
and missing rename/delete targets. Return explicit success and use it in viewer copy,
with mounted checks after waits. Acceptance: preserve other bookmarks and all unrelated
codec fields, toggle current membership, invalid page no-op, absent targets and reload.
Controller evidence only for new bookmark scenarios; native viewer messages need QA.
Full suite 562/562, analyze/RC PASS (`/private/tmp/clef-rc-s15.log`). Commit subject:
`fix: apply Clef bookmark actions to current state`.

S14 commit: `97688b2`.
S14: VERIFIED LOCAL. Home metadata editing holds a score snapshot while its dialog is
open. Widget save first reproduced disposed TextEditingController use during route
exit. Keep controllers until DialogRoute.completed, preserve captured target identity,
apply submitted metadata to the current score and report a missing target instead of
success. Preserve omitted optional fields; explicit empty values still clear fields.
Acceptance: live page/favorite preservation, save/cancel exit, deleted target notice,
codec preservation of all non-edited fields, optional fields and reload. Not a merge
of simultaneous edits to the same submitted metadata field. Full suite 558/558,
analyze/RC PASS (`/private/tmp/clef-rc-s14.log`). Commit subject:
`fix: preserve Clef metadata dialog state and target`.

S13 commit: `81e90e5`.
S13: VERIFIED LOCAL. PDF onPageChanged captures a build-time score, and setlist opening
also awaits another write before marking a captured score opened. These bookkeeping
operations must not replace newer score content. Regression reproduced lost title,
favorite and annotation, plus a missing return-to-page-1 update after visiting page 4.
Resolve current score for markOpened/updateLastPage, preserve all unrelated codec
fields, compare the current page for no-op and ignore removed targets. Controller
tests cover reload, old-page return, invalid/current page and removed score.
Full suite 554/554, analyze/RC PASS (`/private/tmp/clef-rc-s13.log`). Native PDF event
ordering remains device QA. Commit subject: `fix: preserve Clef content during page bookkeeping`.

S12 commit: `e6924b4`.
S12: VERIFIED LOCAL. Resume at `0002857` after restoring the removed temporary worktree;
fetched dev remains 27 commits ahead of origin/dev, with no remote-only commits.
Closing a running metronome during delayed settings save reproduced a leaked periodic
timer in a widget regression. Apply playback timing immediately before persistence;
late responses never restart playback. Catch persistence failures and show a notice
only for the current request while mounted. Keep optimistic live settings on failure.
Acceptance: BPM/meter/subdivision/count-in after close or stop, immediate timing,
out-of-order success, current/old/closed failure and retry. Fourteen widget tests pass.
Full suite 551/551, analyze and RC PASS (`/private/tmp/clef-rc-s12-final.log`).
Initial test-only braces lint was fixed before the successful rerun. No native audio
timing or new installed-app evidence. Commit subject:
`fix: decouple Clef metronome playback from pending saves`.

S11 commit: `0002857`.
S11: VERIFIED LOCAL. Rapid metronome changes can persist an older BPM after a newer one.
All three global/score/setlist regressions reproduced 96 instead of 120 after reload.
Serialize metronome persistence in request order; share the queue across global and
scoped saves without merging distinct overrides. A failed request rejects to its caller
while later requests continue. Acceptance includes older/newer write failures and
successful retry. UI remains optimistic; storage-wide transactions are not introduced.
Initial full suite 537/537 passed, but analyze reported a missing brace in a new test.
That lint is fixed; final full suite 537/537, analyze and RC PASS
(`/private/tmp/clef-rc-s11-final.log`). Commit subject:
`fix: serialize Clef metronome settings persistence`.
User requested wrapping up only the active slice. Do not start the dismissal-callback
follow-up automatically.

S10: `bdddd58`, VERIFIED LOCAL. Async metronome persistence overwrites page/annotation edits made
while awaiting the global settings write. Regression reproduced page 4 reverting to 1.
Resolve current score and explicit setlist scope after that await. Acceptance: preserve
new page/strokes through reload; deleted score, deleted setlist and removed member
must not receive settings or be recreated. The global default still updates intentionally.
Four delayed-store regressions pass; full suite 531/531, analyze/RC PASS
(`/private/tmp/clef-rc-s10.log`). This does not yet establish ordering of multiple
concurrent metronome saves. Commit subject: `fix: preserve Clef state during metronome saves`.

S9: `37e9e8c`, VERIFIED LOCAL. Bulk add accepts stale scores no longer in the library and reports
them as newly added. Validate membership for single/bulk add, distinguish missing
from duplicate counts, and communicate partial/all-missing outcomes in every add flow.
Regression reproduced two additions instead of one; mixed/all-missing controller and
pending-picker widget cases pass. Physical file existence is not used as membership.
Full suite 527/527, analyze/RC PASS (`/private/tmp/clef-rc-s9.log`).
Commit subject: `fix: skip missing Clef scores during setlist add`.

S8: `2fdcde6`, VERIFIED LOCAL. A pending setlist undo can reinsert a score removed from the library.
Widget regression reproduced the dangling score ID. Require both targets to exist;
already-restored entries are a successful no-op. Notify when undo cannot restore.
Normal undo, removed score and removed setlist widget cases are covered; no new data fields.
Full suite 524/524, analyze/RC PASS (`/private/tmp/clef-rc-s8.log`).
Commit subject: `fix: validate Clef setlist undo targets`.

U6: `fa1a647`, VERIFIED LOCAL. Repeated setlist copies have indistinguishable names. Keep the
existing first-copy label and choose a free numbered suffix on a collision, using
the existing case-insensitive title lookup. Regression reproduced a duplicate
Concert copy instead of Concert copy (3). Acceptance: preserve originals/IDs,
handle pre-existing numbered/case variants and reload, exercise repeated UI copy.
Full suite 522/522, analyze/RC PASS (`/private/tmp/clef-rc-u6.log`).
Commit subject: `fix: distinguish repeated Clef setlist copies`.

S7: `0f3bfb9`, VERIFIED LOCAL. Partial rehearsal/preset updates used an old setlist snapshot,
replacing newer membership, title and unrelated performance data. Regression
reproduced title reverting from Evening to Concert. Apply provided fields to current
state, filter supplied per-score maps to current membership, preserve omitted fields,
allow explicit clear, and return false for missing targets (including preset apply).
This is not a field-level merge of simultaneous edits to the same provided setting.
Full suite 521/521, analyze/RC PASS (`/private/tmp/clef-rc-s7.log`).
Commit subject: `fix: preserve Clef setlist state during settings updates`.

U5: `3a149f0`, VERIFIED LOCAL. Six setlist toolbar actions truncate even a short title at
320/360dp. Keep open-first/rehearsal direct; move copy/duplicate/rename/delete into
a contextual menu below 720dp, retaining wide shortcuts. Acceptance: readable title,
reachable commands, empty-list disabled playback, deletion confirmation and resize.
Title truncation reproduced in both narrow widget cases before the change.
Copy/rename/duplicate/delete-cancel and wide-resize widget paths pass. Full suite
520/520, analyze/RC PASS (`/private/tmp/clef-rc-u5.log`) after fixing a braces lint.
Commit subject: `fix: keep Clef setlist actions readable on narrow screens`.

S6: `b48d070`, VERIFIED LOCAL. Reordering an old snapshot resurrected a removed score in regression.
Accept index operations only while ordered score IDs match current state; preserve
current metadata if only title/settings changed. Invalid/missing targets return false;
same-index valid requests do not write. Drag, arrows and direct position share a
conflict notice. Widget stale-dialog/retry cases pass; full suite 518/518, analyze/RC
PASS (`/private/tmp/clef-rc-s6.log`). Commit subject:
`fix: reject stale Clef setlist reorder requests`.

S5: `df14f04`, VERIFIED LOCAL. A missing setlist caused detail rebuild to throw and bulk add to
report an all-duplicates outcome. Render a missing-target state; add-result carries
targetMissing, handled by all five add entry points. Pending delete/open/rehearsal
flows avoid dereferencing a vanished target after waiting. Widget regression first
raised Bad state: No element; pending add/rehearsal cases now pass. No schema change.
Full suite 516/516, analyze/RC PASS (`/private/tmp/clef-rc-s5.log`).
Commit subject: `fix: handle missing Clef setlist targets gracefully`.

S4: `8b06f5d`, VERIFIED LOCAL. Old setlist snapshots can replace intervening membership changes
and miscount duplicates. Resolve current state for single/bulk add, remove, rename
and resume bookkeeping. Regression first counted three additions instead of two.
Acceptance: consecutive stale-snapshot commands preserve prior changes, current
duplicates count once, current title/resume survive, deleted setlists stay deleted.
Widget coverage includes another addition while the multi-picker remains open.
This is not a cross-process storage transaction or a reorder conflict policy.
Full suite 514/514, analyze/RC PASS (`/private/tmp/clef-rc-s4.log`).
Commit subject: `fix: apply Clef setlist actions to current state`.

S3: `1117931`, VERIFIED LOCAL. Setlist load ignored cleanup when only orphaned durations or
metronome settings changed. Use the existing model's unchanged-instance contract
instead of checking only three collection lengths. Regression reproduced both
orphan maps remaining in memory. Acceptance: persist complete cleanup, preserve
valid settings/resume position, and leave the timestamp unchanged on a second load.
Both regressions pass; full suite 512/512, analyze/RC PASS
(`/private/tmp/clef-rc-s3.log`). Commit subject:
`fix: persist complete Clef setlist reference cleanup`.

U4: `21a3545`, VERIFIED LOCAL. Friend feedback requires identifiable scores without metadata.
Use the source filename for explicitly blank titles across home, setlist, viewer and
copied run sheets; search by filename and sort by displayed name. Preserve raw blank
titles through codec round-trip without adding schema fields. Widget regression
reproduced the missing label and now passes. Analyze, full tests and RC check PASS
(`/private/tmp/clef-rc-u4.log`). An invalid test-only copyWith argument was corrected
before the successful full rerun. Commit subject:
`fix: identify Clef untitled scores by source filename`.

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
S2: `3787f9a`, full suite 469/469, analyze/RC PASS. Current in-memory annotations copied per physical page range; external file-backed
hydration/migration remains outside this slice. Commit subject:
`fix: preserve Clef songbook annotations in split scores`.
U1: `dc7bb54`, full suite 475/475, analyze/RC PASS; commit subject:
`fix: keep Clef library accessible below recent sections`.
U2: `a790fc0`, narrow selection overflow menu implemented; full suite 477/477, analyze/RC PASS.
Commit subject: `fix: fit Clef selection actions on narrow screens`.
B5: `f714560`, restore storage isolation implemented; full suite 479/479, analyze/RC PASS.
Commit subject: `fix: isolate Clef restored files from existing libraries`.
B6: `023dfba`, checked metadata writes with best-effort rollback; full suite 496/496, analyze/RC PASS.
Commit subject: `fix: roll back Clef metadata after restore write failures`.
B7: `fcc43e3`, restore progress, UI exclusion and shared-import deferral implemented;
full suite 508/508, analyze/RC PASS. Commit subject:
`fix: protect Clef library actions during backup restore`.
U3: `2506f90`, bulk composer edit implemented; full suite 508/508, analyze/RC PASS.
Commit subject: `feat: edit Clef composers in bulk`.
User stop checkpoint (2026-09-13): PAUSED after S19 verification and focused commit.
Do not begin another slice until the user resumes. No build/version bump/push/merge.
Source remains `1.0.0+20`; current changes require a new build for device verification,
after resolving R1 release applicationId. Resume with git status/log and this checkpoint.
Next candidates: bulk/import/setlist controller failure recovery and RC test-completion
evidence. RC runner currently trusts exit code alone; an interrupted Flutter
test printed failures but exited zero in the initial S17 run. That interrupted run was
not counted as evidence; require explicit complete test evidence in a later tool slice.
Known limits: process termination, persistent storage failure preventing rollback and
non-UI concurrent mutations are not covered by the in-process rollback contract.
Fresh restored files may remain unreferenced after a failed restore; deleting them before
transactional metadata rollback would be unsafe, so this slice preserves them.
No app build performed; new changes have widget/source evidence only.

## Installed-App Observation (2026-09-13)

- Direct AVD launch succeeded: `clef_rc_tablet_api35`, Android 15, 2560x1600,
  density 320; emulator shut down after inspection.
- Clef: `com.mannlab.clef`, `1.0.0+20`, last installed 2026-09-07.
  Screenshot: `/private/tmp/clef-installed-home-20260913.png` (temporary evidence).
  Recent sections and filters occupy nearly all home height; score grid is nearly hidden.
- MobileSheets Free: `com.zubersoft.mobilesheetsfree`, 3.9.43 Build647.
  Screenshot: `/private/tmp/mobilesheets-library-20260913.png` (temporary evidence).
  Compact tabs/filters leave the main area for list rows; Recent shows a song and a setlist.
- These observations are not validation of the newly changed source, and do not establish
  microphone, pedal, touch performance or current MobileSheets paid-edition behavior.

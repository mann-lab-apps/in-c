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
| R1 | Installed Clef package differed from the source Android package. | Keep Clef separate from in C and retain its update identity. | User confirmed Clef & Staff is the renamed Clef, not in C. Restored `com.mannlab.clef` in the Clef worktree only; signing guard rejects missing/debug keys and accepts the recorded upload key. | VERIFIED LOCAL: configuration/signing; new app build and Play code availability remain unverified |
| Q1 | Friend feedback touch, audio, pedal and mini-panel behavior needs real-use evidence. | Record physical touch/audio/pedal results separately from synthetic or historical emulator evidence. | Android tablet, microphone, pedal and PDF samples. | DEVICE QA |
| Q2 | RC exit-code-only checks can accept an interrupted Flutter run. | Require valid JSON start/test completion/final success, zero process exit and at least one executed non-hidden test; reject errors even after test completion. | Eight false-success regressions reproduced in the extracted old predicate. Twelve fixtures plus actual Flutter file-reporter integration pass. Full suite 642/642, analyze/RC PASS. | VERIFIED LOCAL |
| S20 | Bulk metadata/collection saves retain failed edits in memory and leak errors from selection UI. | Recover persisted scores only while the request owns the current list/profile; preserve selection on failure, no success notice, allow retry, ignore closed UI. No-op bulk calls must not invalidate pending recovery. | Six regression failures reproduced before fix. Fourteen new unit/widget cases plus S18 recovery regression; full suite 656/656, analyze/RC PASS. | VERIFIED LOCAL |
| S21 | Single/batch/image/shared import leaves unsaved score cards after metadata failure. | Recover persisted scores with S18/S20 ownership guards, return no imported success, distinguish storage failure from file failure, release import state and allow retry. Never delete source files to compensate. | Four controller flows plus batch UI reproduced failure. Thirteen new tests; full suite 669/669, analyze/RC PASS. | VERIFIED LOCAL |
| S22 | Setlist mutations retain unsaved state and bulk add/create leaks failures to the UI. | Recover durable setlists only for the owning list/profile; preserve newer writes, report original failure, retain bulk selection for retry and ignore closed UI. | Twenty-two mutation/race/recovery/bulk UI cases; full suite 691/691, analyze/RC PASS. | VERIFIED LOCAL |
| S23 | Setlist detail edits leak save failures, including reorder and removal undo. | Report storage failure without success/conflict feedback or delete navigation; allow retry and ignore late errors after route exit. | Fifteen new widget cases; 37/37 setlist recovery cases, full suite 706/706, analyze/RC PASS. | VERIFIED LOCAL |
| S24 | Setlist list creation and post-import addition await unguarded saves. | Distinguish successful library import from failed setlist addition; no automatic viewer navigation after failed/cancelled target selection, preserve imported scores for retry. | Fourteen new cases; full suite 720/720, analyze/RC PASS. | VERIFIED LOCAL |
| S25 | Recent-position writes in open/viewer transitions interrupt reading on storage failure. | Allow valid reading with a storage warning; recheck route/profile/score/setlist membership after each awaited write. No late navigation after context changes. | Forty new widget cases; full suite 760/760, analyze/RC PASS. | VERIFIED LOCAL |
| S26 | Bulk score deletion saves scores and setlist cleanup separately, with unguarded UI failure. | Group linked metadata and automatic backup in the existing rollback operation; recover owned lists and retain selection on failure. Never delete source files. | Twenty-eight new failure/lifecycle cases; targeted store/removal 128/128, full suite 788/788, analyze/RC PASS. | VERIFIED LOCAL |
| S27 | Duplicate-import notice says the existing score opens before setlist target selection finishes. | Do not claim opening after target cancellation or failed addition. Preserve existing-score deduplication. | Four red/green widget regressions; targeted 29/29, full suite 792/792, analyze/RC PASS. | VERIFIED LOCAL |

| S28 | Startup cleanup write failure claims the whole library cannot be read despite usable loaded scores. | Distinguish cleanup persistence failure from read failure; retain filtered usable references, warn and retry on next load; do not warn over newer list/profile state. | Seven new cases, three initial red regressions; complete full suite 799/799, analyze/RC PASS. | VERIFIED LOCAL |

| S29 | CSV picker completion may edit a same-ID score in another library; all failures blame CSV format. | Reject results/errors from another library, preserve edits made during selection, distinguish missing score/read/format/persistence failures and retry safely. | Eight new controller cases; five initial red failures, targeted 88/88, full 807/807, analyze/RC PASS. | VERIFIED LOCAL |

| S30 | Delayed successful score/setlist/cleanup saves resolve the newly active library instead of their origin. | Pass captured library ID through owned score/setlist saves and startup cleanup; preserve existing rollback queue and backup scope. | Five red/green delay tests plus four explicit-target rollback/backup cases; targeted 61/61 and store 119/119, full 816/816, analyze/RC PASS. | VERIFIED LOCAL |

| S31 | Songbook-to-setlist creation/addition leaks save failures and continues after viewer exit. | Preserve created score entries, report partial failure with retry, reuse existing collection and stop later stages/feedback after route/profile change. | Five initial widget failures; 15 actual-action harness tests, full 831/831, analyze/RC PASS. | VERIFIED LOCAL |

| S32 | Split-score direct saves retain unsaved cards, mislead retries and may cross libraries; viewer errors are unhandled. | Use owned score save recovery/scope; no false split success; allow retry into setlist flow and suppress stale feedback after route/profile change. | Eight initial red cases; thirteen new cases, full 844/844, analyze/RC PASS. | VERIFIED LOCAL |

| S33 | Late PDF/batch/image/shared import may enter a newly active library or report stale results/errors there. | Check origin after file processing and persistence; stop uncommitted results after switch, preserve already-started original-library saves and suppress stale UI outcomes. | Sixteen initial red cases, eighteen new cases including real home-menu widget paths; targeted 47/47, full 862/862, analyze/RC PASS. | VERIFIED LOCAL |

| S34 | Profile reads rewrite raw JSON and can prevent opening scores when that unnecessary write fails. | Read without persistence; retain in-memory default normalization and explicit profile mutations. Missing/malformed/future-field raw values remain unchanged on reads. | Four initial red cases; store suite 123/123, full 866/866, analyze/RC PASS. | VERIFIED LOCAL |

| S35 | Clearing a library ignores failed removals or leaves partial metadata; late UI errors/feedback escape their initiating screen. | Group the five scoped removals in existing checked rollback writes; preserve original files/profile/other libraries, retry after failure and suppress stale UI feedback. | Ten injected storage failures and three UI failures reproduced; eighteen new store/widget cases including late success/failure, full 884/884, analyze/RC PASS. | VERIFIED LOCAL |

| S36 | Queued clear completion erases newer score/setlist/view/preset edits from memory despite successful persistence. | Reset only state still owned by clear; preserve later queued edits, unchanged resets and score/setlist failure recovery/retry. | Four initial red cases; ten new cases with real preferences queue delays; targeted 151/151, full 894/894, analyze/RC PASS. | VERIFIED LOCAL |

| S37 | Favorite preset falsely announces early success and fails to recover or retain the origin library after delayed saves. | Await save, disable repeat UI submission, recover only request-owned state, scope writes and suppress late feedback. | Nine red cases; fourteen new cases, targeted 165/165, full 908/908, analyze/RC PASS. | VERIFIED LOCAL |

| S38 | Home sort/filter saves leave unsaved selections, leak exceptions and can cross library scope after delay. | Recover request-owned view settings, report failure through existing home notice, preserve newer state/unrelated errors, retry and scope original writes. | Fifteen initial red cases; eighteen new cases including real home filter UI and recovery reads; targeted 169/169, full 926/926, analyze/RC PASS. | VERIFIED LOCAL |

## Resume Checkpoint (2026-09-14)

- User resumed continuous implementation; restored deleted worktree at `1f1f2fd`,
  clean `dev` matching fetched `origin/dev`. Root unrelated worktree is untouched.
- Source identity: Clef & Staff, `lib/main.dart` (discovery flag defaults false),
  `com.mannlab.clef`, `1.0.0+21`. No new build/version change/push/merge authorized.
- Archived AAB 21 record in the original project's `apps/in_c_sheet/releases` confirms
  the previous build completed after the historical build-preparation checkpoint below.
  Play upload, tester installation and physical QA are still unconfirmed.
- Q2 uses the installed test package's public JSON reporter protocol, not console wording.
  A unique temporary file per invocation prevents stale earlier success from being reused.
  Preserve normal console output; file/report/process failures must fail the check.
  Tooling only: app UI, codecs, runtime behavior and dependencies are unchanged.
- Q2 complete: `dart format lib test tool` changed only the three edited/new tool/test files;
  diff reviewed. Analyze, 642/642 tests, JSON completion gate and RC scans passed
  (`/private/tmp/clef-rc-q2.log`). Temporary report cleanup confirmed. No app build needed
  for this tooling-only change. Commit subject: `fix: require complete Clef RC test evidence`.
- Next: reproduce S20 bulk edit failure in controller and actual selection UI; preserve
  selection for retry and do not report success after failed persistence.

S20 implementation: extracted existing S18 persistence/recovery body into `_saveScoreChanges`
and reused it for bulk editing only. Nonmatching bulk selection leaves list identity intact.
Both UI entry points catch failure, retain selection and avoid success messages. No guarantee
is made if recovery reads fail or the process terminates. Import/setlist writes remain S21.
Targeted baseline: six failures including optimistic-state retention and unhandled widget errors;
after fix, bulk plus existing S18 tests passed. One intermediate patch targeted the similarly named
collection-rename block and failed compilation; corrected before passing tests, with no retained
change to collection rename. Extended race/closed-widget cases pass. Full suite 656/656,
analyze, JSON completion gate, RC and diff whitespace checks PASS (`/private/tmp/clef-rc-s20.log`).
Formatter changed only the new test file; reviewed source diff remains scoped to bulk and the
shared S18 helper. No new installed-app evidence. New internal-test build will be needed after
runtime changes; version remains 21 and no build/push/merge was performed.
Commit subject: `fix: recover Clef bulk edits after save failures`.
Next: inspect imported-score failure recovery across single/batch/image/share entry points;
setlist persistence recovery remains a separate S21 follow-up.

S21: single/batch/image/share metadata saves now use the same ownership-aware score recovery.
On failure, return no success and show a storage-specific notice; import decoding errors retain
their existing file guidance. Tests use injected import records, not native picker/cloud/PDF rendering.
Failed imports may leave copied files unreferenced; no deletion is attempted because a newer
successful write may already reference them. Newer successful writes remain authoritative even
if they include an optimistic imported score. Setlist failure recovery is tracked separately as S22.
Final S21 verification: 13/13 targeted cases and 669/669 full tests, analyze, JSON completion
gate and RC scans PASS (`/private/tmp/clef-rc-s21-verified.log`). The first full check caught
a multiline-if lint and a fixture using the same ID for a reimport; use a fresh ID with the
same source filename to match actual import behavior. Both were corrected before final PASS.
Formatter changes were limited to the edited controller/new test file. Commit subject:
`fix: recover Clef imports after metadata save failures`. No build/version change/push/merge.
Next command: add setlist save-failure regression tests for S22; do not rerun completed slices.

S22: create/duplicate/delete/replacement writes share ownership-aware setlist recovery,
preserving newer mutations and profile switches. Bulk selection add/new-target creation now catches
save errors and retains selection for retry. Setlist cleanup during score deletion/load remains a
separate cross-collection concern. Initial state regressions reproduced unsaved mutations; two
recovery-read tests timed out before the recovery path existed. After fix all initial 19 cases pass.
Closed-UI/read-failure extensions pass: 22/22 targeted cases, 691/691 full tests, analyze,
JSON completion gate and RC scans PASS (`/private/tmp/clef-rc-s22.log`). Remaining UI callbacks
are S23. Earlier checkpoint commits: Q2 `4efe8bb`, S20 `72ae320`, S21 `32da0d3`.
Commit subject: `fix: recover Clef setlists after save failures`. No build/version change/push/merge.
Next: reproduce detail editing failures before applying guarded feedback at those entry points.

S22 commit: `bd1546d`. S23 reuses the guarded save helper for detail rename, duplicate,
delete, add, rehearsal settings, reorder, remove and undo. A storage failure must not queue
a stale-order or missing-item message. Successful deletion alone pops the detail route.
Initial seven widget cases failed with unhandled errors, then passed; add and closed-route
cases extend coverage. The first close fixture replaced MaterialApp.home but preserved its
Navigator stack; corrected to use actual pageBack and assert route disposal before completion.
Final verification: 37/37 setlist cases, 706/706 full tests, analyze, JSON completion gate,
RC/diff checks PASS (`/private/tmp/clef-rc-s23.log`). Formatter touched only the edited main/test
files. Commit subject: `fix: handle Clef setlist detail save failures`. No app build, version
change or remote mutation. S24 covers remaining list-create/import/viewer entry points.

S23 commit: `d811ec9`. S24 catches standalone setlist creation and post-import add failures.
Library import remains durable when adding to the setlist fails, and the notice states that
partial result explicitly. Single PDF/image flows no longer auto-open the viewer when target
selection is cancelled or adding fails. Successful existing paths retain navigation behavior.
Six import error/closed-widget cases and two list-create cases reproduced uncaught errors.
Retry fixtures must use fresh import IDs with the same source filename, as native import does;
image menu items require scrolling. Successful routing uses bounded pumps because fake PDF
loading cannot establish native render completion. S25 covers remaining open/transition writes.
Final verification: import cases 25/25, full suite 720/720, analyze/JSON completion/RC PASS
(`/private/tmp/clef-rc-s24.log`). Diff/formatter review is scoped to main and the two edited
tests plus docs. No build, version change, push or merge. Commit subject:
`fix: distinguish Clef import and setlist save outcomes`.
Next: S25 reading fallback. Also review duplicate-import copy timing: its existing-score
notice currently precedes target selection, so cancellation can leave a misleading open notice.

S24 commit: `57bf11d`. S25 shares a guarded reading-preparation helper between home score,
recent setlist, list/detail first-song and viewer adjacent-song actions. Recent metadata save
failures no longer abort reading; one warning discloses failure without claiming persistence.
Both the owning route and profile plus current score membership are rechecked after awaits.
Remove detail first-song's duplicate recent write. This does not add an audio/PDF engine,
timeout for a permanently hanging store, or cross-process transaction guarantees.
Initial regressions included fixture mistakes: the next-song confirmation was not accepted,
and the first home score title belonged to metadata review rather than the reading card.
Corrected those gestures; the first thirty cases now pass. Added second-write lifetime and
empty recent-setlist coverage. Final 40/40 targeted and 760/760 full tests, analyze, JSON
completion, RC/diff checks PASS (`/private/tmp/clef-rc-s25-final.log`). The first full check
reported four multiline-if brace lints; corrected and reran the full checker to PASS.
No new build/device evidence. Commit subject: `fix: keep Clef reading through visit save failures`.
Next: S26 score deletion atomic metadata/selection recovery; prioritize data consistency over S27 copy timing.

S25 commit: `d159999`. S26 adds `saveScoresAndSetlists` using the existing serialized metadata
write/rollback helper. Removal precomputes both lists, skips no-op IDs without changing ownership,
and recovers each still-owned list on failure. Newer edits/profile switches are not overwritten.
Home removal catches failure and keeps selection; source PDF files are never deleted here.
The initial fixture used unsupported `copyWith(id:)`; corrected with the structured model codec.
With the new memory recovery held constant, temporarily restoring the prior separate-write policy
reproduced four second-write metadata mismatches and one UI mismatch. The paired operation passes
all initial 13 cases; twelve no-op/race/read-failure cases also pass. Added closed UI and failed
rollback checks. Full verification pending. Returned write failures are covered, not process-crash
atomicity or guaranteed recovery when rollback/reads also fail. Load-time orphan cleanup remains
outside this removal slice; inspect its startup failure handling separately.

Resume after quota interruption: fetched origin; dev remains seven commits ahead at d159999.
The delayed successful removal fixture reproduced writes leaking into the newly active library.
The paired-save API now requires the library ID captured by the controller before awaiting;
the delayed test store forwards that same ID. Fixed three multiline-if lints. Targeted store/
removal suites pass 128/128 (`/private/tmp/clef-removal-resume.log`). Full suite 788/788,
analyze, JSON completion gate, RC and diff/whitespace scans PASS (`/private/tmp/clef-rc-s26.log`).
Formatter touched only the paired store method in this resume; all earlier dirty diff was reviewed.
Commit subject: `fix: persist Clef score removal as linked metadata`. Next: S27 duplicate import copy.
No build/version change/push/merge. The original project worktree remains unrelated and untouched.

S26 commit: `7615f8b`. S27 removes the premature duplicate-open snackbar from the setlist
flow; actual add/error feedback owns the result. Plain duplicate import uses a factual
already-in-library notice instead of promising navigation. Four new widget assertions failed
before the copy fix. They also verify original ID reuse, membership and route outcome.
Targeted tests: 29/29; complete full suite: 792/792; analyze and RC PASS.
Temporary evidence: `/private/tmp/clef-duplicate-copy-red.log`,
`/private/tmp/clef-duplicate-copy-green.log`, `/private/tmp/clef-rc-s27.log`.
No model, codec, duplicate matching policy or native import changes.
Commit subject: `fix: clarify Clef duplicate import feedback`.
Next: reproduce startup setlist-reference cleanup write failure before choosing a fix.

S27 commit: `b7adf53`. S28 reproduced misleading startup/switch failure and missing specific
banner in three tests. Cleanup failure now preserves loaded scores and cleaned references
in memory, distinguishes the failed persistence and retries on the next load. Disk cleanup
is not claimed successful; actual read failures still use the load failure message.
Late failed cleanup cannot add a warning over a newer list/profile. No cleanup schema or
storage transaction changes; overlapping successful loads/writes are outside this slice.
Complete full suite: 799/799; analyze/RC and whitespace scans PASS.
Temporary evidence: `/private/tmp/clef-cleanup-red.log`, `/private/tmp/clef-rc-s28.log`.
Commit subject: `fix: distinguish Clef cleanup persistence failures`.
Next: CSV bookmark import conflates metadata save errors with file format errors;
songbook setlist creation still needs guarded save/lifecycle UI coverage.

S28 commit: `2a503a6`. S29 reproduced cross-library CSV bookmark application and incorrect
failure messages. Capture the picker origin library, merge against current score state and
ignore old-profile results/errors. The viewer suppresses feedback after closure/profile switch.
Storage errors retain existing save recovery; cancellation and duplicate pages stay harmless.
Eight new controller cases pass with existing controller tests (88/88); full suite 807/807,
analyze/RC and whitespace scans PASS. Temporary evidence: `/private/tmp/clef-csv-recovery-red.log`,
`/private/tmp/clef-rc-s29.log`. Commit subject: `fix: guard Clef CSV bookmark import outcomes`.
This covers picker delay, not every store-write/profile-switch interleaving. No native picker
or newest-build emulator claim. Next: full RC, then songbook setlist action or delayed save scope.

S29 commit: `d85e3ff`. S30 reproduced late successful writes crossing libraries for scores,
setlists (default and named profiles) and startup cleanup. Existing owned-save helpers now
pass their captured library ID; store APIs accept an optional explicit scope and keep default
active-library behavior for other callers. Test doubles forward the same optional parameter.
Explicit-target backup write failures (false/throw) preserve all prior keys; retries update
only source metadata/backup without switching the active library. Full suite 816/816,
analyze/RC and whitespace scans PASS. Temporary evidence: `/private/tmp/clef-save-scope-red.log`,
`/private/tmp/clef-save-scope-green.log`, `/private/tmp/clef-save-scope-store.log`, `/private/tmp/clef-rc-s30.log`.
Commit subject: `fix: scope Clef delayed metadata saves to their origin`.
This does not establish safety for overlapping full loads or removing the source profile
while a save is pending. Next: songbook setlist action save failure and retry UX.

S30 commit: `59df68b`. S31 isolates the existing viewer songbook-setlist action into a
testable function used by the viewer, without changing successful membership/order behavior.
Five initial widget failures reproduced unhandled creation/add errors and continued work
after exit. Both stages now have failure feedback with explicit retry and route/profile guards.
Fifteen widget cases pass, including existing-list reuse and actual detail navigation.
These exercise the shared action, not native PDF rendering or the split-menu gesture.
Score splitting itself, profile deletion during writes and overlapping library loads remain
separate candidate gaps. Initial RC rejected three async-context lint findings; explicit
mounted checks fixed them. Final full suite 831/831, analyze/RC and whitespace scans PASS.
Temporary evidence: `/private/tmp/clef-songbook-feedback-red.log`,
`/private/tmp/clef-songbook-feedback-green.log`, `/private/tmp/clef-rc-s31-final.log`.
Commit subject: `fix: recover Clef songbook setlist actions`.
No build/version change/push/merge. Next: split-score save recovery and failure feedback.

S31 commit: `79cf23f`. S32 reproduced unsaved split cards, wrong-library delayed success
and viewer action failures. Splitting now uses `_saveScoreChanges`; source records and PDF
paths remain unchanged. The actual viewer split action is a testable function with partial
failure retry and route/profile guards; its success action calls the S31 setlist flow directly.
Thirteen new controller/widget cases cover recovery/retry, source preservation, late success/
failure, route exit/coverage, profile switch and missing/empty/duplicate targets.
Full suite 844/844, analyze/RC and whitespace scans PASS. Temporary evidence:
`/private/tmp/clef-split-recovery-red.log`, `/private/tmp/clef-split-recovery-green.log`,
`/private/tmp/clef-rc-s32.log`. Commit subject: `fix: recover Clef songbook split saves`.
No native PDF render/build/install claim. Remaining candidates include PDF-outline merge
stale score snapshots, overlapping loads and source-profile deletion during pending saves.
Next: late PDF/batch/image/shared import results after a library switch; reproduce before fixing.

S32 commit: `317cbb9`. S33 reproduced stale file/save results and errors in all four import
paths after a profile switch. File-stage results are ignored before metadata changes; already
started saves retain S30 origin scoping but return no stale navigation result. Error messages
are scoped to the initiating library. The shared-file loop stops at the first changed profile.
Eighteen new cases cover file/save success/failure plus the actual home PDF and PDF-to-setlist
menus; 47/47 targeted tests and complete full suite 862/862 pass; analyze/RC and whitespace scans PASS.
Evidence: `/private/tmp/clef-import-scope-red.log`, `/private/tmp/clef-import-scope-green.log`,
`/private/tmp/clef-rc-s33.log`. Automatic approval review temporarily rejected the checkpoint
request because its model was at capacity. Read-only status verified the five Clef paths;
explicit staging was then approved through the normal approval path. No workaround was used.
Commit subject: `fix: isolate Clef late import outcomes`.
Native file placement/unused imported copies
are not cleaned or claimed transactional; source/created files are preserved.
Next: profile-list reads rewrite stored JSON and depend on a successful write; reproduce
read-only load failure/raw data replacement. Other candidates: overlapping library loads,
source-profile removal during saves and remaining guarded viewer command failures.

S33 commit: `a62620f`. S34 removes only the profile-index write from
`loadLibraryProfiles`. Four regressions first reproduced raw-value replacement and failed
score loading, then passed with all 123 store tests. Explicit create/rename/delete behavior
is unchanged; unknown fields are preserved on reads, not guaranteed across mutations.
Evidence: `/private/tmp/clef-profile-read-red.log`, `/private/tmp/clef-profile-read-green.log`.
Initial RC found one null-aware-elements lint in the test; corrected and rerun.
Full 866/866, analyze/RC and whitespace scans PASS (`/private/tmp/clef-rc-s34-final.log`).
Commit subject: `fix: keep Clef profile reads free of writes`.
No build/version change/push/merge. Next: reproduce partial library-clear persistence failures.

S34 commit: `a925d03`. S35 local verification completed after the user requested commit/push.
`clearLibraryProfile` now submits scores, setlists, view settings, favorite annotation preset
and automatic backup removal together through `_writeMetadataValues`. The actual home
confirmation action catches failure and guards feedback by mounted route and initiating library.
Ten store failures (false/throw at each key) and three widget failures reproduced before fixing;
the normal widget success case passed. Red evidence: `/private/tmp/clef-profile-clear-red.log`.
Two green-test requests were rejected by automatic approval review because its model was at
capacity, not because tests failed. Read-only status/diff checks confirmed only the intended
four Clef code/test files before this checkpoint. No indirect execution workaround was used.
Approval service recovered on resume. Initial targeted 137/137 PASS; extended four cases for
closed/switched/covered routes and late success/failure. Full 884/884, analyze/RC and whitespace
scans PASS (`/private/tmp/clef-rc-s35.log`). Formatter changed only the three intended source/test
files. Feature map/tester checklist updated. Commit subject: `fix: recover Clef library clear failures`.
User authorized committing and pushing dev on this checkpoint; main merge and builds remain
unauthorized. No build/version change. Next: reproduce concurrent edits during library clear.
Profile deletion/creation/rename transactions and concurrent edits during clearing remain
separate unchecked gaps. Rollback failure/process termination guarantees are not claimed.

S35 commit: `7403146`. Resume instructions are captured in
`docs/product/clef-resume-goal-mode-prompt.md`. User requested commit/push and a new prompt;
continuous implementation is paused at this verified checkpoint, not declared complete.
The next execution must fetch and verify remote synchronization rather than reuse old ahead counts.

Resumed at `6b98ba6` with clean dev matching fetched origin/dev; identity remains
Clef & Staff/com.mannlab.clef/1.0.0+21. S36 reproduces four memory/disk mismatches when
clear succeeds before a later queued score/setlist/view/preset save. Capture per-field ownership
before clearing and reset only unchanged fields. Ten new store/controller cases cover clear
success/failure, later edits, later score/setlist save failures and retry; existing eight home
widget lifecycle cases remain green. Targeted 151/151 and full 894/894 PASS; analyze/RC and
whitespace scans PASS (`/private/tmp/clef-rc-s36.log`).
Evidence: `/private/tmp/clef-clear-edit-red.log`, `/private/tmp/clef-clear-edit-green.log`.
Scope excludes overlapping loads, work before clear reaches the queue, profile deletion races
and view/preset save-error recovery; do not infer a general transaction across controller requests.
Commit subject: `fix: preserve Clef edits after queued library clear`.
Next: favorite annotation preset reports success before saving and has no error handling;
reproduce actual viewer feedback and controller recovery. View settings recovery remains separate.
No build/version change/push/merge authorized or performed on this resumed execution.

S36 commit: `ce6eaa8`. S37 interruption checkpoint (resolved by final verification below).
At interruption the uncommitted modified files were main.dart,
sheet_library_controller.dart, sheet_library_store.dart; new test:
`apps/in_c_sheet/test/sheet_favorite_preset_recovery_test.dart`.
Store accepts explicit libraryId; controller pins origin and recovers only request-owned state.
Viewer awaits persistence, disables repeat submission, keeps previous local preset on failure,
updates saved state under covered routes without late feedback and offers retry.
Nine actual red cases reproduced after correcting a tooltip/button test-harness mistake.
Fourteen new cases cover failure/removal/retry, newer failure after older success, delayed/failed
recovery reads, origin switch and real viewer toolbar success/failure/exit. Targeted 165/165
PASS including store/S35/S36 regressions. Evidence: `/private/tmp/clef-preset-recovery-red.log`
and `/private/tmp/clef-preset-recovery-green.log`. Format completed (95 files, 3 changed), diff
review and `git diff --check` PASS. Missing-file widget fixture is not PDF/stylus device QA.
Automatic approval review then rejected documentation and full RC requests due to model capacity.
No workaround was used. Full analyze/test/RC had not run at interruption; no commit/build/version change/
push/merge. Next command from apps/in_c_sheet: `dart run tool/rc_release_check.dart`.
After passing, update feature map/tester checklist with preset persistence/failure feedback,
record actual full test count and focused commit. Then reproduce library view-setting save errors.
Local dev remains one commit ahead of the fetched origin/dev. S36 full suite was 894/894 PASS.

S37 continuation audit: current HEAD/status revalidated; full RC approval still failed with
the same model-capacity condition. Source review found one multiline-if missing braces in
the viewer result guard; braces added without behavior change. Feature map and tester checklist
now explicitly mark S37 full validation pending. Run format/analyze/full tests/RC after approval
service recovery; the earlier 165 targeted passes predate this brace-only cleanup.

S37 final validation: approval service recovered via the normal approval path. Format 95 files,
zero changes; full 908/908, analyze/RC and whitespace scans PASS (`/private/tmp/clef-rc-s37.log`).
Feature map/tester checklist now reflect verified local behavior; device/stylus quality remains
unverified. Commit subject: `fix: recover Clef favorite tool preset saves`.
Next: reproduce home sort/filter persistence errors. No build/version change/push/merge.

S37 commit: `f3efad4`. S38 covers home library view-setting persistence. The existing home
notice now reports caught save failures; recovery applies only to the same request/profile/value.
Successful retry clears only this view-save message, not unrelated load errors. Store accepts
explicit libraryId, preserving the default active-library contract for other callers.
Fifteen initial red tests; eighteen cases cover nine sort/filter/reset actions, old/new failures,
origin switch, delayed/failed recovery reads and actual favorite-chip failure/exit/retry.
Evidence: `/private/tmp/clef-view-settings-red.log`, `/private/tmp/clef-view-settings-green.log`.
Full 926/926, analyze/RC and whitespace scans PASS (`/private/tmp/clef-rc-s38.log`).
Commit subject: `fix: recover Clef library view settings saves`.
The transient search query is not restored on filter-reset failure;
only persisted view settings are covered. Collection rename direct-save and overlapping loads
remain separate candidates. No build/version change/push/merge.
Next: profile rename failure feedback and persistence, including queued rename read/modify/write.

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

## Android Build Preparation (2026-09-13)

- User redirected the paused improvement goal to build preparation. Base: `cf61abe` on
  `dev`, 35 commits ahead of `origin/dev`. No further feature slices were started.
- User confirmed Clef was renamed Clef & Staff and in C/classical discovery is separate.
  Restored the Clef Android namespace/applicationId/activity package to `com.mannlab.clef`
  in `/private/tmp/clef-next-polish` only. Root worktree changes were not modified or staged.
- Candidate source/app-info version: `1.0.0+21`. Play Console code 21 availability is unverified.
- Removed release debug-signing fallback. Added a pre-release guard requiring the recorded
  upload certificate SHA1 `4C:78:A9:1A:12:98:5C:CE:7B:CE:3E:C0:61:A9:CE:08:F1:7C:A1:B9`.
  Local signing files were copied from the existing valid root files and remain ignored secrets.
- Regression evidence: both identity/signing contract tests failed before the fix
  (`/private/tmp/clef-release-config-red.log`) and passed in the full 630-test suite.
- Gradle live checks: missing key.properties rejected; actual debug certificate
  `AB:86:4E:DD:DF:C4:06:77:D9:DC:5A:43:F6:39:99:35:A3:9E:19:15` rejected;
  existing upload key accepted by `:app:verifyClefReleaseSigning :app:validateSigningRelease`.
  Logs: `/private/tmp/clef-signing-missing.log`, `/private/tmp/clef-signing-wrong.log`,
  `/private/tmp/clef-signing-valid.log` (temporary evidence).
- `:app:bundleRelease --dry-run` passed and includes the signing guard before preReleaseBuild.
  This verifies configuration/task wiring, not native compilation or a produced app bundle.
  Gradle/plugin deprecation warnings remain non-fatal; no dependency upgrade was included.
- `dart format lib test tool`: 83 files, zero formatter changes. Analyze, 630/630 tests,
  RC, diff whitespace, trailing whitespace/tab/stale wording checks: PASS.
  Full log: `/private/tmp/clef-release-prep-rc.log` (temporary evidence).
- Commit subject: `fix: prepare Clef Android release identity and signing`.
  No APK/AAB/iOS build, install, push or merge was performed.
- Next release action: confirm code 21 is unused in Play Console, then on user build request
  run `flutter build appbundle --release` from this worktree's `apps/in_c_sheet` and archive
  the verified artifact inside the project. Actual compile success and physical QA remain open.

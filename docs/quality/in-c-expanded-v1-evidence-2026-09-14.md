# in C Expanded V1 Evidence: 2026-09-14

## Scope And Provenance

Full existing A-I/follow-up objective registered after the goal tool returned no active goal.
This is not a replacement for a usage-limited goal. No partial completion claimed.
PR #755 is MERGED at e3e634a. Fetched origin/main ff6c9c2 is the detached basis of
`/private/tmp/in-c-v1-resume-20260914`; the original dirty worktree is untouched.
No commit, push, merge, deployment or identity changes in this run.
Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. Historical DONE is scoped acceptance.

## Reproduced And Corrected

- H01/H02: failing Apple Music search returned early instead of offering another safe
  destination. Today and Work Detail now share bounded recovery: same-provider search,
  otherwise YouTube/another safe search, at most one automatic destination retry.
  Only validated links are attempted. Intermediate failures do not show error snackbars;
  total failure offers the exact work/composer/catalog query for copying.
  Disposed screens do not initiate late fallback. Attempts remain clicks, not listens.
  Four widget/channel tests cover search failure, direct-to-search, all failures and disposal.
  `/private/tmp/in-c-link-recovery-red4.log` reproduces failure;
  `/private/tmp/in-c-link-recovery-final2.log` records four PASS.
- A04: seven-day inspection incorrectly quoted a user's whole-symphony preference as
  liking the second movement. Automatic input reasons now quote raw input; explicit user
  selection can name the selected work. Reasons choose a stronger supplied composer/ensemble
  connection instead of always taking the first shared-axis input. Two red/green regressions:
  `/private/tmp/in-c-reason-red.log`, `/private/tmp/in-c-reason-green.log`.
  Valid pinned works and actual listening records were not replaced or deleted.
- A04 follow-up: existing stored pins retained the old favorite-movement claim. The legacy
  template lacks original-input provenance, so its assertion is withdrawn with neutral copy
  rather than reconstructed from today's changed tastes. Current pins persist that correction;
  history also suppresses it after old-state merges. The freshly resolved current pick wins
  over a duplicate stored-history row. Work/moment/date/completion/save/events are preserved.
  `/private/tmp/in-c-legacy-reason-red.log` reproduces it;
  `/private/tmp/in-c-legacy-reason-green.log` verifies persistence, next-day history and both
  merge orders. No new listen, replacement event or human evaluation is generated.

## Native Notification Evidence

Dedicated new simulator: `in C Isolated QA 20260914`,
`3487F107-32A7-41CD-B414-30C0B8FF2F6E`, iPhone17Pro/iOS26.5.
Existing user simulators, their permission state and personal records were not changed.
Before permission: real not-determined status rejects scheduling.
Under actual provisional authorization: pending replacement, local-calendar components,
cancel and invalid-time rejection execute, not SKIP.
A request scheduled for the next minute reached the real `willPresent` delegate with
matching payload/body and a received timestamp after scheduling.
Log: `/private/tmp/in-c-resume3-native-provisional.log`, all integration cases PASS.

This is OS-delivered foreground simulator evidence, not an injected callback. It does not
prove a user accepted the permission dialog, saw a background banner, tapped a notification,
crossed timezones, or received it on a physical device. Provisional authorization is not
full user consent ([Apple permission documentation](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications)).
QA permission/callback inspection methods are simulator-only; permission helper also requires
the simulator name prefix `in C Isolated QA`. The integration setUpAll checks that isolation
before any test runs, including when permission was already granted. Both flags are required.
Production permission policy is unchanged.

```sh
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/in_c_expanded_flow_test.dart -d 3487F107-32A7-41CD-B414-30C0B8FF2F6E --no-pub --dart-define=IN_C_DISCOVERY_HOME=true --dart-define=IN_C_SIMULATOR_QA=true --dart-define=IN_C_ISOLATED_NOTIFICATION_QA=true
```

Use both QA defines only on the dedicated simulator, never on a person's everyday device.
The delivery case waits until the next minute plus a bounded grace period and cancels afterward.
Native UI tests use isolated preferences; they do not clear an actual tester's history.

## Verification

The table below is the earlier checkpoint. The composer-exclusion continuation below
supersedes its full-suite, analyze and build counts without erasing historical evidence.

| Check | Result | Evidence |
| --- | --- | --- |
| Full Flutter suite, including Clef and legacy pins | PASS 550 | `/private/tmp/in-c-resume3-legacy-full.log` |
| Controller suite | PASS 108 | `/private/tmp/in-c-resume3-legacy-controller.log` |
| Analyze, final source | PASS | `/private/tmp/in-c-resume3-legacy-analyze.log` |
| Changed Dart format | PASS, 6 files unchanged | `dart format --output=none --set-exit-if-changed` |
| Diff whitespace | PASS | `git diff --check` |
| New reason regression | PASS 2 | `/private/tmp/in-c-reason-green.log` |
| New launcher regression | PASS 4 | `/private/tmp/in-c-link-recovery-final2.log` |
| iOS no-codesign, final source | PASS, 25.9MB | `/private/tmp/in-c-resume3-legacy-ios.log` |
| Simulator QA helper strings in device Runner binary | Absent (rg exit1); compile exclusion corroboration, not security certification | `strings build/ios/iphoneos/Runner.app/Runner` filtered for all four QA method names |
| Native provisional delivery + storage/map + final isolation guard | PASS, actual foreground delivery and five behavioral test cases; runner +7 includes setup/teardown | `/private/tmp/in-c-resume3-native-guarded.log` |

Native rerun includes the new-reason refinement and isolation guard, but precedes the final
legacy-pin follow-up (covered by full550 and the final iOS build, not native interaction).
Captured Today text
was visually inspected: raw input appears and the main guide/link buttons remain visible.
Build identity read from artifact: `com.mannlab.inc.clefandstaff`; inherited from current main,
not an identity decision made here. A no-codesign artifact cannot establish distribution approval.
Current source screenshots at the host temp `in-c-expanded-v1-ui` directory are simulator
integration captures. Today and My Music were inspected for visible text/overlap; this is not
VoiceOver traversal, physical small-screen QA or actual audio playback.

## Content And Recommendation Limits

BWV1007 main performance and publisher chapter metadata were identified, but no audio was
downloaded or actual provider playback observed. See first30 review for precise evidence split.
No approved direct/preview URLs were added. First30 playback/window approval remains open.
Founder first-week inspection is SIMULATION with assumed completions, not listening history.
Sequence: Moonlight I, Fur Elise, Nimrod, Bach Air, Pathetique II, Swan Lake ActII No10, Jupiter.
Reasons now use actual supplied Chopin/Dvorak inputs. This remains a familiar-classics-heavy
sequence, not proven discovery quality. The user was asked which first-three works are already
too familiar; no response or satisfaction score has been invented.
The independent fixture results test constraints, not a person's musical enjoyment.

## Remaining Work

- K01/A04: validate each recording's version, region availability, playback and listening window;
  finish remaining score claims. Candidate URLs/chapter metadata alone cannot approve playback.
- B01/C03/C04: actual founder response and then five-user evaluation; no synthetic approval.
- G01/G03/G04/G06: full permission/denial, physical/background delivery, timezone travel and taps.
- H01/H02/I02: actual provider failure/return and VoiceOver/physical accessibility.
- Remaining Required rows retain their original acceptance, not automatically QA-only.

Implementation complete: NO. Recommendation quality: NOT_VERIFIED.
Device verification: partial simulator evidence only. Public release approval: NO.
Next: continue K01/A04 first30 recording/score review. The newly discovered legacy reason
gap is now repaired, but musicological and actual listening verification remain open. Collect
the requested founder familiarity response before treating known works as new discoveries.

Resume from `/private/tmp/in-c-v1-resume-20260914`, not the original dirty worktree.
The original tree and all other products are untouched; no git publication occurred.
Current implementation fixes are A04 and H01/H02 subcriteria, native evidence G04/G06;
no entire Required row was promoted merely for these checks. Goal remains active/unfulfilled.

## Composer Preference Continuation

B01/B02 audit reproduced a distinction hidden by the built-in founder preview: entering
only the eleven favorite inputs produced Mahler Adagietto on day seven. That probe did not
include the founder's fast-reaction or avoidance preferences and is not a full-profile
quality evaluation. Log: `/private/tmp/in-c-founder-pool-inspection.log` (simulation).

Users can now search composers in My Music's recommendation exclusions and check/uncheck
them. Explicit exclusions filter new Daily/Next Three/Discover/detail recommendations,
even when a saved work or positive input would otherwise boost the composer. Search and
manual work access remain available. The valid same-day pin, raw inputs, saves and actual
listening history are preserved; this is a future-recommendation preference, not erasure.
New users start with no explicit exclusions. All candidates excluded produces no forced
pick and retains a route to settings so the user can undo the exclusions without resetting.

L02: excluded IDs survive JSON, backup/reopen and the existing deterministic preference
merge. Malformed field types recover a valid backup. Failed persistence retains pending
local edits with explicit retry. A second regression showed a backward clock plus a later
platform edit could lower the removal revision and resurrect an old exclusion. Preference
revision time is now monotonic; occurrence timestamps are unchanged. No remote sync claimed.

- RED: `/private/tmp/in-c-composer-exclusion-red.log`,
  `/private/tmp/in-c-exclusion-clock-red.log`.
- Eight targeted PASS: `/private/tmp/in-c-composer-exclusion-final8.log`.
- Full suite including Clef: **558 PASS**, `/private/tmp/in-c-composer-exclusion-full8.log`.
- Controller: **108 PASS**, `/private/tmp/in-c-composer-exclusion-controller.log`.
- Analyze PASS: `/private/tmp/in-c-composer-exclusion-analyze8.log`.
- iOS no-codesign PASS, 25.9MB: `/private/tmp/in-c-composer-exclusion-ios8.log`.
- Final changed-Dart format PASS (10 files, zero changes); `git diff --check` PASS.

Native integration searched Mahler, checked and unchecked him, and read back the actual
isolated preference store after each edit. The first run failed on an existing button tap
after returning from settings because the view had not settled; this was not ignored.
Explicit settle and hit-test assertions fixed the test. Rerun:
`/private/tmp/in-c-composer-exclusion-native-final.log`, PASS including actual provisional
foreground notification delivery. Screenshot `in-c-composer-exclusions.png` in the host's
`in-c-expanded-v1-ui` temp directory was visually inspected. This is not VoiceOver evidence.
The final empty-pool settings recovery was added after that native run; it passed the
widget/full suite and final device build, but has not been interacted with natively.

The existing automatic cold-start heuristic is not a complete avoidance-preference model;
genre-level avoidance (including opera) remains a gap. B01/B02 are not promoted to DONE.
No founder satisfaction or five-user response was synthesized. First30 still has no approved
direct/preview playback windows. The additional OSQ Grieg source supports the written
flute/oboe handoff only; see the first30 review for its source and playback distinction.

Required39 remains DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. Continue B01/B02 avoidance
model audit and K01/A04 recording/window verification; physical notification permission,
delivery/tap, accessibility and actual human recommendation evaluation remain open.

## Opera And Fugue Continuation

This section supersedes the preceding outstanding genre-avoidance and no-fugue implementation
gaps, not their human/playback evidence. At this restart get_goal returned null; the full
unbudgeted A-I/follow-up objective was registered. No usage-limited goal was replaced.

B01/B02: two isolated candidates reproduced a hidden founder veto: melody-only input treated
Mahler and Handel's chorus as cold mismatches despite no avoidance preference. Removed that
veto and the unrelated founder-only nighttime/structure bonus. Scoring now uses actual
work/composer inputs and explicit preference tags. A Puccini-only input test exposed missing
composer-only weighting; its positive preference is now used. Explicit exclusions still win.

The opera switch is opt-in, applies only to curated `isOperaticVocal` excerpts, and leaves
choral symphonies, oratorios, songs and instrumental overtures alone. Five classified seed
entries have primary-source references in the content review. JSON/import/admin metadata
edits preserve the flag; invalid boolean values are rejected. Preference backup/reload,
two-order merge, same-day pin preservation and empty-pool undo are tested. The founder
preview applies raw-profile exclusions only in its own simulation, never a new user's store.

The previous seed had no actual fugue. BWV578 was added outside the unchanged first30 pool.
The Netherlands Bach Society supports organ/G-minor identity and the long theme/second entry
guide. Duration is an editorial estimate displayed as approximately four minutes; no recording
length or exact window is asserted. All new external links remain searches. `바흐 푸가` is
not auto-matched to BWV578, but yields an actual fugue recommendation. Exact BWV578 and an
unavailable BWV542 are distinguished. Composer-only reasons now acknowledge the composer
connection instead of claiming no connection at all. No listening/approval events fabricated.

- Fugue RED: `/private/tmp/in-c-fugue-red.log` (missing actual work).
- Opera/composer targeted: 15 PASS, `/private/tmp/in-c-avoidance-targeted2.log`.
- First fugue targeted: 8 PASS, `/private/tmp/in-c-fugue-green.log`.
- Full suite including final number-disambiguation checks: 566 PASS,
  `/private/tmp/in-c-fugue-full.log`.
- Analyze PASS: `/private/tmp/in-c-fugue-analyze.log`.
- iOS no-codesign PASS, 25.9MB: `/private/tmp/in-c-fugue-ios.log`.
- Pre-fugue native opera toggle/store readback and actual provisional foreground delivery:
  PASS, `/private/tmp/in-c-avoidance-native.log`. Opera screenshot visually inspected.
- Fugue native run: PASS, `/private/tmp/in-c-fugue-native.log`; initial captures used a
  bare MaterialApp. Repeated under the actual ClassicalDiscoveryApp theme/navigation:
  `/private/tmp/in-c-fugue-native-themed.log`, PASS. Detail/metadata captures visually
  inspected. Six behavioral cases plus setup/teardown produce runner +8; not eight users.
- Controller-only run: 108 PASS, `/private/tmp/in-c-fugue-controller.log`.

A04 follow-up: detail tiles displayed an exercise's end offset as its duration. A fixture
with start45/end75 reproduced the false 75-second label (`/private/tmp/in-c-moment-duration-red.log`).
The label now shows end-start with `감상`, not an unverified recording timestamp.
Final nine targeted tests PASS (`/private/tmp/in-c-fugue-final-targeted.log`), full567 PASS
(`/private/tmp/in-c-fugue-final-full.log`), analyze PASS (`/private/tmp/in-c-fugue-final-analyze.log`).
Format:14 changed Dart files unchanged; diff whitespace PASS. Final iOS no-codesign build
PASS, 25.9MB: `/private/tmp/in-c-fugue-final-ios.log`. The native themed pass precedes only this final tile-label
change, which has widget evidence; do not claim native interaction with the 45-75 fixture.

Required39 remains DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. No entire row promoted based
on these subcriteria. Actual founder response, five users, recording playback/window,
physical notification permission/delivery/tap and VoiceOver remain NOT_VERIFIED.
The opera instrumental-excerpt clarification is unanswered; no broader exclusion inferred.
K01 source follow-up: Indianapolis Symphony's Adagio note supports the Rachmaninoff flute,
clarinet and piano sequence. This closes the unsupported work-note observation, not selected
recording, region, timing or actual listening approval. See the per-work source row.

Next: K01/A04 first30 recording/window verification and B01/B02 independent recommendation
evaluation; G03/G04 physical notification taps and I02 VoiceOver remain separate. Resume from
this worktree, not the original dirty checkout. Re-run changed tests before extending code:
`flutter test test/classical_avoidance_preferences_test.dart`, then relevant full/native gates.
No commit/push/merge/deployment/identity change occurred. Full goal remains unfulfilled.

## Composer-Only Bridge Audit

Problem/scope: B02/A03 could label any easy work as a close Daily pick when the input
identified only a composer, because a null work anchor bypassed the bridge predicate.
An isolated Puccini input with only Mozart K545 reproduced this false claim. Unknown
input had the same defect. This audit changes new Daily selection, not pinned history,
the content approval policy, or the whole subjective distance assessment.

Acceptance: composer-only evidence must connect to that composer; no bridge must be
explicit open_start; genuine composer/free-text-axis/preferred instrument or mood/positive
reaction bridges remain usable. Explicit exclusion still wins. No input/history migration
or listening event is fabricated. Existing valid same-day pins remain unchanged.

- RED: `/private/tmp/in-c-composer-bridge-red.log`, Puccini/Mozart incorrectly close_step.
- Corrected null-anchor bridge predicate and added two composer/unknown regression cases.
- The older melody/vocal test conflated candidate availability with close_step. It now
  verifies actual candidate presence and explicit exclusion independently; Mahler's melody
  tag supports its bridge while Hallelujah remains available as open_start.
- Unknown-song regression retains empty axes/map and raw-input evidence while requiring
  open_start rather than a claim of closeness. Intermediate full runs failed only on these
  old expectations; neither failure was hidden or recorded as PASS.
- Final full569 PASS: `/private/tmp/in-c-composer-bridge-full-pass.log`.
- Analyze PASS: `/private/tmp/in-c-composer-bridge-analyze.log`.
- Changed Dart format and git diff whitespace PASS.
- Native isolated regression PASS: `/private/tmp/in-c-composer-bridge-native.log`.
  Six behavioral cases plus setup/teardown, actual provisional foreground delivery,
  storage/readback, fugue detail, primary flow. The new sparse-composer case itself is
  controller-tested, not an observed user session or native composer-input interaction.
- Reinspected `in-c-fugue-metadata.png` after this run: 30-second/3-minute exercise labels,
  approximate work length and search CTA labels fit. This supersedes the preceding tile
  label's native-visual gap, not recording/timestamp playback verification.

Required39 stays DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. B02/A03 subcriteria improved;
whole user-value approval is absent. Next K01/A04 recording/window review and independent
first-week/human relevance checks; G03/G04 physical taps and I02 VoiceOver still open.

## Native Cold-Launch Entry Audit

The preceding goal continuation made code/test progress, not a blocked turn. Current
worktree/diff were checked again. No UI automation tool for simulator notification taps
is installed (`idb`, `maestro`, `cliclick`, `xcodegen` absent); simctl's available privacy
services exclude notification authorization, and it offers no banner-tap operation.
This prevents that particular direct observation, not independent implementation work.

G03 gap: the notification delegate was installed only when Flutter's engine initialized;
SceneDelegate did not forward `connectionOptions.notificationResponse`. Apple documents
the early-delegate requirement and the Scene launch response path. Checked 2026-09-14:
[delegate](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/delegate)
and [notificationResponse](https://developer.apple.com/documentation/uikit/uiscene/connectionoptions/notificationresponse).
Web renderer required JavaScript; official `.md` documents were retrieved with curl and
read. This is a code/lifecycle gap supported by documentation, not a reproduced OS tap loss.

Changes: install delegate in didFinishLaunching; retain engine-time registration; forward
Scene response before engine setup; buffer until Dart consumes; deduplicate by delivery
date for this single recurring request ID using a bounded32-entry history. A later delivery
is not rejected merely because its repeating request ID matches. Ignore dismiss/custom
actions, unrelated identifiers and empty payloads. Clef URL-import forwarding is unchanged.

Native ATDD: `/private/tmp/in-c-native-open-red.log` fails to compile the absent capture/
consume contract; this is NOT a runtime tap reproduction. Added implementation passes
`/private/tmp/in-c-native-open-green.log`: three meaningful Swift cases plus the existing
template testExample (four runner tests; do not count the template as feature coverage).
Tests use isolated bridge instances without an engine or forged UNNotificationResponse.
They verify buffering/filtering/deduplication, not Scene OS dispatch or an actual gesture.

Full569 PASS: `/private/tmp/in-c-native-open-flutter.log`; analyze PASS:
`/private/tmp/in-c-native-open-analyze.log`; isolated native integration PASS:
`/private/tmp/in-c-native-open-integration.log` (six behavioral cases plus setup/teardown).
Actual provisional foreground delivery still reaches the delegate after early registration;
there is no banner/background/tap claim. Final iOS no-codesign PASS,26.0MB:
`/private/tmp/in-c-native-open-ios.log`. Three changed Dart format checks unchanged; diff
whitespace PASS. Native identity remains com.mannlab.inc.clefandstaff, not modified.

Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. G03 remains IN_PROGRESS because
actual warm/cold notification taps and physical-device QA remain open. Resume K01/A04
first30 recording/window review or I02 accessibility verification; use the same isolated
worktree. Native regression command is in this document's initial command block; Swift
contract verification uses xcodebuild test, Runner scheme, RunnerTests only, parallel
testing disabled, the dedicated simulator destination, and FLUTTER_TARGET=lib/main.dart.
No commit/push/merge/deployment/app-identity change occurred; full goal remains active.

## Provider Playback And Preview Approval Audit

K01/H01: actual browser observation is now available for the official BWV1007 candidate.
An isolated in-memory Electron session (no personal profile, no downloads) opened the
Netherlands Bach Society page, accepted necessary cookies only, and used the visible
page play entry. Its modal showed the titled performance; media time advanced approximately
6 -> 10 ->14 seconds, readyState4, unmuted and playing. Source and artifacts are recorded
in the first30 review. Earlier iframe-only interaction left the cover visible; it was not
claimed as the visible user flow. One browser initialization error was fixed and retried.
This is browser video/timeline evidence, not heard audio, Korean-region proof, iOS/WebView
playback or reviewed musical timing. No recording/preview URL was approved in the catalog.

During that review a separate K01/P01 policy defect was reproduced: `listen_direct` plus
a same-host preview URL was automatically approved for preview, while the explicit
`listen_preview_approved` status was not recognized. Full destination approval and preview
permission must be separate. The new policy requires explicit preview approval, a valid
direct destination, matching provider, and a non-search provider preview URL. Existing
direct links are not automatically migrated to preview-approved. No native audio capability
or provider permission is invented by this change.

- RED: `/private/tmp/in-c-preview-approval-red.log`, direct-only URL incorrectly approved.
- Controller110 PASS: `/private/tmp/in-c-preview-approval-controller.log`.
- Widget checks report player available via a mock channel: search/direct-only hide preview;
  explicit approval shows it and issues exactly one play request. No real playback claim.
- Policy matrix also rejects search destinations, search preview URLs and wrong hosts.
- Analyze PASS: `/private/tmp/in-c-preview-approval-analyze.log`; changed Dart format PASS.
- Full571 PASS: `/private/tmp/in-c-preview-approval-final-full.log`; diff whitespace PASS.
- Native code unchanged in this continuation; preceding native passes are historical for
  this policy change, not an actual approved-preview playback test.

Required39 counts unchanged: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. Actual first30 audio,
musical timing, physical notification taps and human recommendation quality remain open.

## Day-Five Expansion Bridge Checkpoint

A03/F01/A04: Puccini-only intake, four uncompleted past picks and a Mozart K545 candidate
reproduced a false gentle_expansion label. RED: /private/tmp/in-c-gentle-bridge-red.log.
Gentle expansion now requires a known bridge, otherwise trying close_step then open_start.
Explicit instrument/mood evidence appears in reasons. A piano-preference positive control
still permits expansion; same-day reload is stable. Fixture history is not real listening.

- Scoped12 PASS: /private/tmp/in-c-gentle-bridge-final-targeted.log.
- Full574 PASS: /private/tmp/in-c-gentle-bridge-full.log.
- Analyze PASS: /private/tmp/in-c-gentle-bridge-analyze.log.
- Dart format and git diff --check PASS.
- iOS no-codesign build PASS, 26.0MB: /private/tmp/in-c-gentle-bridge-ios.log.
- Required39 remains DONE11 / IN_PROGRESS26 / NOT_VERIFIED2.
- Physical-device and human recommendation-quality checks remain open.
- User authorized checkpoint commit/push, not merge/deploy/identity changes.

## Reaction Revision Follow-Up

L02/D02 static audit: updateReaction used wall-clock updatedAt for both the reaction and
work snapshot. Two edits at the same time (liked -> unsure -> liked) or a backwards clock
can tie/regress the revision, allowing the deterministic merge tie-break to restore an old
reaction. The patch advances only the edit revision past the previous reaction/work
revision; original occurredAt and listening days remain unchanged.

Two tests cover equal/backwards clock, stale snapshots in both merge orders, repeat merge,
JSON reload, saved state/counts/day preservation, failed write and retry. They were added
but NOT EXECUTED: the command approval reviewer twice returned `Selected model is at
capacity` before process creation. The second request used --no-pub after source inspection.
No alternative execution path was used to bypass that rejection. There is no live test job
to wait on and no RED/PASS log from these attempts. This is not a Flutter test failure.

Continuation supersedes the pending status: targeted2 PASS
(/private/tmp/in-c-reaction-revision-check.log), full573 PASS
(/private/tmp/in-c-reaction-revision-full.log), analyze PASS
(/private/tmp/in-c-reaction-revision-analyze.log) and Dart format PASS.
No runtime RED was observed; diagnosis began with code inspection. This verifies local
merge/retry contracts, not remote sync or device behavior. Required39 counts are unchanged.
Reproduction commands from the isolated app directory:

```sh
dart format lib/classical_discovery_controller.dart test/classical_expanded_v1_test.dart
flutter test --no-pub test/classical_expanded_v1_test.dart --plain-name 'reaction correction survives stale merge'
flutter test --no-pub
flutter analyze --no-pub
git diff --check
```

Then continue K01/A04 content/timing and actual user/device verification. No commit/push/
merge/deploy or identity change. This turn made code/test progress; it is not the third
consecutive no-progress blocked turn and the whole goal is not marked blocked or complete.

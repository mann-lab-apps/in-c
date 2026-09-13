# Expanded V1 Execution Evidence

Date: 2026-09-13. Goal remains incomplete. The user resumed the full expanded scope after the earlier pause. See the resumed execution section for current changes and evidence.
Repository: main, 77 commits behind cached origin/main. No fetch/integration/commit/push/deployment performed.
Unrelated Chromatics, site and quiz changes preserved.
Acceptance source: [expanded queue](../product/in-c-expanded-v1-work-queue.md), original expansion A-I plus current audit request.

## Reproduced Gaps And Repairs

| IDs | Failure / repair | Evidence boundary |
| --- | --- | --- |
| A01,A02 | Intake/load could repick; saved/recovery reused works. Pin per date and exclude recent 14 picks. | Restart, missed-day and saved/unsure tests; not human quality. |
| A03,F02 | Mere daily opens unlocked surprise. Require three confirmed completions and no recent unsure. | Seven-day scenarios; actual desirability is not inferred from pickType. |
| A03,F01 | Independent first-three metadata checks rejected Debussy-to-Bach/Bolero as an unsupported close match. Require shared composer/instrumentation/mood, not a related-ID exemption; sparse catalogs honestly use open_start. | Failure in `in-c-independent-bridge.log` and intermediate `in-c-independent-bridge-green.log`; final corrected regression passes. Labels are not human judgments. |
| A04,E01 | Onboarding preview still claimed an unknown song was a musical starting-point; Next Three inferred techniques from era alone. Explicit no-match copy and selected work prompts now replace those claims. | `in-c-unknown-preview-red.log`; unknown-preview and next-three regression tests. |
| B02,E01 | Founder input capped at eight and unknown song names given invented axes. Cap 24; retain unknown input without inferred musical traits. | Founder11, unknown input and other composer profile tests. |
| C01,C02 | Automatic labels looked like founder approval. Separate rules, simulation and observed responses. | Default NOT_VERIFIED; negative fixture response remains NO. Fixtures are not real users. |
| C03,C04 | No real response entry; repeated observations could inflate counts or become complaint blockers. Add explicit unanswered forms, latest-per-tester handling and distinct preview-distance snapshot. | Full widget choose/note/submit test now passes without completing listening. No real founder/user responses supplied. |
| D01,D02,H02 | Click/save/like on first visit could claim familiarity; legacy click completion persisted. Require distinct confirmed dates; preserve legacy timestamp but not its unproven completion status. | `/private/tmp/in-c-legacy-completion-red.log` failed as intended; regression passes in full suite. |
| D03,L01 | Trimmed events lost continuity; failed/corrupt writes silently looked successful. Persist confirmed days, serialize writes, reject malformed state, preserve backup, expose retry. | `/private/tmp/in-c-continuity-red.log` exposed discrepancy; corrected test separates arbitrary-work continuity from pinned Daily completion. Native preferences reload also tested. |
| L02 | Stale merge resurrected unsaved concerts, lost confirmed Daily completion and newer preview-route edits; equal-clock preferences depended on merge direction. Preserve pinned creation/completion, per-concert save revisions, updated route revisions and deterministic tie policies. | `in-c-daily-merge-red.log`, `in-c-route-merge-red.log`, `in-c-concert-unsave-red.log`, `in-c-merge-tie-red.log`; both-direction/reload tests pass. No actual remote service is wired. |
| L02 | Merge could evict observed feedback with 400 recent page views. Use the same 100-observation/200-routine policy as local writes. | Independent bounded-retention merge regression. |
| L03 | Empty catalog crashed Today; unreviewed or missing-moment-only pools could be used as fallback. Guard the UI and recommendations while retaining stored history and Works/Ops access. | `in-c-empty-catalog-red.log` reproduced screen failure; `in-c-empty-catalog-green.log` passes all three invalid-pool fixtures. |
| G01-G03 | Native tap had no Dart handler; overlapping enable/disable could revive an old request. Add consume-once callback/navigation and serialized mutations. | Delayed gateway and widget route tests; bridge status on simulator. Not notification delivery. |
| G04,G05 | Repeating payload pointed to stale day's work; scheduled copy did not follow reactions. Use current-day route and refresh enabled request on relevant state changes. | `/private/tmp/in-c-reminder-copy-red.log` reproduced stale body; `in-c-reminder-copy-green.log` passed. Delivered copy still unverified. |
| H01 | Host-only direct validation admitted home/search/unapproved links. Require supported provider routes and approved status; safe search remains fallback. | Structured policy and launch-mode tests. No claims of actual provider audio. |
| I01,I02 | Guide overflowed 320px/large text; operations appeared in public build. Scrollable sheet and release-only Ops guard. Native screenshot exposed duplicated Melon search label; canonical provider labels repair it. | 320/390 at 1.6, iOS tap-target/semantic-label guidelines, Tab/Enter/Escape smoke pass. `in-c-platform-label-red.log` fails and `in-c-platform-label-green.log` passes. VoiceOver not tested. |
| P01 | Docs claimed in-app policy but no actual entry existed. Add My Music notice with current local-only behavior. | Public navigation and 320px widget test; native screenshot added to integration. Legal adequacy not claimed. |
| P02 | Seed example concerts looked like live inventory. Mark demonstrations, label them, disable booking and fail production gate. | Detail no-ticket smoke and disclosure regressions. Real production inventory remains GAP. |
| K01 | Generic 0-30 offsets looked recording-specific; some prompts overclaimed facts. Hide exact offsets without evidence and review source/wording. | [Per-work review](../research/in-c-founder-30-content-review.md). All 30 recording playback/time windows NOT_VERIFIED. |

## Before Pause Commands (Historical)

Working directory for Flutter commands: `apps/in_c_sheet`.

| Command | Result | Evidence |
| --- | --- | --- |
| dart format (20 changed/new Dart files) | PASS | 20 processed; unrelated code not formatted |
| flutter test test/classical_expanded_v1_test.dart | PASS, 53 tests | `/private/tmp/in-c-expanded-v1-extra-final.log` |
| flutter test test/classical_discovery_controller_test.dart | PASS, 108 tests | `/private/tmp/in-c-expanded-v1-controller-final.log` |
| flutter test | PASS, 439 tests | `/private/tmp/in-c-expanded-v1-full-final.log`; includes Clef regressions |
| flutter analyze | PASS | `/private/tmp/in-c-expanded-v1-analyze-final.log` |
| git diff --check | PASS | executed at repo root after code/docs edits |
| flutter build ios --no-codesign --no-pub --dart-define=IN_C_DISCOVERY_HOME=true | PASS, latest merge/label changes | `/private/tmp/in-c-expanded-v1-ios-build-final.log`; 26.1 MB `build/ios/iphoneos/Runner.app` |
| flutter drive --driver=test_driver/integration_test.dart --target=integration_test/in_c_expanded_flow_test.dart -d ED983B55-4889-4E12-928C-BCDFC1890F2E --no-pub --dart-define=IN_C_DISCOVERY_HOME=true | PASS, latest merge/label code and privacy capture | `/private/tmp/in-c-expanded-v1-ios-integration-final.log` |

The earlier full run failed on missing imports while the observation UI was being connected.
It was repaired and replaced by the successful full run above. Historical 334/339/417/422 counts do not describe the latest state.
No-codesign output is not an installable signed iPhone release or TestFlight submission.

## Native And Visual Evidence

- Simulator: iPhone 17 Pro, `ED983B55-4889-4E12-928C-BCDFC1890F2E`.
- Bundle currently built: `com.mannlab.inc.clef`; display/app entry is in C with `IN_C_DISCOVERY_HOME=true`.
- Actual native run: intake, Daily guide, reaction, Work Detail, save, My Music, privacy sheet and isolated SharedPreferences reload.
- Native notification `permissionStatus` returns a supported response. It does not establish permission granted, scheduled delivery or tap success.
- Host captures: `/private/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/in-c-expanded-v1-ui/`.
- Daily, guide, map and privacy screenshots inspected: nonblank, primary actions visible, first-session revisited/personal repertoire counts remain zero; no overlapping text observed. Latest native capture confirms repaired `Melon에서 검색` label and readable privacy notice.
- No actual audio playback, physical MIDI/other product testing, real founder responses or five-user observations performed.

## Current Judgments

| Judgment | Result | Missing evidence |
| --- | --- | --- |
| Whole expanded implementation complete | NO | Remaining queue work, independent scenarios, accessibility, merge/data-control and source audits |
| Recommendation quality confirmed | NOT_VERIFIED | Founder intent and distance responses; real listening and five-user behavior |
| Actual physical-device verification complete | NO | Permission/denial/delivery/tap/timezone, signed installation, external playback |
| Public V1 approval | NO | All above plus production content/legal/store decisions |

## Previous Pause (Historical)

User instruction at closeout: finish only work already in progress, then stop. Do not automatically start the tasks below until the user resumes.

Last completed new rows: C04 distance form submission, L03 empty/damaged catalog flow. Required rows 35: DONE 8, IN_PROGRESS 25, NOT_VERIFIED 2 (all other states zero).
Additional L02 work: deterministic ties, confirmed Daily/route and concert deletion merge, bounded observed feedback. Live sync remains unimplemented; it is not required by original A-I and must not be represented as working.
Next engineering case: A03 stored Daily whose work is removed or put back into review; retain valid same-day pins but never expose revoked content. L02 duplicate-ID immutable-record conflict audit also remains.
K01 source/recording review can proceed independently when resumed. Missing user responses do not block those tasks, but the user's present stop request does.
Do not mark the goal complete for this checkpoint, test count, or a tidy work queue.

Suggested first resumption: `git status --short --branch`, then inspect A03 and add a failing catalog-revision test in `test/classical_expanded_v1_test.dart`. After implementing that case, run `flutter test test/classical_expanded_v1_test.dart`, the requested controller test, full tests and analyze. The current tree is deliberately not committed or merged.

## Resumed Execution

- Full A-I plus follow-up goal registered because the goal tool returned no active goal; no scope reduction.
- A03: four red regressions (removed work, unreviewed work, invalid time and missing moment) now pass. A valid same-day pick remains pinned. Invalid picks get a monotonic catalogRevision, replacementReason and replacedWorkId; older snapshots cannot resurrect them. Prior reactions and confirmed listening days survive. Empty candidate pools show unavailable UI and preserve history; recovery, notification entry, explanation notice, reload and next-day behavior are tested.
- L02: conflicting immutable input/reflection IDs previously depended on merge order. Canonical deterministic winners, deterministic equal-clock ordering and common bounds now match local writes: intake24/reactions80/Daily30/routes20/reflections80. Events retain the existing separate100-observation/200-routine limits. Conflicted event IDs get mergeConflict=true and cannot count as human/preview evidence; no simulation is upgraded. Same-clock intake/reflection/route creation now has random ID suffixes. Existing concert deletion tests still apply; no remote backend is connected.
- E03: independent strings-profile week test failed on day1 because `비발디 봄` did not identify Spring. Reproduced in `/private/tmp/in-c-resume-compound-intake-red.log`; combined composer/title matching and composer-only safety now pass. Four targeted tests are green in `/private/tmp/in-c-resume-intake-firstweek-green.log`. First-week assertions compare actual input/previously-liked work metadata, not the recommender's labels; they are not subjective evaluations.
- G06: first native attempt had no booted device; after boot, the diagnostic method was excluded by undefined Swift DEBUG. Made the read-only inspection simulator-only. Actual pending request inspection then exposed an empty list after apparent scheduling success. Current simulator authorization is not-determined. Native scheduling now rejects unauthorized calls with permission_denied. Authorized replacement/cancel test is explicitly SKIP until permission is granted; the integration runner's overall success must not be read as scheduling/delivery approval.
- K01: every first30 row now has an inspected official work-note/catalogue source. This does not settle Swan Lake exact scene, all score-level claims or any recording/time window. No URL was promoted to direct/preview based on this source pass.

Current full suite after E03:451 PASS. Do not substitute historical439 or intermediate447. Logs use `/private/tmp/in-c-resume-*.log`.

Native scheduler references: [Apple pending requests API](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/getpendingnotificationrequests%28completionhandler%3A%29), [Apple permission guide](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications?changes=_4), checked2026-09-13. Pending state, authorization, delivery, tap and human listening are distinct evidence.

Required rows37: DONE9 / IN_PROGRESS26 / NOT_VERIFIED2. E03 and G06 were newly discovered within existing required input/notification workflows. E03 is engineering DONE, not recommendation satisfaction. Physical device, actual hearing and actual founder/five-user results remain NOT_VERIFIED. No whole-goal completion or public approval.

### Intermediate Resume Verification

| Check | Current result | Evidence |
| --- | --- | --- |
| Changed Dart format | PASS,8 files,0 outstanding changes | format --output=none --set-exit-if-changed |
| Controller tests | PASS108 | `/private/tmp/in-c-resume-controller.log` |
| Expanded tests before subsequent content changes | PASS65 | `/private/tmp/in-c-resume-expanded.log` |
| Full Flutter suite including Clef | PASS451 | `/private/tmp/in-c-resume-full.log` |
| Flutter analyze | PASS,no issues | `/private/tmp/in-c-resume-analyze.log`; earlier4 then1 style issues fixed |
| iOS no-codesign release build | PASS,26.1MB | `/private/tmp/in-c-resume-ios-build.log`; same com.mannlab.inc.clef identity |
| Native unauthorized scheduling | PASS,not-determined -> permission_denied | `/private/tmp/in-c-resume-ios-integration.log` |
| Authorized pending replacement/cancel/local-zone inspection | SKIP / NOT_VERIFIED | Simulator permission not granted; no reset or fabricated grant |
| Native guide/reaction/detail/save/map/policy/reload | PASS | Same integration log, actual native isolated preferences |
| Actual delivery, physical tap, VoiceOver, audio, founder/5-user responses | NOT_VERIFIED | Need device/user/recording evidence |

Latest native screenshots are in the same `in-c-expanded-v1-ui` host directory above.
Daily and map captures inspected after the resumed native run: text is legible, actions remain
visible, map shows opened5/revisited0/personal0 for that fixture. These are synthetic test actions,
not five paths actually heard by a user. A subsequent app-container lookup failed; its cause
was not established. Host screenshots are the retained visual evidence.

### Next Execution

1. K01/A04: Swan Lake is now explicitly Act II No.10 using BSO's work note; finish other score-level cues, then select and verify30 recording windows. Source notes and safe searches do not satisfy this requirement.
2. G04/G06: authorize notifications in the simulator/device, then rerun the native integration target with `--dart-define=IN_C_SIMULATOR_QA=true`; separately observe delivery/tap/timezone and VoiceOver on a real device.
3. H01/H02: real provider opening/return and audio availability, with the actual approved content; current launches are covered by local contract tests, not hearing.
4. C03: actual founder and five-user observations, still NOT_VERIFIED. No synthetic events may close this gate.
5. Reaudit remaining IN_PROGRESS rows against original A-I; no complete-on-empty-queue rule. Preserve unrelated edits and do not commit/push/merge/deploy.

Resume commands: `git status --short --branch`, inspect this evidence and the work queue,
then `cd apps/in_c_sheet && flutter test test/classical_expanded_v1_test.dart` before further edits.
Native command: `flutter drive --driver=test_driver/integration_test.dart --target=integration_test/in_c_expanded_flow_test.dart -d ED983B55-4889-4E12-928C-BCDFC1890F2E --no-pub --dart-define=IN_C_DISCOVERY_HOME=true --dart-define=IN_C_SIMULATOR_QA=true`.

## Latest Checkpoint: User-Requested Pause

The user requested stopping after the current work. No new tasks started after that request.
All started test/build sessions completed. This is a pause, not whole-goal completion.

- L01: reproduced missing primary ignoring a valid backup, wrong-type primary throwing before recovery, corrupt orphan backup being treated as a first launch, and invalid new snapshots overwriting history. Recovered backups retain a warning; candidates validate before any backup rotation or write. Raw failed-recovery values are preserved.
- L02: reproduced different final reactions from three-way merge ordering. Unioned listening days no longer influence revision tie-breaking; the days themselves remain unioned.
- E03/B02: generic/different Chopin nocturnes no longer imply Op.9 No.2. Exact title/opus remains supported. Numeric nickname boundaries reject symphony90/concerto20; oversized numeric input no longer throws.
- K01: explicit Swan Lake Act II No.10 and oboe guide supported by BSO; unsupported Brahms slow-opening claim removed. All30 actual recording/window approvals remain NOT_VERIFIED.
- Red evidence: `/private/tmp/in-c-resume-backup-red.log` (5 actual failures), `/private/tmp/in-c-resume-content-red.log`, `/private/tmp/in-c-resume-intake-number-red.log`, `/private/tmp/in-c-resume-number-boundary-red.log`.
- Intermediate expanded run exposed a test link-type typo (`search` vs actual `listen_search`); corrected. Initial opus guard also rejected an exact existing title; exact-title handling restored and independently tested. No failed intermediate result is counted as final PASS.

| Check | Latest result | Evidence |
| --- | --- | --- |
| Full Flutter suite including Clef/controller/expanded cases | PASS459 | `/private/tmp/in-c-resume-final-full.log` |
| Standalone controller run before final intake refinement | PASS108; current controller cases also pass in full459 | `/private/tmp/in-c-resume-final-controller.log` |
| Numeric/ambiguous intake plus independent bridge targets | PASS3 | `/private/tmp/in-c-resume-number-boundary-green.log` |
| Static analysis after final implementation | PASS | `/private/tmp/in-c-resume-final-analyze.log` |
| iOS no-codesign build after final implementation | PASS26.1MB | `/private/tmp/in-c-resume-final-ios-build.log` |
| Native isolated backup recovery, unauthorized rejection, primary screen/reload flow | PASS; before final intake refinement | `/private/tmp/in-c-resume-final-ios-integration.log` |
| Native authorized scheduling/replace/cancel | SKIP / NOT_VERIFIED | Actual simulator authorization remains not-determined |
| Physical delivery/tap, VoiceOver, actual audio, founder/five-user results | NOT_VERIFIED | Not inferred from runner exit or build |

Required37: DONE9 / IN_PROGRESS26 / NOT_VERIFIED2. No claim of implementation completion,
recommendation satisfaction, physical-device completion or public release approval.
No commits, pushes, merges, deployment or identity changes. Reopen this checkpoint and queue
before next work; first remaining tasks are K01/A04 content and G04/G06 authorized-device evidence.

## Subsequent General Continuation

User resumed after the checkpoint. Goal tool returned `usageLimited`; it was neither replaced
nor marked active/complete. Ordinary execution proceeded within the user's request.

- Baseline expanded73 PASS: `/private/tmp/in-c-resume2-baseline.log`.
- E03/B02 RED: a one-letter input became an asserted Scarlatti favorite (`in-c-resume2-intake-red.log`). Broad substring search is now separate from automatic taste confirmation. A single exact title/alias/opus, optionally combined with the composer, is required. Latin composer names respect word boundaries; original text is preserved. Vivaldi Spring's short titles are explicit aliases. An intermediate target failed when strict matching exposed the missing alias; the alias correction restored all existing compound-input targets.
- G05 RED: first-day reminder claimed a missed yesterday (`in-c-resume2-reminder-red.log`). The return message now needs a pick before today, uses calendar dates for yesterday, and avoids a relative-day claim in recurring copy. This tests message selection, not delivered notification text.
- Controller108 + expanded75 PASS together: `/private/tmp/in-c-resume2-targeted.log`.
- Full461 PASS including Clef: `/private/tmp/in-c-resume2-full.log`.
- Analyze PASS: `/private/tmp/in-c-resume2-analyze.log`.
- iOS no-codesign build PASS,26.1MB, with `IN_C_DISCOVERY_HOME=true`: `/private/tmp/in-c-resume2-ios-build.log`. This is build evidence only, not a fresh installed-flow, notification or audio verification. App identity was unchanged.
- Changed Dart format PASS; `git diff --check` PASS after continuation documentation updates.
- K01: [LA Phil K545](https://www.laphil.com/works/sonata-in-c-k-545), [LA Phil Rachmaninoff Op18](https://www.laphil.com/works/piano-concerto-no-2-in-c-minor-op-18), and [BSO Op18](https://www.bso.org/works/piano-concerto-no-2-6) inspected again. These notes do not verify selected recording windows. Henle critical-commentary fetch failed; no score-image inspection or new direct/preview approval claimed.

Remaining: first30 recording/score-window review, authorized iOS pending/delivery/tap and
VoiceOver, actual founder/five-user response, old inferred-profile correction policy and remaining
Required-row audit. Existing stored inputs have not been silently rewritten by the new matcher.
Implementation completion NO; recommendation quality NOT_VERIFIED; physical device verification
NOT_VERIFIED; public release approval NO. No commit/push/merge/deploy/identity changes.

## Goal Execution: E04 Legacy Taste Correction

Latest goal lookup returned null. Full remaining A-I/follow-up scope was registered as active,
not narrowed to this slice and not marked complete. Dirty main/unrelated changes preserved.

- E04 contract: inspect raw input/current association, select a work or explicitly unlink;
  preserve source text, saved works, reactions and daily history; reopen/merge without restoring
  the rejected association. New automatic vs explicit vs legacy origin is recorded separately.
- `matchOrigin` defaults to legacy for older payloads. No old record is automatically rewritten.
  Per-item updatedAt increases even with a fixed/backward clock. Unlink remains a record,
  not an absent row. Latest revision wins; equal-time unlink beats a conflicting selection;
  remaining ties use deterministic canonical payload order. Real remote sync is still absent.
- New connections UI: My Music -> music connection review -> search/select or unlink.
  Empty/missing/search-empty/saving/failure states are present. Failed writes remain visible,
  with existing retry semantics. A storage-recovery warning is not silently dismissed.
- Valid same-day music stays pinned; later taste corrections suppress its obsolete rationale.
  Next Three updates immediately; next-day picks use corrected evidence. Raw input retained
  after unlink is not reused as inferred axis/map evidence. Saved/liked works remain independent.
- Initial RED had missing new APIs plus two test API spelling errors, corrected before execution.
  An intermediate assertion incorrectly expected saved-work axes to disappear; repaired to test
  only removed intake weight and independently verify raw-only/no-history unlink.
- Reproduced real equal-time conflict restoring a selection: `/private/tmp/in-c-taste-tie-red.log`.
  Unlink-priority fix passes both orders. Three-way/repeated merges and retry also pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Controller + expanded tests | PASS187 (108+79) | `/private/tmp/in-c-taste-targeted-final.log` |
| Full suite including Clef | PASS465 | `/private/tmp/in-c-taste-full-final.log` |
| Analyze | PASS; two intermediate brace infos repaired | `/private/tmp/in-c-taste-analyze-final.log` |
| iOS no-codesign in C entry | PASS26.1MB, identity unchanged | `/private/tmp/in-c-taste-ios-build.log` |
| Native backup/main flow/connection select-unlink-reload | PASS | `/private/tmp/in-c-taste-native.log` |
| Native authorized pending/delivery/tap | SKIP / NOT_VERIFIED | authorization not-determined; runner exit is not delivery evidence |
| Small screen enlarged text | PASS320px/1.6 | expanded UI interaction test |

Native screenshots inspected: `in-c-taste-connections.png` and
`in-c-taste-connection-editor.png` in the existing host screenshot directory. Text/actions
are visible and nonblank; no overlapping labels observed. Native run preceded the isolated
equal-time merger fix; merge behavior is verified separately by final tests/build. Physical
VoiceOver, actual audio, founder and five-user outcomes remain NOT_VERIFIED.

K01: official NMA K545 p122 image inspected (first four bars, melody above broken-chord
accompaniment). Details and source are in the first30 review. No score image is bundled and
no recording/time window/direct/preview link was approved. Rachmaninoff publisher index was
accessible but the university archive fetch failed; no score-window claim from that attempt.

Required38: DONE10 / IN_PROGRESS26 / NOT_VERIFIED2. Whole implementation NO; subjective
recommendation quality NOT_VERIFIED; physical device completion NO; public approval NO.
Next: K01 remaining score/recording windows; L01/P01 local data controls/backup policy audit;
G04/G06 authorized device evidence. Start with the queue/current diff, then relevant failure
fixtures. No commits, pushes, merges, deployment or identity changes performed.

### Subsequent L01 Recovery-Message Repair

After E04, the independent store audit found that a successful save retained the prior backup
recovery warning. This could keep the connection editor reporting failure after a good write.
RED: `/private/tmp/in-c-recovery-warning-red.log`. Clear the warning only after the primary
write succeeds; validation/backup/primary write failures leave the warning intact.

- Full466 PASS: `/private/tmp/in-c-correction-recovery-full.log` (controller108/expanded80 included).
- Analyze PASS: `/private/tmp/in-c-correction-recovery-analyze.log`.
- Final iOS no-codesign build PASS26.1MB: `/private/tmp/in-c-correction-recovery-build.log`; no identity change or signed distribution.
- Final native backup and connection edit/unlink/reload PASS: `/private/tmp/in-c-correction-recovery-native.log`.
  This rerun includes the equal-time merger fix. Authorized pending/delivery/tap still SKIP at
  not-determined; the log's +5 includes teardown/skip, not five physical-device approvals.
- Format and `git diff --check` PASS. No raw score/audio asset was added to the repository.
- Required status counts unchanged38: DONE10 / IN_PROGRESS26 / NOT_VERIFIED2.

Resume: inspect current queue/diff, then L01/P01 data-control and backup-policy gaps or K01
remaining score/recording review. `cd apps/in_c_sheet` and
`flutter test test/classical_expanded_v1_test.dart` reproduce current regression coverage.
The overall goal remains active/incomplete; no user approval or actual listening was fabricated.

## P03 Data Controls And User-Requested Wrap-Up

- Added My Music personal JSON inspection/copy and destructive confirmation for in C-only deletion.
- Primary/backup and pending erase intent are serialized per storage key, across store instances.
  An interrupted erase finishes before exposing records; malformed markers fail closed. Reset epoch
  prevents old snapshots from restoring pre-deletion data through saving or merging. New records
  after reset continue normally; Clef keys are retained.
- Cancel notification work before erasing, reject concurrent edits and clear pending routes. Real RED
  `/private/tmp/in-c-data-tap-red.log` showed a delayed tap navigating during deletion; generation checks
  now reject it. Partial disk failure blocks editing until retry. Cancellation failure starts no erase.
- Small-screen test initially exposed an off-screen result message; result is now at the top with
  live-region semantics. JSON contains current memory state and a storage-warning field, not an
  assertion that failed saves reached disk. OS/exported/external backups are explicitly excluded.
- Source-tree full476 PASS: `/private/tmp/in-c-before-merge-full.log`. New data-control cases10,
  expanded80 and controller108 are included. Intermediate analyze found ten style infos; repaired
  with scoped Dart fixes before integrated verification.
- Native isolated record control/confirmation/delete/reload PASS: `/private/tmp/in-c-before-merge-native.log`.
  Actual screen captures are `in-c-data-controls`, `in-c-data-erase-confirmation`, `in-c-data-erased`
  in the existing host screenshot directory. Test uses a disabled notification gateway for deletion
  so it cannot cancel a tester's real reminders; actual cancellation ordering is contract-tested.
  Authorized scheduling remains SKIP/not-determined. No actual user data was erased in QA.
- Latest user request: finish current work, push and merge. No new features after that request.
  Entire goal is not complete. Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2.
  Remaining first30 recordings/windows, physical notifications/VoiceOver, actual founder/five-user
  quality and OS/production review stay open. Integration results follow separately.

## Latest Main Integration Verification

- Isolated worktree `/private/tmp/in-c-expanded-v1-closeout-20260913` based on origin/main
  `97325fc`. Applied only in C changes; original dirty worktree and other product changes are
  untouched. Upstream Clef identity/branding and version `1.0.0+20` are preserved.
- Full543 PASS: `/private/tmp/in-c-integrated-full.log`. The increase from source-tree476
  includes upstream Clef tests, not additional in C scope.
- Analyze PASS: `/private/tmp/in-c-integrated-analyze.log`; changed Dart22 files format check
  reports zero changes. Diff check PASS.
- iOS no-codesign build PASS25.9MB with `IN_C_DISCOVERY_HOME=true`:
  `/private/tmp/in-c-integrated-ios-build.log`. Not a signed or distributed artifact.
- Integrated native simulator backup, guide/reaction/map, taste correction and isolated data
  deletion/reload PASS: `/private/tmp/in-c-integrated-native.log` (4 reported passes include
  teardown; one authorized scheduling test SKIP at not-determined). Screen captures are in
  the host `in-c-expanded-v1-ui` directory. After deletion onboarding is offered again; actual
  notification delivery/tap, physical-device accessibility and listening remain NOT_VERIFIED.
- Push/PR/merge is authorized by the user's wrap-up request. CI is recorded separately in
  the PR; no deployment/tag requested. Whole expanded V1 remains incomplete.

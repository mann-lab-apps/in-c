# in C Expanded V1 Work Queue

Audit started: 2026-09-13. Scope: inherited expansion A-I and follow-up acceptance.
Working tree: main, 77 commits behind cached origin/main; unrelated edits preserved.
No commit, push, merge or deployment authorized. Historical PASS is not current evidence.

## Contract

Complete all inherited Required behavior; do not substitute a QA dashboard for product work.
Status: TODO / READY / IN_PROGRESS / BLOCKED / DONE / NOT_VERIFIED.
Each row distinguishes code, automated checks, device checks, and user value.
DONE requires the row's acceptance and evidence, not just a passing global suite.
Original prompt: attachment 921e9b7e-232e-4da3-ba5b-d84397b672fb/pasted-text.txt.
Current user instructions take precedence over historical docs.
No hosted audio, invented provider URLs, or disguised search links. Concert ads follow listening.

## Required Acceptance

I/A/D/U columns mean implementation / automatic verification / device verification / user value.
P = present but not freshly verified; N = NOT_VERIFIED; GAP = observed code gap.
Paths below are relative to apps/in_c_sheet unless they start with docs/.

| ID | Source / user behavior and acceptance | Current implementation / gap | Dependencies | Verification / evidence requirement | Status | I/A/D/U | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Same-day pick survives reactions and reopening; next date refreshes | Pinned on intake/onboarding/load; foreground midnight and restart regression pass | store | controller restart + widget rollover tests | DONE | PASS/PASS/N/N | Observe resume/timezone on iOS |
| A02 | New day avoids recent picks, including saved-unopened and recovery | 14-pick exclusions applied to saved/recovery; 7-day uniqueness and 21-day unreviewed exclusion pass | A01 | 7-day saved/unsure/missed-day scenarios | DONE | PASS/PASS/N/N | Retain missed-day cases in full suite |
| A03 | First 3 close; at most 1 surprise in 7 days; unsure recovers | Three full-week profiles now pass independent input/liked-work bridge assertions and surprise-to-unsure recovery; catalog withdrawals replace a pinned pick with an explained revision, preserving listening history | A02 | first-week tests; four invalid-catalog cases, merge/restart/no-candidate/notification/next-day UI | IN_PROGRESS | PASS/PASS/N/N | Actual perceived distance remains C03/C04; signed-device catalog/notification review remains |
| A04 | Recommendation reason references actual input/action and selected work | Next Three uses selected work prompts, not invented period techniques; unknown intake preview now explicitly acknowledges no match | E01 | next-three prompt assertion; unmatched-preview red/green; per-work review | IN_PROGRESS | PARTIAL/PASS/N/N | Finish first30 score/recording claims; do not equate generic tags with musical quality |
| B01 | Founder likes/avoids and Bach exception honored | Founder fixture remains; automatic sequence is not founder preference approval | A03 | founder full input fixture | NOT_VERIFIED | P/PARTIAL/N/N | Inspect actual sequence and request real response after implementation |
| B02 | Other users do not inherit founder preferences | Explicit composer matches exempt cold-start guard; unknown input no longer claims match | E01 | contrasting profiles and unknown input | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Contrast profiles; remove inferred founder-only song features |
| C01 | 7-day preview shows pick/reason/moment/next path without mutating real history | 7-day preview explicitly SIMULATION; nonmutation test passes | A01 | state equality + simulation labels | DONE | PASS/PASS/N/N | Keep simulation separate from real event evidence |
| C02 | Automatic rule compliance never means founder approval | Rule compliance is separate; founder approval needs an identified observed response and otherwise stays NOT_VERIFIED | none | simulation nonmutation and observed/anonymous/latest-response tests | DONE | PASS/PASS/N/N | Actual founder response remains C03 |
| C03 | Founder willingness and 5-user outcomes recorded honestly | no actual responses supplied | full flow | founder response; 4/5 reason, 3/5 return and map understanding | NOT_VERIFIED | N/N/N/N | Prepare evidence; await actual users after implementation |
| D01 | Map distinguishes opened/revisited/familiar/unfamiliar/next | First-session clicks/save/like cannot claim familiar; two confirmed dates required; revised unsure changes map | A01 | single-session and two-day tests; simulator map capture | IN_PROGRESS | PASS/PASS/PARTIAL/N | Inspect final screenshots and obtain human map comprehension |
| D02 | Daily completion and Work Detail map role survive reopen/edit | Legacy timestamps preserved but not trusted without completionConfirmed or actual evidence; UTC events use local dates | L01 | legacy red/green; reaction correction; native save/reopen | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native final pass and cross-timezone device check |
| E01 | Intake immediately gives specific starting point and Next Three | 24 inputs supported; founder's 11 no longer truncated; unknown songs produce no invented axes/map evidence | none | full founder, unknown and contrasting profiles; native immediate reward | IN_PROGRESS | PASS/PASS/PARTIAL/N | Individual first-impression evidence remains C03 |
| E02 | First experience reaches listening and next path with one primary action | Daily panel removes duplicate title/tag wall and moves CTA upward | A01,H01 | actual widget flow + screenshots | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Native integration screenshot and overflow check |
| F01 | Surprise shares an evidenced axis and expands one direction | Surprise predicate requires strong shared axis plus changed instrumentation/period | A04 | candidates with shared vs unrelated axes | IN_PROGRESS | PASS/PARTIAL/N/N | Independent metadata assertions, not own pick label |
| F02 | Surprise failure returns to close recovery; no reaction is not approval | No action cannot unlock surprise; external clicks no longer completion | A03 | liked/unsure/no-action/missed-day scenarios | IN_PROGRESS | PASS/PARTIAL/N/N | Legacy completion and unsure-after-surprise cases |
| G01 | iOS permission/denied/unsupported/error usable | Permission exceptions handled; denied refresh uses currentPermissionStatus | none | MethodChannel + controller failure tests | IN_PROGRESS | PASS/PARTIAL/N/N | Native bridge and denied-state QA |
| G02 | Time change/cancel/reschedule cannot resurrect stale reminder | Permission/schedule/cancel serialized; delayed enable then disable regression passes | G01 | delayed older success/failure tests | DONE | PASS/PASS/N/N | Native delivery remains G04 |
| G03 | Alert opens intended current pick on warm/cold launch once | Warm/cold payload consume and navigation wired; duplicate/invalid and My Music route tests pass | A01 | gateway/controller/widget tests + iOS taps | IN_PROGRESS | PASS/PASS/N/N | Actual notification tap in iOS |
| G04 | Repeating reminder respects local time and current state | Recurring current-day route and local clock; no stale work payload; reschedule replaces request | G02,G03 | native schedule inspection; timezone and delivery QA | IN_PROGRESS | PASS/PARTIAL/N/N | Timezone, pending request and delivery QA |
| H01 | Preferred verified direct then verified direct then search | Verified direct sorted before safe search; unapproved/host mismatch filtered | none | sorting and actual launcher failures | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Provider path/custom-scheme contract and launcher tests |
| H02 | External return preserves pick and context; events describe click only | External click retained as attempt; no new Daily completion or listening timestamp | A01,D02 | return/failure tests; truthful listening copy | IN_PROGRESS | PARTIAL/PASS/N/N | Audit map/passport and old persisted completion |
| I01 | Public text lacks internal/AI/ranking language and is concise | Ops hidden in release unless explicit build flag; partial copy check no longer claims all screens verified | none | copy scan and all primary screenshots | IN_PROGRESS | PARTIAL/PARTIAL/PARTIAL/N | Remaining public copy and recording-specific source review |
| I02 | Small screen, text scaling, semantics and keyboard access work | 320/390 at 1.6; iOS tap-target/label guidelines; Tab/Enter/Escape guide flow pass; native screenshots inspected | E02,D01 | responsive/guideline/keyboard tests; iOS captures | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native VoiceOver traversal and physical small-screen check remain unverified |
| L01 | Local storage failure cannot silently lose user state | Backup fallback now also handles absent/wrong-type primary; invalid new snapshots are rejected before backup rotation; failed recovery preserves raw values | none | missing/wrong-type primary, corrupt backup, invalid candidate red/green plus existing write/race/native checks | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native rerun for latest backup changes; data controls/OS backup review remain |
| L02 | Unconfigured remote must not pretend sync succeeded; local state remains intact | Same-ID conflicts/bounds/provenance covered; three-way work merge regression found unioned dates changing revision choice, now excluded from tie-break while still unioned | L01 | two/three-way and repeated merge/codec, bounds, concert unsave, observed-vs-simulation conflicts | IN_PROGRESS | PASS/PASS/N/N | Broader data-control/recovery audit remains L01; actual remote absent, never claim sync success |
| P01 | Privacy and sponsored disclosure consistent, ads below listening | Missing in-app notice discovered; My Music policy sheet now states actual local-only use and bounded records | E02 | public navigation/320px policy smoke; disclosure tests | IN_PROGRESS | PASS/PARTIAL/N/N | Legal/store review and data-control audit remain separate |
| K01 | First exposure content individually accurate and links vetted | All30 rows have source notes; Swan Lake now explicitly Act II No.10, unsupported Brahms slow opening removed; remaining score claims and all recordings/windows unapproved | A04 | docs/research/in-c-founder-30-content-review.md; excerpt/guide regression | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Resolve remaining score details and all30 recording windows; official search links are not direct approval |
| R01 | Current code formats, analyzes, tests with Clef regression | Historical439 superseded by resumed checks; current logs and counts are in dated evidence | code tasks | fresh scoped/full commands and logs | IN_PROGRESS | PASS/PARTIAL/N/N | Finish current full/controller/analyze/native verification and record exact results |
| R02 | in C iOS build/install and notification/user flow verified | Native integration passes with screenshot capture and isolated preference reload; delivery not tested | G03,R01 | in C entry define, install/screenshots, notification tap | IN_PROGRESS | PASS/PARTIAL/PARTIAL/N | Final build; actual delivery/tap/signing and identity decision remain |
| R03 | Implementation, recommendation value, device and public release judged separately | Removed hardcoded current build PASS; founder and rules separated in docs/UI | all | whole-table audit with explicit unresolved rows | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Final full Required audit and unresolved evidence summary |
| C04 | Human can judge each preview day's distance without fabricating listens | Explicit unanswered form, exact snapshot and observed_preview marker; actual widget choose/note/submit flow passes without completing Daily | C01 | snapshot mismatch, nonmutation, persistence and form submission smoke | DONE | PASS/PASS/N/N | Actual responses remain C03, not supplied by fixture tests |
| D03 | Map and continuity survive recent log limits | confirmedListenDays and latestReactionType persisted; legacy completion provenance retained; calendar-day arithmetic | D02,L01 | compaction/reload/map/continuity/UTC tests | IN_PROGRESS | PASS/PASS/N/N | DST and timezone native test; remote conflict audit L02 |
| G05 | Scheduled reminder copy follows saved/liked/unsure/corrected state | Interaction refresh uses serialized queue without re-requesting permission; disabled reminders stay disabled | G02 | scheduled-body red/green after unsure, edit, disable | DONE | PASS/PASS/N/N | Actual delivered body belongs to G04 |
| P02 | Seed demonstration concerts cannot impersonate live ticket inventory | All seed concerts explicitly demonstration; labels everywhere and ticket CTAs disabled; release gate excludes demo evidence | P01 | concert detail no-ticket smoke, demo status codec and gate tests | IN_PROGRESS | PASS/PARTIAL/N/N | Audit public demonstration policy and actual production import |
| L03 | Empty/damaged/unreviewed catalog never crashes the Daily screen or fabricates a recommendation | Empty and no-valid-moment pools show unavailable state, preserve history, keep Works/Ops accessible; fallback excludes unreviewed works | L01,K01 | empty/no-moment/unreviewed widget regression and Ops navigation | DONE | PASS/PASS/N/N | Keep stored-pick catalog revision case in A03 follow-up |
| E03 | Natural composer + title input identifies a work; composer-only input must not invent a favorite piece | First-week audit exposed Vivaldi Spring being recognized only as a composer; combined Korean/English/prefix/suffix matching now passes, exact composer remains composer evidence | E01 | reproduced compound-intake failure, corrected four-profile/input tests, full451 and controller108 PASS | DONE | PASS/PASS/N/N | Retain compound-input regressions; subjective recommendation approval remains C03 |
| G06 | Native scheduling cannot claim success without authorization; verify actual pending requests | Actual simulator exposed empty pending queue after reported success; native authorization guard now returns permission_denied; simulator-only readback added | G01,G04 | native unauthorized test PASS at not-determined; authorized replace/cancel SKIP | IN_PROGRESS | PASS/PARTIAL/PARTIAL/N | Authorize simulator/device and rerun explicit IN_C_SIMULATOR_QA branch; do not count skip as success |
| E04 | Review and correct/unlink legacy taste associations without losing raw input or listening history | My Music connection list/editor, provenance and monotonic per-item revision; equal-time unlink wins; corrected same-day pick retains music but withdraws old rationale | E03,L02 | legacy fixture, explicit selection/unlink, stale/tied/three-way merge, failed-write retry, next-day behavior, 320px/1.6 UI and native reload | DONE | PASS/PASS/PARTIAL/N | Physical usability/user trust remains C03/I02; no silent legacy rewrite |
| P03 | Inspect/copy personal records and explicitly erase in C data without Clef damage or backup resurrection | JSON surface, confirmation, cancellation-before-erase, persisted erase intent, per-key serialization and reset epoch; late notification navigation rejected | L01,L02,P01 | 10 data-control tests, 320px/1.6 confirmation/cancel, native isolated deletion/reload, previous-snapshot merge | DONE | PASS/PASS/PARTIAL/N | OS/external backups and actual notification authorization remain explicit limits |

## Verification Commands

- From app: dart format <changed Dart files>
- flutter test test/classical_discovery_controller_test.dart
- flutter test
- flutter analyze
- From root: git diff --check
- flutter build ios --no-codesign --dart-define=IN_C_DISCOVERY_HOME=true
- Simulator build/install and actual notification tap when available; no-codesign is not device approval.

## Historical Audit Notes

- Initial audit: G03 native invokes dailyPickNotificationOpen; Dart gateway has no method handler.
- Initial audit: C02 automatic labels are derived from pickType and then used to approve themselves.
- Initial audit: L01 SharedPreferences.setString result is ignored; malformed JSON decodes to empty state.
- Current scoped evidence: /private/tmp/in-c-expanded-v1-targeted.log (125 PASS).
- Added regression evidence: /private/tmp/in-c-expanded-v1-additional.log (20 PASS before later store checks).
- Full suite first run: /private/tmp/in-c-expanded-v1-tests.log, one outdated build-PASS assertion failed; fixed, full rerun required.
- iOS intermediate simulator and no-codesign build PASS; installed com.mannlab.inc.clef with IN_C_DISCOVERY_HOME=true.
- Screenshot: /private/tmp/in-c-expanded-v1-first-launch.png, actual simulator onboarding, not notification or playback evidence.
- Historical native integration log: /private/tmp/in-c-expanded-v1-ios-integration.log; superseded by current evidence below.
- Content export: /private/tmp/in-c-founder-content-review.json (30 rows; source/playback NOT_VERIFIED).
- 300 total works; no verified direct links or approved preview audio. Search coverage is not playback coverage.
- Discovered P02: fixture concerts presented as real listings. Label/no-booking repair and widget verification are now implemented; actual production inventory remains unverified.
- Entire goal remains active. Founder/user willingness, physical device delivery, audio and public release are NOT_VERIFIED.
- Current evidence supersedes the historical intermediate entries above: docs/quality/in-c-expanded-v1-evidence-2026-09-13.md.

## Resume Checkpoint (User-Requested Pause)

- The user has resumed the full goal. The prior stop was a pause, not completion. No active goal was returned at restart, so the entire remaining A-I/follow-up objective was registered again.
- Required rows: 37. DONE 9, IN_PROGRESS 26, NOT_VERIFIED 2; TODO/READY/BLOCKED 0. DONE is scoped engineering acceptance, not product/user approval.
- Last completed new row: E03. C04 form submission and keyboard/guideline checks now verified automatically.
- A03 catalog withdrawal and L02 immutable conflicts/bounds implemented and covered. Stable valid pins remain untouched; replacement notices appear on Today and notification entry. No sync-service success claimed.
- E03 was discovered by the independent first-week audit, not by the recommender's own close label. Input matching is repaired; actual musical appeal remains unverified.
- G06 adds actual native evidence: not-determined authorization rejects scheduling. Authorized pending replacement/cancel/timezone behavior remains SKIP, not PASS.
- K01: Swan Lake excerpt resolved and Brahms unsupported opening fixed; remaining score details, then all30 recording/time windows. No audio playback or founder response has been observed.
- Actual implementation / subjective quality / physical-device QA / public release remain separate judgments; see current evidence report.

Historical user instruction: stop after current work. Those tests/builds finished; no new task started
after that request. Whole goal remains unfulfilled; the goal tool was not marked complete.
L01 backup and L02 three-way merge fixes plus E03 ambiguous/numeric input corrections are included
in full459 PASS/analyze PASS/iOS build PASS. Native backup and primary flow PASS; authorized
notification branch SKIP. Exact logs and next commands are in the dated evidence checkpoint.

## Latest General Continuation

The user requested resuming. The existing goal tool reports `usageLimited`, not active;
no replacement goal or status override was attempted. Work in this turn uses ordinary execution.
E03/B02 now separate broad search from taste assertions: full title/alias/opus must identify one
work, composer names cannot be mere input fragments or embedded Latin-name substrings.
Vivaldi Spring's established short titles are explicit aliases; search remains fuzzy.
G05 now distinguishes a new user's first day from a genuine return after an earlier pick.
The repeating invitation no longer uses a stale relative-day claim. Required counts remain37:
DONE9 / IN_PROGRESS26 / NOT_VERIFIED2. These fixes do not certify recommendation satisfaction.
Current run evidence is appended to the dated evidence document. Previously stored inferred
matches are preserved, not silently reinterpreted; a user-visible correction/migration policy
is a remaining E03/B02 audit item before old-profile recommendation quality can be certified.

## Latest Goal Execution: Taste Corrections

The current goal lookup returned no goal, not usageLimited. The full remaining scope was
registered as active at the user's request; the previous general-continuation note is historical.
E04 resolves the user-visible old-match correction gap. Legacy origins remain unknown until
the user reviews them; new automatic matches and explicit selections are distinguished.
Unlink retains raw text but removes its inferred work/composer/axis evidence, not saved works
or actual reactions. Corrections do not change the valid same-day piece; its obsolete rationale
is replaced by an explicit correction notice. Next Three and future Daily picks use current data.

Required38: DONE10 / IN_PROGRESS26 / NOT_VERIFIED2; TODO/READY/BLOCKED0.
Current verification: controller108 + expanded79 =187 PASS; full465 PASS; analyze PASS;
iOS no-codesign build PASS. Native connection edit/unlink/reload and screenshots PASS;
authorized notification test SKIP at not-determined. K545 opening score inspected, but no
recording/window or user satisfaction approval. See dated evidence for logs and next tasks.

Subsequent L01 audit repaired a stale backup-recovery warning after successful save. Full466,
analyze and final native backup/connection flows PASS; authorized notification verification
remains SKIP. Counts unchanged38. Remaining local data-control/OS-backup policy review is not
closed by this warning fix. No complete-goal or release approval claim.

## User-Requested Wrap-Up And Merge

The user requested finishing current work and push/merge; no further feature scope is started.
P03 and its late-notification/deletion race are finished, not the whole expanded V1.
Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2. Current source-tree full476 PASS;
native isolated data-control/delete/reload PASS; authorized notification branch SKIP.
In C changes will be integrated separately from unrelated dirty Chromatics/site/quiz edits.
Commit/push/merge is now authorized; deployment and identity changes are not requested.

Latest-main isolated integration: full543 PASS (includes upstream Clef coverage), analyze and
changed Dart format/diff checks PASS; iOS no-codesign25.9MB and native isolated UI flow PASS.
Authorized notification scheduling/delivery remains SKIP, not approval. Counts unchanged39.
See dated evidence's Latest Main Integration Verification section. No new feature work added.

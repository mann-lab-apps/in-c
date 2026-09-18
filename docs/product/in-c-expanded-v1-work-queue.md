# in C Expanded V1 Work Queue

Audit started: 2026-09-13. Scope: inherited expansion A-I and follow-up acceptance.
Current audit: 2026-09-15, origin/main 9d44696 includes PR #758/8eef6a8 and 38fb38f.
Worktree: `/private/tmp/in-c-expanded-v1-20260915`, branch
`feature/in-c-expanded-v1-followup-20260915`. The old temporary worktree is absent;
the original dirty repository and all other product changes are untouched.
This continuation does NOT authorize commit, push, merge, deployment or identity changes.
Historical permissions and test counts below do not override this execution.
Historical PASS is not current evidence. The expanded V1 objective is not complete.

## Contract

### TestFlight Milestone Freeze: 2026-09-15

Feature expansion is paused by the user, not completed. The active sub-milestone is
[founder TestFlight preparation](../releases/in-c-testflight-internal-test-candidate.md).
Required39 stays DONE12 / IN_PROGRESS25 / NOT_VERIFIED2; no human/device acceptance is inferred.
H01/L01 follow-up: provider launch no longer awaits serialized event disk persistence.
Three added regressions cover delayed write, logging failure and Work Detail retained-event retry;
link7/full1135/analyze/format11/native10 PASS. This does not claim actual provider playback or
physical installation. Latest diagnostic archive retains the blocked Clef identity.
A02/B02 repair: first-three founder simulation exposed Beethoven-only concentration; Daily
selection now rotates among eligible explicitly supplied composers outside the last two picks,
without changing pins, exclusions or sparse grounded fallback. RED/GREEN and full1132 PASS.
R02 remains blocked for deployment: actual archive and sibling Clef share
`com.mannlab.inc.clefandstaff`, name Clef & Staff, project/export profile Clef And Staff.
Valid certificates exist, but separate in C identity/profile/build-number approval is pending.
K01/H01 remain open: first listening candidates have source/recording metadata, not verified
Korean-region playback, hearing or windows. Do not replace this with a fabricated direct URL.
Next milestone actions: identity decision, approved isolated product configuration, actual
first-recording review, signed artifact inspection, then separately authorized upload/install.
New modes and broader queue expansion wait; first-use blockers/hotfixes only.

### First-Listen Issue Loop: 2026-09-18

This continuation rebuilds the interrupted first-listen evidence on a fresh worktree from
`origin/main`. It does not claim founder satisfaction, actual hearing, device QA or Public V1
readiness. FL rows are scoped to evaluating whether the founder can judge the first Daily Pick
experience honestly, with direct/preview/search evidence kept separate.

| Issue ID | Area | User problem | Current evidence | Required outcome | Status | Priority | Next action | Verification | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FL-013 | First-listen evidence | Raw preferred option IDs are hard to read in Catalog Ops | `firstListenPreferredOptionLabel` maps saved option IDs to human-readable labels | Ops summary shows decision, preferred option ID and label without treating it as satisfaction | DONE | P1 | Preserve labels when option copy changes | controller/widget tests | Founder actual response remains NOT_VERIFIED |
| FL-014 | First-listen feedback parity | Catalog Ops founder observation did not force the same preferred-option evidence as public feedback | `first_listen_founder` now requires founder tester ID; Catalog Ops and public feedback store `feedbackSurface`, first3/comparison IDs, question/option schema and `preferredFirstListenOption` | Both surfaces save the same evidence schema and snapshot/export expose it | DONE | P1 | Use these rows to collect real founder response, not simulated approval | controller/widget tests; dated evidence | No direct/preview/timing approval created |
| FL-015 | First-listen candidate review | Founder cannot easily compare safe first3 against stronger discovery options or see link friction | Catalog Ops shows first3 and comparison candidates with role, work, guide and listening path status | Search fallback is visibly not direct/approved playback; stronger candidates are review choices, not hidden ranking overrides | DONE | P1 | Use panel for actual founder review and then decide content/recommendation changes | widget test; dated evidence | Does not approve recordings, windows or provider playback |
| FL-016 | First-listen reaction impact | Founder cannot see whether a first reaction would change tomorrow's recommendation without inflating the listening map | Catalog Ops computes liked/unsure next-day previews from the real Daily Pick rules in a simulation-only controller | Reaction previews show next work/reason and map counts while leaving user reactions, daily picks and events unchanged | DONE | P1 | Use the preview during founder review; actual satisfaction remains external evidence | controller/widget tests; dated evidence | Link clicks alone still do not count as listening-map progress |
| FL-017 | Next-pick listening friction | Reaction previews showed tomorrow's work/reason but not whether tomorrow's listening path is direct, preview-approved or search fallback | Reaction preview rows now show the same listening path status used by first-listen candidates | Founder can judge both recommendation reason and next-day listening friction without search fallback being disguised as direct playback | DONE | P1 | Use during founder review; unresolved direct/preview approval remains NOT_VERIFIED | widget test; dated evidence | Does not approve or create URLs |
| FL-018 | Copyable first-listen evidence | Ops summary export did not include first-three candidate path status or reaction-impact preview rows | `FounderDailyPickQualitySnapshot.exportText` now includes first-listen candidate path evidence and liked/unsure next-pick simulation rows | Evidence text can be copied without losing search/direct distinction or pretending simulation is founder satisfaction | DONE | P1 | Use export text with actual founder response; keep satisfaction NOT_VERIFIED until supplied | controller test; dated evidence | No URL/timestamp/recording approval created |
| FL-019 | Ops evidence copy action | Evidence/export text was visible but not directly copyable during founder review | Ops summary rows labelled `evidence` or `export` now expose copy buttons that write the exact text to Clipboard | Founder review evidence can be copied without retyping and without dropping path/simulation labels | DONE | P1 | Use copied evidence in review notes; actual response remains external evidence | widget clipboard test; dated evidence | Does not upload/share data automatically |
| FL-020 | First-listen next action | A founder preferred option could be recorded without preserving the concrete follow-up required before promotion | Snapshot/export and Catalog Ops feedback evidence now include `firstListenNextAction` / `preferredFirstListenNextAction` derived from the chosen option and listening path state | A Brahms/BWV578 preference records that direct/preview approval is still required instead of implying recommendation or link approval is done | DONE | P1 | Use next-action text to drive content ops; keep founder satisfaction and URL approval separate | controller/widget tests; dated evidence | Does not approve recordings, windows, URLs or actual listening |
| FL-021 | Visible next-action copy | Public feedback and Catalog Ops forms saved next-action evidence but did not show the consequence of a preferred option before submit | Both first-listen forms now show human-readable next-action copy after a preferred option is selected | Founder can see that a stronger search-fallback candidate still needs direct/preview review before it can be promoted | DONE | P1 | Keep copy aligned with raw next-action evidence | public feedback and Catalog Ops widget tests; dated evidence | Does not approve links or replace actual founder response |
| FL-022 | Candidate-row next-action visibility | The candidate review list showed listening-path status but not what each candidate needs before it can affect the first-listen decision | First-three and comparison candidate rows now show a human-readable next-action line; search-fallback comparison candidates explicitly require direct/preview link review before promotion | Candidate review is actionable without selecting a preferred option first | DONE | P1 | Use row-level next actions during founder review before changing first-listen recommendations | PASS: candidate review widget test, controller suite, full suite, analyze, diff check; dated evidence | Does not approve Brahms/BWV578 links, recordings, windows or founder satisfaction |
| FL-023 | Exported comparison next actions | Copied first-listen evidence included first-three and reaction simulation rows but not next actions for comparison candidates | `FounderDailyPickQualitySnapshot.exportText` now includes each comparison option's path and next action; UI and export share the same comparison candidate IDs | Copied review evidence preserves that Brahms/BWV578-style search-fallback candidates need direct/preview review before promotion | DONE | P1 | Use copied export with founder review notes; do not treat it as approval | controller export test, Ops copy widget test, dated evidence | No link, recording, timing, listening or satisfaction approval is created |
| FL-024 | Ops summary next-action copy | The Daily Pick quality summary displayed the raw `firstListenNextAction` code while other first-listen surfaces showed human-readable guidance | The summary row now renders the same human-readable next-action copy while the copied export still preserves the raw evidence value | Catalog Ops can be read directly during review without losing machine-readable traceability in export | DONE | P1 | Keep summary copy and raw export aligned whenever adding next-action codes | PASS: widget test, analyze, full suite, diff check; dated evidence | Does not change evidence schema or approve founder satisfaction |
| FL-025 | Stored next-action copy | First-listen feedback events stored the raw preferred next-action code but not the human-readable copy that was shown to the reviewer | Public feedback and Catalog Ops observation evidence now store `preferredFirstListenNextActionCopy` alongside the raw `preferredFirstListenNextAction` | Event evidence remains understandable without rehydrating UI copy while preserving the raw code for traceability | DONE | P1 | Keep raw and copy values aligned for all first-listen feedback surfaces | PASS: focused widget tests, controller suite, full suite, analyze, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-026 | Stored preferred path status | First-listen feedback events could preserve the preferred option and next action without freezing the selected option's listening-path status at response time | Public feedback and Catalog Ops observation evidence now store `preferredFirstListenPathStatus` and `preferredFirstListenPathStatusCopy` alongside the preferred option | A Brahms/BWV578 preference remains traceable as search fallback even if catalog links change later | DONE | P1 | Use stored path status when reviewing founder feedback; keep URL approval separate | PASS: focused widget tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-027 | Summary/export preferred path status | Catalog Ops summary/export could show a preferred option and next action without showing the response-time listening path status stored by FL-026 | `FounderDailyPickQualitySnapshot` now exposes `firstListenPreferredPathStatus`, includes it in export text and shows a readable `선택 경로` row in Ops | Reviewer can see whether the preferred option was search fallback without reopening raw event properties | DONE | P1 | Use summary/export path status in review notes; keep recording and URL approval separate | PASS: focused controller/widget tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-028 | Summary/export stored next action | Catalog Ops summary/export recalculated the preferred option's next action from current catalog state even though FL-025 stores the response-time next action | `FounderDailyPickQualitySnapshot` now prefers the stored `preferredFirstListenNextAction` and only falls back to calculation for older/missing evidence | Review notes preserve what action was shown when the founder response was submitted, even if catalog links change later | DONE | P1 | Keep stored next action and path status together during review | PASS: focused controller test, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-029 | Summary/export stored response copy | Summary/export could preserve stored raw preferred path/next-action codes while still rehydrating readable copy from current UI mapping | `FounderDailyPickQualitySnapshot` now exposes stored `preferredFirstListenPathStatusCopy` and `preferredFirstListenNextActionCopy`, export includes both, and Catalog Ops summary uses stored copy when present | Review notes preserve the exact Korean guidance shown when the founder response was submitted | DONE | P1 | Keep stored raw/copy pairs together; use current copy only as fallback for old evidence | PASS: focused controller/widget tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-030 | Controller-level first-listen evidence contract | `recordQualityObservation` could accept a founder first-listen observation without the structured preferred-option/path/next-action evidence if called outside the UI | Controller now rejects `first_listen_founder` observations unless the full evidence schema is present, the surface is known and the preferred option is listed in option IDs/copy | Broken programmatic observations cannot create founder YES/PARTIAL while leaving preferred option/path/action evidence incomplete | DONE | P1 | Keep UI and controller schema in sync when adding fields | PASS: focused controller/Ops/public feedback tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-031 | Controller-level first-listen evidence consistency | A direct controller call could provide all required first-listen fields while mixing a preferred option with mismatched candidate IDs, question schema, path status or next action | Controller now validates the first-three IDs, comparison IDs, question keys/copy, answer options, preferred option IDs, selected path status and selected next action against the current first-listen review contract | Programmatic founder observations cannot preserve internally inconsistent review evidence that would misstate search fallback, direct/preview status or required next action | DONE | P1 | Keep this contract updated if first-listen candidates/questions/options change | PASS: focused controller/Ops/public feedback tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-032 | Controller-level first-listen copy integrity | Programmatic first-listen evidence could keep correct raw path/action codes while storing misleading human-readable copy such as direct-link approval for a search fallback | Controller now validates preferred option copy, selected path-status copy and selected next-action copy against controller-generated evidence copy; UI evidence generation uses the same controller source | Stored review copy cannot contradict raw evidence about search fallback, direct/preview status or required next action | DONE | P1 | Keep copy helpers and UI labels aligned when wording changes | PASS: focused controller/Ops/public feedback/summary tests, controller suite, analyze, full suite, diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |
| FL-033 | Legacy first-listen evidence quarantine | Older/imported `first_listen_founder` events could bypass the stricter write-time contract and still make Catalog Ops summary/export show founder YES with misleading copy | `FounderDailyPickQualitySnapshot` now reads first-listen founder events only after validating the full current evidence contract; malformed legacy events are ignored as NOT_VERIFIED evidence | Broken historical/imported evidence cannot create founder approval, preferred option or direct-link-looking copy in summary/export | DONE | P1 | Keep quarantine aligned with the write-time schema when evidence fields change | PASS: malformed legacy event regression, controller suite, analyze, full suite, diff check; dated evidence | Does not delete legacy events or approve links, recordings, timing, listening or founder satisfaction |
| FL-034 | Latest first-listen evidence freshness | If a newer malformed founder first-listen response exists after an older valid response, summary/export could fall back to the stale older YES | Summary/export now considers only the latest founder first-listen observation, and only if that latest event satisfies the current evidence contract | A broken newest response blocks stale approval and leaves the decision NOT_VERIFIED until valid evidence is resubmitted | DONE | P1 | Preserve this latest-response rule when importing or merging observations | PASS: stale-approval regression, controller suite, analyze, full suite, diff check; dated evidence | Does not delete old responses or approve links, recordings, timing, listening or founder satisfaction |
| FL-035 | First-listen fallback action copy | With no valid founder first-listen evidence, summary/export showed raw `firstListenNextAction=await_founder_response` but left the readable copy as `NOT_VERIFIED` | `FounderDailyPickQualitySnapshot` now derives readable copy from the fallback raw next action when stored copy is absent or quarantined | No-response and malformed-evidence summaries remain NOT_VERIFIED for approval, while still telling the reviewer the next action is to await the actual founder response | DONE | P1 | Keep fallback raw/copy pairs aligned if new action codes are added | PASS: no-response/malformed/stale focused regressions, controller suite, analyze, full suite and diff check; dated evidence | Does not approve links, recordings, timing, listening or founder satisfaction |

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
| A04 | Recommendation reason references actual input/action and selected work | Reasons preserve raw input/composer evidence; legacy false favorite claims withdrawn. BWV578 guide has official source; moment labels use end-start, not end offsets | E01 | reason/legacy snapshot, broad/exact BWV input and 45-75-second duration regressions PASS; native themed fugue detail | IN_PROGRESS | PARTIAL/PASS/PARTIAL/N | Finish first30 score/recording claims and actual perceived recommendation relevance |
| B01 | Founder likes/avoids and Bach exception honored | Explicit composer/opera-vocal exclusions persist without erasing pins/history; actual BWV578 candidate added outside first30; generic Bach fugue input remains composer/form evidence, not a claimed favorite | A03 | exclusion codec/admin/import/recovery, real fugue and different BWV tests; native QA | NOT_VERIFIED | PARTIAL/PASS/PARTIAL/N | Founder response, exact recording/window and whether instrumental opera excerpts are avoided remain open |
| B02 | Other users do not inherit founder preferences | Removed melody-derived Mahler/chorus veto and founder-only context bonus; scores now use supplied work/composer/preferences. Founder demo exclusions stay in simulated state | E01 | contrasting Puccini/melody profiles; demo nonmutation; general fugue versus exact/different BWV tests | IN_PROGRESS | PASS/PASS/PARTIAL/N | Continue independent first-week/human relevance evaluation; no satisfaction inferred from rule PASS |
| C01 | 7-day preview shows pick/reason/moment/next path without mutating real history | 7-day preview explicitly SIMULATION; nonmutation test passes | A01 | state equality + simulation labels | DONE | PASS/PASS/N/N | Keep simulation separate from real event evidence |
| C02 | Automatic rule compliance never means founder approval | Rule compliance is separate; founder approval needs an identified observed response and otherwise stays NOT_VERIFIED | none | simulation nonmutation and observed/anonymous/latest-response tests | DONE | PASS/PASS/N/N | Actual founder response remains C03 |
| C03 | Founder willingness and 5-user outcomes recorded honestly | no actual responses supplied | full flow | founder response; 4/5 reason, 3/5 return and map understanding | NOT_VERIFIED | N/N/N/N | Prepare evidence; await actual users after implementation |
| D01 | Map distinguishes opened/revisited/familiar/unfamiliar/next | First-session clicks/save/like cannot claim familiar; two confirmed dates required; revised unsure changes map. Listening-level pacing now counts distinct confirmed days, not intake/save/click volume | A01 | single-session/two-day map and four pacing-evidence regressions; simulator map capture | IN_PROGRESS | PASS/PASS/PARTIAL/N | Inspect final screenshots and obtain human map comprehension; pacing is not a competence test |
| D02 | Daily completion and Work Detail map role survive reopen/edit | Legacy timestamps preserved but not trusted without completionConfirmed or actual evidence; UTC events use local dates | L01 | legacy red/green; reaction correction; native save/reopen | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native final pass and cross-timezone device check |
| E01 | Intake immediately gives specific starting point and Next Three | 24 inputs supported; founder's 11 no longer truncated; unknown songs produce no invented axes/map evidence | none | full founder, unknown and contrasting profiles; native immediate reward | IN_PROGRESS | PASS/PASS/PARTIAL/N | Individual first-impression evidence remains C03 |
| E02 | First experience reaches listening and next path with one primary action | Daily panel removes duplicate title/tag wall and moves CTA upward | A01,H01 | actual widget flow + screenshots | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Native integration screenshot and overflow check |
| F01 | Surprise shares an evidenced axis and expands one direction | Surprise predicate requires strong shared axis plus changed instrumentation/period | A04 | candidates with shared vs unrelated axes | IN_PROGRESS | PASS/PARTIAL/N/N | Independent metadata assertions, not own pick label |
| F02 | Surprise failure returns to close recovery; no reaction is not approval | No action cannot unlock surprise; external clicks no longer completion | A03 | liked/unsure/no-action/missed-day scenarios | IN_PROGRESS | PASS/PARTIAL/N/N | Legacy completion and unsure-after-surprise cases |
| G01 | iOS permission/denied/unsupported/error usable | Permission exceptions handled; denied refresh uses currentPermissionStatus | none | MethodChannel + controller failure tests | IN_PROGRESS | PASS/PARTIAL/N/N | Native bridge and denied-state QA |
| G02 | Time change/cancel/reschedule cannot resurrect stale reminder | Permission/schedule/cancel serialized; delayed enable then disable regression passes | G01 | delayed older success/failure tests | DONE | PASS/PASS/N/N | Native delivery remains G04 |
| G03 | Alert opens intended current pick on warm/cold launch once | Early delegate registration and Scene notificationResponse forwarding added; native buffer ignores duplicate delivery/dismissal/unrelated alerts and consumes once | A01 | Swift buffer contract tests + existing gateway/controller/widget navigation; OS taps still absent | IN_PROGRESS | PASS/PASS/PARTIAL/N | Actual warm/cold notification tap in iOS; native contract injection is not tap evidence |
| G04 | Repeating reminder respects local time and current state | Calendar replacement/cancel and actual foreground delivery verified under provisional authorization in isolated iOS26.5 simulator | G02,G03 | native log and actual willPresent callback; see 2026-09-14 evidence | IN_PROGRESS | PASS/PASS/PARTIAL/N | Physical/background delivery, timezone travel and real notification taps remain |
| H01 | Preferred verified direct then verified direct then search | Both Today/Work Detail recover failed searches as well as directs; bounded same-provider/YouTube fallback and copy-query escape; leaving screen stops late retry | none | four actual widget/launcher-channel contract tests PASS, including throws and disposal | IN_PROGRESS | PASS/PASS/N/N | Actual provider playback/region availability still unverified |
| H02 | External return preserves pick and context; events describe click only | External click retained as attempt; no new Daily completion or listening timestamp | A01,D02 | return/failure tests; truthful listening copy | IN_PROGRESS | PARTIAL/PASS/N/N | Audit map/passport and old persisted completion |
| I01 | Public text lacks internal/AI/ranking language and is concise | Ops hidden in release unless explicit build flag; partial copy check no longer claims all screens verified | none | copy scan and all primary screenshots | IN_PROGRESS | PARTIAL/PARTIAL/PARTIAL/N | Remaining public copy and recording-specific source review |
| I02 | Small screen, text scaling, semantics and keyboard access work | 320/390 at 1.6; iOS tap-target/label guidelines; Tab/Enter/Escape guide flow pass; native screenshots inspected | E02,D01 | responsive/guideline/keyboard tests; iOS captures | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native VoiceOver traversal and physical small-screen check remain unverified |
| L01 | Local storage failure cannot silently lose user state | Backup fallback now also handles absent/wrong-type primary; invalid new snapshots are rejected before backup rotation; failed recovery preserves raw values | none | missing/wrong-type primary, corrupt backup, invalid candidate red/green plus existing write/race/native checks | IN_PROGRESS | PASS/PASS/PARTIAL/N | Native rerun for latest backup changes; data controls/OS backup review remain |
| L02 | Unconfigured remote must not pretend sync succeeded; local state remains intact | Same-ID conflicts/bounds/provenance covered; composer exclusion joins preference codec/tie-break; local preference revisions remain monotonic across backward clocks | L01 | two/three-way merge/codec, removal vs stale snapshot, failed-write retry, original event/unsave cases | IN_PROGRESS | PASS/PASS/N/N | Broader data-control/recovery audit remains L01; actual remote absent, never claim sync success |
| P01 | Privacy and sponsored disclosure consistent, ads below listening | Missing in-app notice discovered; My Music policy sheet now states actual local-only use and bounded records | E02 | public navigation/320px policy smoke; disclosure tests | IN_PROGRESS | PASS/PARTIAL/N/N | Legal/store review and data-control audit remain separate |
| K01 | First exposure content individually accurate and links vetted | All30 rows have source notes; Swan Lake now explicitly Act II No.10, unsupported Brahms slow opening removed; remaining score claims and all recordings/windows unapproved | A04 | docs/research/in-c-founder-30-content-review.md; excerpt/guide regression | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Resolve remaining score details and all30 recording windows; official search links are not direct approval |
| R01 | Current code formats, analyzes, tests with Clef regression | Current recommendation/pacing repair: scoped251/full1130, analyze, eight-file format and diff check pass; whole objective remains open | code tasks | 2026-09-15 evidence and exact logs; code validation only | DONE | PASS/PASS/N/N | Revalidate after any further code change; device/recording/value gates are separate |
| R02 | in C iOS build/install and notification/user flow verified | No-codesign build and isolated integration verified; provisional foreground receipt observed, not full permission/background/physical delivery or OS taps | G03,R01 | in C entry define, install/screenshots, notification tap | IN_PROGRESS | PASS/PARTIAL/PARTIAL/N | Actual physical delivery/tap/signing and identity decision remain |
| R03 | Implementation, recommendation value, device and public release judged separately | Removed hardcoded current build PASS; founder and rules separated in docs/UI | all | whole-table audit with explicit unresolved rows | IN_PROGRESS | PARTIAL/PARTIAL/N/N | Final full Required audit and unresolved evidence summary |
| C04 | Human can judge each preview day's distance without fabricating listens | Explicit unanswered form, exact snapshot and observed_preview marker; actual widget choose/note/submit flow passes without completing Daily | C01 | snapshot mismatch, nonmutation, persistence and form submission smoke | DONE | PASS/PASS/N/N | Actual responses remain C03, not supplied by fixture tests |
| D03 | Map and continuity survive recent log limits | confirmedListenDays and latestReactionType persisted; legacy completion provenance retained; calendar-day arithmetic | D02,L01 | compaction/reload/map/continuity/UTC tests | IN_PROGRESS | PASS/PASS/N/N | DST and timezone native test; remote conflict audit L02 |
| G05 | Scheduled reminder copy follows saved/liked/unsure/corrected state | Interaction refresh uses serialized queue without re-requesting permission; disabled reminders stay disabled | G02 | scheduled-body red/green after unsure, edit, disable | DONE | PASS/PASS/N/N | Actual delivered body belongs to G04 |
| P02 | Seed demonstration concerts cannot impersonate live ticket inventory | All seed concerts explicitly demonstration; labels everywhere and ticket CTAs disabled; release gate excludes demo evidence | P01 | concert detail no-ticket smoke, demo status codec and gate tests | IN_PROGRESS | PASS/PARTIAL/N/N | Audit public demonstration policy and actual production import |
| L03 | Empty/damaged/unreviewed catalog never crashes the Daily screen or fabricates a recommendation | Empty and no-valid-moment pools show unavailable state, preserve history, keep Works/Ops accessible; fallback excludes unreviewed works | L01,K01 | empty/no-moment/unreviewed widget regression and Ops navigation | DONE | PASS/PASS/N/N | Keep stored-pick catalog revision case in A03 follow-up |
| E03 | Natural composer + title input identifies a work; composer-only input must not invent a favorite piece | First-week audit exposed Vivaldi Spring being recognized only as a composer; combined Korean/English/prefix/suffix matching now passes, exact composer remains composer evidence | E01 | reproduced compound-intake failure, corrected four-profile/input tests, full451 and controller108 PASS | DONE | PASS/PASS/N/N | Retain compound-input regressions; subjective recommendation approval remains C03 |
| G06 | Native scheduling cannot claim success without authorization; verify actual pending requests | Not-determined refusal and real provisional authorization both verified; isolated simulator-only QA hooks do not change production permission behavior | G01,G04 | actual pending replace/cancel plus foreground delivery PASS, no authorized-branch SKIP in this run | IN_PROGRESS | PASS/PASS/PARTIAL/N | Full user permission/denial and physical-device behavior remain separate |
| E04 | Review and correct/unlink legacy taste associations without losing raw input or listening history | My Music connection list/editor, provenance and monotonic per-item revision; equal-time unlink wins; corrected same-day pick retains music but withdraws old rationale | E03,L02 | legacy fixture, explicit selection/unlink, stale/tied/three-way merge, failed-write retry, next-day behavior, 320px/1.6 UI and native reload | DONE | PASS/PASS/PARTIAL/N | Physical usability/user trust remains C03/I02; no silent legacy rewrite |
| P03 | Inspect/copy personal records and explicitly erase in C data without Clef damage or backup resurrection | JSON surface, confirmation, cancellation-before-erase, persisted erase intent, per-key serialization and reset epoch; late notification navigation rejected | L01,L02,P01 | 10 data-control tests, 320px/1.6 confirmation/cancel, native isolated deletion/reload, previous-snapshot merge | DONE | PASS/PASS/PARTIAL/N | OS/external backups and actual notification authorization remain explicit limits |

## Verification Commands

Latest screen/pacing follow-up: native screenshot exposed the first work repeated under
next path; sparse/full widget RED -> repaired, hiding an empty following list. Four additional
RED cases exposed click/save/reaction-volume advancement. Pacing now uses distinct confirmed
local dates, excludes future dates and survives log compaction/correction. Scoped251/full1130,
analyze, eight-file format/diff and current iOS no-codesign build PASS. Final native10 PASS
(8 behavioral plus setup/teardown, no SKIP); sparse onboarding/map screenshots inspected.
Only provisional foreground receipt, not physical/banner/tap or audio approval. Details in
dated evidence. Required39 stays12/25/2; no human approval implied.

Latest 2026-09-15 A03/A04/B02/E01/F01 audit: Daily uses all supplied input bridges,
and root/draft Next Three exclude all already supplied works. The strongest known work
connection precedes a looser earlier input across reward/Next Three/Daily. Instrument-only
preference does not invent expansion; surprise needs a connected period/instrument change.
A real metadata-connected surprise remains covered. Sparse Daily fallback is a revisit,
not invented discovery or saved-state evidence. Scoped245/full1124, iOS build and native10
PASS; see dated evidence for final checks. Narrow repairs do not complete whole content/
recommendation rows or substitute for founder assessment.

2026-09-15 continuation: A04/E01/B02/L03 narrow repairs, not whole-row completion.
Intake translation now uses the selected work's actual connection and original input rather
than generic axis claims or automatically substituted movement names. Unknown title substrings
cannot create axes/Next Three proximity/map progress; explicit descriptors remain supported.
Empty catalog translation returns null and excluded anchors cannot return as fallback guides.
Previously stored unsupported proximity copy is withdrawn without replacing music or history.
K01: Satie HN1072 opening score inspected and listening guide made concrete; recording,
regional playback and passage approval remain NOT_VERIFIED.
See [2026-09-15 evidence](../quality/in-c-expanded-v1-evidence-2026-09-15.md) for fresh checks.
Required39 is DONE12/IN_PROGRESS25/NOT_VERIFIED2 after R01 current-code verification;
no human/device approval inferred. A04/B02/E01/K01 have narrow repairs, not whole-row completion.

### Historical Checkpoints

2026-09-14 closeout: Next Three and intake now require an actual input/work/preference
connection; difficulty alone cannot imply a taste match. Stretch additionally names a changed
composer/period/ensemble. Unconnected fallback slots are open_start, displayed separately.
Draft input and automatic broad symphony wording remain separate from saved taste and displayed
work anchors. No self-anchor/duplicate slot fill. Work-detail/map paths use the same contract.
Small-screen 320px/1.4 text check PASS; source-backed Chopin opening guide narrowed to melody
over left-hand accompaniment, without recording/timing approval. Full584/analyze/format/diff
PASS before checkpoint packaging; see current evidence for final native results.
Required39 remains DONE11/IN_PROGRESS26/NOT_VERIFIED2. Next: first30 recording/window review,
actual notification taps/VoiceOver and founder quality evidence. Stop new implementation here
per user request and commit/push/merge only the in C checkpoint.

Latest E01/A04/B01 continuation: intake preview deduplicates works, including a one-work
pool, and scores/explains the draft inputs without rewriting saved taste. Explicit composer
plus fugue input prefers an actual fugue, not merely any piece by the same composer.
Targeted3/full577/analyze/format/diff PASS; native/device/value evidence remains separate.
Next: independently audit Next Three lane distances and map recommendations; do not infer
those contracts from dedupe or nonmutation. Required39 counts unchanged. Prior checkpoint
commit/push permission below does not authorize further commit/push in this continuation.

Latest checkpoint: day-five gentle expansion requires a known bridge, with close/open-start
fallback and explicit instrument/mood reasons. Scoped12/full574/analyze/format/diff and
iOS no-codesign build (26.0MB) PASS; see Day-Five Expansion Bridge Checkpoint evidence.
Required39 stays DONE11/IN_PROGRESS26/NOT_VERIFIED2. Older counts below are historical.
User now authorizes checkpoint commit/push only, not merge/deploy/identity changes.

Latest L02 reaction revision checks: targeted2/full573/analyze/format PASS.
Equal/backwards-clock edits preserve the final reaction, original listening time and saved
state across stale/repeated merges and reload. Earlier approval-capacity rejections were
followed by successful execution on continuation. No remote/device/human approval or
whole-row completion is implied. Logs: /private/tmp/in-c-reaction-revision-{check,full,analyze}.log.

Latest K01/P01 follow-up separates full-listening approval from explicit preview approval.
Direct-only URLs cannot enable preview; actual available-player widget tests cover both
states. Full571/controller110/analyze PASS. BWV1007 now has observed official browser
playback/video progression, but no auditory/region/iOS/musical-window approval; no seed
link was promoted. See Provider Playback And Preview Approval Audit in current evidence.

Latest B02/A03 follow-up: a null work anchor no longer makes every candidate close.
Composer-only/unknown sparse-catalog regressions distinguish an actual composer bridge
from open_start; candidate availability is tested separately from distance labels.
Full569/analyze and isolated native regression PASS. No existing pin migration or human
approval implied; see the Composer-Only Bridge Audit in the current evidence document.

Latest continuation evidence: [2026-09-14 execution](../quality/in-c-expanded-v1-evidence-2026-09-14.md).
Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2; TODO/READY/BLOCKED0.
No whole-row completion is inferred from the latest narrow fixes. All historical permissions
to push/merge below belonged to earlier requests; this run has no such permission.

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

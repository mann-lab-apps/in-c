# in C Expanded V1 Evidence: 2026-09-16 First Listen

Actual execution resumed on 2026-09-18 in
`/private/tmp/in-c-founder-first-listen-20260916`, branch
`feat/in-c-founder-first-listen-20260918`. The previous temporary worktree was gone, so
FL-013/FL-014 were rebuilt from current `origin/main`. This is a first-listen milestone only,
not expanded V1 completion.

## FL-013 Preferred Option Label

`FounderDailyPickQualitySnapshot` now keeps first-listen founder evidence separate from
automatic Daily Pick rule compliance:

- `firstListenDecision`
- `firstListenPreferredOption`
- `firstListenPreferredOptionLabel`

The export text includes those fields. Missing real founder response remains
`NOT_VERIFIED`; simulation PASS is not founder approval.

## FL-014 Evidence Parity

Catalog Ops `Founder 첫 추천 판단` and the public feedback sheet `오늘 추천` now use the
same evidence schema for first-listen judgment:

- `feedbackSurface`
- `firstThreeWorkIds`
- `comparisonWorkIds`
- `questionSetId`
- `questionKeys`
- `questionCopy`
- `answerOptions`
- `preferredOptionIds`
- `preferredOptionCopy`
- `preferredFirstListenOption`

Both surfaces require an explicit preferred option. Catalog Ops requires `testerId=founder`
for `first_listen_founder`, matching the public founder feedback contract. This records what
was chosen for review; it does not prove that the founder heard the piece or liked it.

## FL-015 Candidate Review Surface

Catalog Ops now includes `첫 추천 후보 리뷰`, separating:

- current simulated first-three picks
- stronger comparison candidates such as Brahms Symphony 3 III and Bach BWV578
- each work's listening path status

The panel explicitly says that search fallback is not a direct link or actual listening
approval. It does not change ranking, inject founder-only defaults, approve recordings or
create URLs. It gives the founder a concrete review pack without disguising unresolved link
friction.

## FL-016 Reaction Impact Preview

Catalog Ops now includes `반응 후 내일 추천 미리보기`. It runs the first-three candidates
through liked/unsure reaction scenarios in a simulation-only controller, then shows:

- the next-day work selected by the real Daily Pick rules
- the next recommendation reason
- listening-map count changes clearly labeled `simulation only`

The preview does not write reactions, daily picks or events to user state. It is evidence that
the app can explain how a first reaction changes the next recommendation; it is not evidence
that the founder liked a recommendation or actually listened to the recording.

## FL-017 Next-Pick Listening Friction

The reaction preview rows now show the next day's listening path status as well as the next
work and reason. This keeps tomorrow's recommendation review honest: a search fallback remains
visible as search fallback, and is not turned into direct playback evidence.

## FL-018 Copyable First-Listen Evidence

`FounderDailyPickQualitySnapshot.exportText` now includes first-three candidate path rows and
liked/unsure next-pick simulation rows. The export uses explicit evidence labels such as
`search_fallback_not_direct` and `simulation only`, so a copied report does not turn a search
fallback into direct playback evidence or turn simulated reactions into founder satisfaction.

## FL-019 Ops Evidence Copy Action

Ops summary rows labelled `evidence` or `export` now include a copy button. The widget test
copies the Daily Pick evidence row and verifies that the clipboard text still includes
first-listen candidate rows, reaction simulation rows, `search_fallback_not_direct` and
`simulation only`. The action copies local text only; it does not upload or share private data.

## FL-020 First-Listen Next Action

Founder first-listen evidence now carries the follow-up required by the selected option:

- `firstListenNextAction` in `FounderDailyPickQualitySnapshot`
- `preferredFirstListenNextAction` in Catalog Ops/public first-listen feedback evidence

If no founder response exists, the next action is `await_founder_response`. If the founder
chooses a stronger candidate that only has search fallback, the next action is
`approve_direct_or_preview_link_before_promoting_candidate`. This keeps a stronger preference
from being mistaken for URL approval, recording approval, timing approval or actual listening.

## FL-021 Visible Next-Action Copy

The public feedback sheet and Catalog Ops observation sheet now show a human-readable next
action immediately after the founder chooses a preferred option. When Brahms/BWV578-style
search-fallback candidates are selected, the visible copy says that a direct or preview link
must be reviewed before promoting the candidate. The saved evidence still carries the raw
machine-readable next-action field for traceability.

## FL-022 Candidate-Row Next-Action Visibility

The Catalog Ops first-listen candidate review now shows a next-action line on each candidate
row. The current first-three rows are labelled as actual-listen review candidates. Stronger
comparison candidates that only have search fallback are labelled with the same direct/preview
link-review requirement used by the first-listen feedback forms.

This makes the review list actionable before the founder selects a preferred option, but it
does not approve Brahms/BWV578 links, recordings, windows, audio or founder satisfaction.

## FL-023 Exported Comparison Next Actions

`FounderDailyPickQualitySnapshot.exportText` now includes `firstListenComparison` rows for the
same comparison candidates shown in Catalog Ops. Each row carries the candidate work ID, path
evidence and next action, so copied evidence does not lose the direct/preview review requirement
for stronger search-fallback candidates.

The comparison candidate ID list is shared between the UI and export generation. This keeps the
review panel and copied report aligned without promoting any candidate or approving any link.

## FL-024 Ops Summary Next-Action Copy

The Daily Pick quality summary now renders `firstListenNextAction` with the same human-readable
copy used in the first-listen forms and candidate rows. The export text still keeps the raw
machine-readable value, so review can be readable in-app while copied evidence remains stable.

## FL-025 Stored Next-Action Copy

First-listen feedback evidence now stores `preferredFirstListenNextActionCopy` alongside the
raw `preferredFirstListenNextAction` code. Both the public feedback sheet and Catalog Ops
observation sheet write the same copy that was shown before submit, so event review remains
readable without losing the raw machine-readable action.

The added copy is explanatory evidence only. It does not approve direct links, preview URLs,
recordings, timing windows, actual listening or founder satisfaction.

## FL-026 Stored Preferred Path Status

First-listen feedback evidence now stores the selected option's listening-path status at the
time of response:

- `preferredFirstListenPathStatus`
- `preferredFirstListenPathStatusCopy`

This keeps Brahms/BWV578-style stronger candidates traceable as search fallback even if catalog
links are reviewed later. The stored status is response-time evidence only; it does not approve
direct links, preview URLs, recordings, timing windows, actual listening or founder satisfaction.

## FL-027 Summary/Export Preferred Path Status

`FounderDailyPickQualitySnapshot` now exposes the latest founder response's stored
`preferredFirstListenPathStatus` as `firstListenPreferredPathStatus`. Catalog Ops shows a
readable `선택 경로` row and copied/exported evidence includes
`firstListenPreferredPathStatus=...`.

The summary uses the stored response-time value, not a new catalog-link approval. Missing or
older responses remain `NOT_VERIFIED`.

## FL-028 Summary/Export Stored Next Action

`FounderDailyPickQualitySnapshot` now prefers the latest founder response's stored
`preferredFirstListenNextAction` instead of recalculating from the current catalog state.
Older responses without the stored field still fall back to the existing calculated action.

This preserves the action shown when the response was submitted. It does not approve direct
links, preview URLs, recordings, timing windows, actual listening or founder satisfaction.

## FL-029 Summary/Export Stored Response Copy

`FounderDailyPickQualitySnapshot` now exposes stored response-time copy for both:

- `preferredFirstListenPathStatusCopy`
- `preferredFirstListenNextActionCopy`

Copied/exported evidence includes:

- `firstListenPreferredPathStatusCopy=...`
- `firstListenNextActionCopy=...`

Catalog Ops summary uses the stored copy when present. Current UI copy mapping is only a
fallback for older/missing evidence. This prevents a later copy change from rewriting what the
reviewer saw when the founder response was submitted.

This is evidence preservation only. It does not approve direct links, preview URLs,
recordings, timing windows, actual listening or founder satisfaction.

## FL-030 Controller-Level First-Listen Evidence Contract

`recordQualityObservation(category: 'first_listen_founder')` now rejects observations unless
the structured first-listen evidence schema is present. Required evidence includes:

- known `feedbackSurface`
- first-three/comparison IDs
- question and answer schema
- preferred option IDs/copy
- selected preferred option
- selected path status and readable copy
- selected next action and readable copy

The preferred option must be listed in both `preferredOptionIds` and `preferredOptionCopy`.
This prevents direct controller calls from creating a founder YES/PARTIAL observation while
leaving the preferred option, listening path or next action incomplete.

This is schema protection only. It does not approve direct links, preview URLs, recordings,
timing windows, actual listening or founder satisfaction.

## FL-031 Controller-Level First-Listen Evidence Consistency

The first-listen controller contract now validates that structured evidence is internally
consistent with the current review contract before saving a founder observation:

- first-three work IDs must match the current simulated first three
- comparison work IDs must match the configured comparison candidate list
- question keys/copy and answer options must match the first-listen question set
- preferred option IDs must match the review options shown by the app
- selected path status must match the chosen option's current listening-path evidence
- selected next action must match the chosen option's current required action

This closes the loophole where a direct controller call could include every required field but
mix a Brahms/BWV578-style preferred option with a mismatched direct-link status or recording
review action. The protection is evidence integrity only; it does not approve links,
recordings, timing windows, actual listening or founder satisfaction.

## FL-032 Controller-Level First-Listen Copy Integrity

The controller now validates human-readable first-listen copy against the same source used for
the raw evidence contract:

- preferred option copy must match the controller-generated option list
- selected path-status copy must match the selected raw path-status code
- selected next-action copy must match the selected raw next-action code
- public feedback and Catalog Ops evidence generation now use the controller copy helpers

This prevents a programmatic call from storing `search_fallback_not_direct` as the raw value
while showing the reviewer-facing copy as if a direct link or recording window had been
approved. The stored copy remains review evidence only; it does not approve links, recordings,
timing windows, actual listening or founder satisfaction.

## FL-033 Legacy First-Listen Evidence Quarantine

`FounderDailyPickQualitySnapshot` now filters stored founder first-listen events through the
same evidence contract used when saving new responses. Older or imported
`first_listen_founder` events that are missing required fields, mix current candidate/question
schema, or keep misleading readable copy are ignored for the summary/export calculation.

This keeps malformed historical evidence from showing `firstListenDecision=YES`,
`firstListenPreferredOption=...`, or copy that implies a verified direct link when the raw path
is only search fallback. The raw event is not deleted; it simply is not counted as valid
founder first-listen evidence until it satisfies the current schema.

This is quarantine of broken evidence only. It does not approve direct links, preview URLs,
recordings, timing windows, actual listening or founder satisfaction.

## FL-034 Latest First-Listen Evidence Freshness

The first-listen summary/export now uses only the latest founder first-listen observation, and
only if that latest observation satisfies the current full evidence contract. If a newer
malformed response exists after an older valid response, Catalog Ops leaves the first-listen
decision and preferred option as `NOT_VERIFIED` instead of falling back to stale approval.

This protects the founder review from showing an older `YES` after a newer imported or broken
response contradicted the evidence contract. Historical events are not deleted, and the fix
does not approve links, recordings, timing windows, actual listening or founder satisfaction.

## Verification

| Check | Result | Notes |
| --- | --- | --- |
| `dart format lib/classical_discovery_models.dart lib/classical_discovery_ops.dart lib/classical_discovery_controller.dart lib/classical_discovery_screen.dart test/classical_discovery_controller_test.dart` | PASS | Initial sandbox run failed on Flutter SDK cache permissions; escalated run formatted changed files. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records launch feedback from the app shell"` | PASS1 | Regression for normal feedback after the scrollable feedback sheet change. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder simulation reports rules separately from human approval"` | PASS1 | Verifies FL-018 export text keeps first-listen candidate/reaction evidence separate from founder approval. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder simulation reports rules separately from human approval"` | PASS1 | Rerun after FL-023; verifies copied export includes comparison candidate next-action rows. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops exposes first-listen candidate review honestly"` | PASS1 | Verifies first3/comparison roles, first-reaction next-pick path rows and that search fallback is not displayed as direct/approved playback. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "first listen reaction previews do not mutate user state"` | PASS1 | Verifies FL-016 previews do not write simulated reactions, daily picks, events or map progress to user state. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops exposes Daily Pick quality snapshot"` | PASS1 | Rerun after FL-023; verifies copied evidence includes comparison candidate next-action rows. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops exposes Daily Pick quality snapshot"` | PASS1 | Rerun after FL-024; verifies the summary shows human-readable next-action copy while export keeps raw evidence. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Verifies FL-020 saves `preferredFirstListenNextAction` with Catalog Ops founder feedback evidence. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Rerun after FL-025; verifies Catalog Ops evidence stores the human-readable next-action copy. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Rerun after FL-026; verifies Catalog Ops evidence stores preferred path status and copy. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Verifies FL-021 public feedback shows the next-action copy and saves the raw next-action evidence. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Rerun after FL-025; verifies public feedback evidence stores the human-readable next-action copy. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Rerun after FL-026; verifies public feedback evidence stores preferred path status and copy. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops exposes first-listen candidate review honestly"` | PASS1 | Rerun after FL-022; verifies row-level next-action copy for search-fallback comparison candidates. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder simulation reports rules separately from human approval"` | PASS1 | Rerun after FL-027; verifies summary/export includes preferred path status without approval. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-027; verifies snapshot uses stored response-time preferred path status. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops exposes Daily Pick quality snapshot"` | PASS1 | Rerun after FL-027; verifies Ops summary shows the readable selected-path row. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-028; verifies snapshot/export prefers stored response-time next action over recalculation. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-029; verifies snapshot/export includes stored response-time readable copies. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops summary uses stored first-listen response copy"` | PASS1 | Verifies Catalog Ops summary renders stored response-time copies instead of current copy mapping. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-030; verifies controller rejects founder first-listen observations without structured evidence. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Rerun after FL-030; verifies Catalog Ops still submits full first-listen evidence under the stricter controller contract. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Rerun after FL-030; verifies public feedback still submits full first-listen evidence under the stricter controller contract. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-031; verifies controller rejects mismatched preferred path status and next action evidence. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Rerun after FL-031; verifies Catalog Ops still submits evidence consistent with the stricter controller contract. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Rerun after FL-031; verifies public feedback still submits evidence consistent with the stricter controller contract. |
| `flutter test test/classical_discovery_controller_test.dart` | PASS116 | Rerun after FL-031; covers controller-level evidence consistency plus Catalog Ops/public feedback first-listen paths. |
| `flutter analyze` | PASS | Rerun after FL-031 passed with no issues. |
| `flutter test` | PASS1361 | Full in C/Clef regression suite passed after FL-031 evidence consistency validation. |
| `git diff --check` | PASS | Rerun after FL-031 passed with no whitespace errors. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen response stores preferred option evidence"` | PASS1 | Rerun after FL-032; verifies controller rejects mismatched preferred option copy, path-status copy and next-action copy. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops observation sheet captures founder first listen"` | PASS1 | Rerun after FL-032; verifies Catalog Ops evidence still satisfies controller-generated copy contract. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "feedback sheet records structured founder first listen response"` | PASS1 | Rerun after FL-032; verifies public feedback evidence still satisfies controller-generated copy contract. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "Catalog Ops summary uses stored first-listen response copy"` | PASS1 | Rerun after FL-032; verifies stored response copy still appears in the Ops summary under the stricter copy contract. |
| `flutter test test/classical_discovery_controller_test.dart` | PASS116 | Rerun after FL-032; covers stricter copy integrity plus Catalog Ops/public feedback/summary first-listen paths. |
| `flutter analyze` | PASS | Rerun after FL-032 passed with no issues. |
| `flutter test` | PASS1361 | Full in C/Clef regression suite passed after FL-032 copy integrity validation. |
| `git diff --check` | PASS | Rerun after FL-032 passed with no whitespace errors. |
| `dart format lib/classical_discovery_controller.dart test/classical_discovery_controller_test.dart` | PASS | Rerun after FL-033 legacy evidence quarantine. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "founder first listen snapshot ignores malformed legacy evidence"` | PASS1 | Verifies malformed stored first-listen founder evidence is ignored by summary/export rather than counted as founder YES. |
| `flutter test test/classical_discovery_controller_test.dart` | PASS117 | Rerun after FL-033; covers malformed legacy evidence quarantine plus existing first-listen controller/widget paths. |
| `flutter analyze` | PASS | Rerun after FL-033 passed with no issues. |
| `flutter test` | PASS1362 | Full in C/Clef regression suite passed after FL-033 legacy evidence quarantine. |
| `git diff --check` | PASS | Rerun after FL-033 passed with no whitespace errors. |
| `dart format lib/classical_discovery_controller.dart test/classical_discovery_controller_test.dart` | PASS | Rerun after FL-034 latest-response freshness. |
| `flutter test test/classical_discovery_controller_test.dart --plain-name "latest malformed founder first listen evidence blocks stale approval"` | PASS1 | Verifies a newer malformed response does not fall back to an older valid founder YES. |
| `flutter test test/classical_discovery_controller_test.dart` | PASS118 | Rerun after FL-034; covers latest-response freshness plus malformed legacy quarantine and existing first-listen paths. |
| `flutter analyze` | PASS | Rerun after FL-034 passed with no issues. |
| `flutter test` | PASS1363 | Full in C/Clef regression suite passed after FL-034 latest-response freshness. |
| `flutter test test/classical_discovery_controller_test.dart` | PASS116 | Rerun after FL-030; covers controller evidence/export text, stored response copy, Catalog Ops snapshot/copy action, first-listen candidate review/reaction preview, Catalog Ops observation sheet and public first-listen feedback. |
| `flutter analyze` | PASS | Rerun after FL-030 passed with no issues. |
| `flutter test` | PASS1361 | Full in C/Clef regression suite passed after the FL-030 controller-level evidence contract update. |
| `git diff --check` | PASS | Rerun after FL-030 passed with no whitespace errors. |

## Remaining NOT_VERIFIED

- founder actual response
- physical iPhone/TestFlight use
- approved direct/preview URLs
- verified recording windows/audio
- Public V1 readiness

## Next Issue Loop Candidates

- First three picks may still be too safe/familiar for a strong first impression.
- Brahms Symphony 3 III and Bach BWV578 need approved listening paths before they can be
  treated as low-friction discovery options.
- Search fallback, direct link and preview status must remain visibly distinct.
- Use the FL-016 preview during actual founder review; satisfaction remains NOT_VERIFIED until
  the founder responds after listening.

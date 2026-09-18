# in C Founder First-Listen Review: 2026-09-16

Status: PREPARED FOR STRUCTURED FEEDBACK / NOT FOUNDER-VERIFIED.

This document supports the first-listen milestone for the current TestFlight candidate. It is
not Public V1 approval and not proof of listening satisfaction.

## Current Simulated First Three

1. Beethoven Moonlight Sonata I
2. Chopin Raindrop Prelude
3. Mozart Eine kleine Nachtmusik I

These are simulated Daily Pick candidates. They are useful for flow testing, but the founder's
actual reaction is still missing. The app must not present an already-known input as a new
discovery.

## Stronger Discovery Comparison Options

- Brahms Symphony 3, III
- Bach Little Fugue BWV578
- Beethoven Pathetique II
- Haydn Surprise II

The comparison options are exposed as feedback choices, not secretly forced into the ranking.
Selecting one records a review preference only. It does not approve a recording, playback
window, timestamp or preview URL.

The Catalog Ops first-listen review panel now shows the current first three and these
comparison candidates side by side with their listening-path status. Search fallback is
labelled as search fallback, not direct playback.

It also shows a simulation-only reaction preview: for each current first-three candidate,
`좋음` and `아직 모르겠음` show the next day's work, recommendation reason and listening-map
counts without writing reactions, daily picks or events. This helps the founder judge whether
tomorrow's pick would be worth trusting after the first reaction. The preview also shows the
next day's listening-path status, so search fallback remains visible as search fallback rather
than direct playback.

## Evidence Contract

The app now records first-listen feedback with:

- first three work IDs
- comparison work IDs
- question set ID and exact question copy
- option IDs and exact option copy
- preferred first-listen option
- feedback surface (`public_feedback_sheet` or `catalog_ops_observation_sheet`)

The Catalog Ops export text also includes:

- first-three candidate listening-path evidence
- liked/unsure next-pick simulation rows
- next action for the founder's preferred option
- `search_fallback_not_direct` rather than direct-link approval
- `simulation only` map counts

Ops summary `evidence` and `export` rows can be copied from the app during review. This is a
local clipboard action only; it does not upload the report or count as founder approval.

If the founder prefers a stronger candidate that only has search fallback, the next action is
to approve a direct or preview link before promoting that candidate. This keeps preference,
content ops and playback approval separate.

The public feedback and Catalog Ops observation forms show this next action immediately after
the preferred option is selected, before the response is submitted. That copy is guidance for
review; it is not link approval or listening proof.

The Catalog Ops candidate review list also shows the next action on each candidate row. Current
first-three rows point to actual listening review; stronger search-fallback comparison rows
point to direct/preview link review before promotion.

The copied/exported evidence includes those comparison candidate path and next-action rows too,
so review notes keep the same distinction after leaving the app.

The Daily Pick quality summary shows next actions as readable Korean guidance, while copied
evidence keeps the raw `firstListenNextAction` values for traceability.

Submitted first-listen feedback events store both the raw preferred next-action code and the
readable next-action copy shown to the reviewer before submit.

Submitted first-listen feedback events also store the selected option's listening-path status
and readable path-status copy at response time. A stronger candidate that only has search
fallback therefore stays marked as search fallback in the event evidence, even if catalog links
are reviewed later.

Catalog Ops summary/export now surfaces that stored selected-path status too, so review notes
do not need to infer search fallback/direct/preview state from current catalog data.

Catalog Ops summary/export also prefers the stored selected next-action value from the founder
response. Current catalog state is only used as fallback for older evidence that did not store
the next action.

Catalog Ops summary/export also preserves the readable path-status and next-action copy stored
with the founder response. Current UI wording is only used as fallback for older evidence that
did not store those copy fields.

The controller now rejects founder first-listen observations that do not include the full
preferred option, path-status and next-action evidence schema. Public feedback and Catalog Ops
both satisfy that same contract.

The controller also rejects internally inconsistent first-listen evidence. A response cannot
mix one preferred option with another option's listening-path status, next action, candidate
list or question schema. This protects the review record from treating search fallback as
direct/preview approval.

The same controller contract now checks the readable copy too. A stored response cannot keep a
raw `search_fallback_not_direct` value while showing copy that says the selected path was a
verified direct link.

Catalog Ops summary/export also revalidates stored first-listen founder evidence before using
it. Malformed legacy/imported responses are ignored as NOT_VERIFIED rather than counted as
founder approval or direct-link-looking evidence.

If the latest founder first-listen response is malformed, Catalog Ops does not fall back to an
older valid-looking response. The review remains NOT_VERIFIED until the latest response is
resubmitted with valid evidence.

## Founder Questions

- Are the current first three enough to make you listen today?
- Do Brahms/BWV578-style stronger discovery candidates feel necessary?
- Is the current listening path acceptable even when it is search fallback?
- After reacting, would you trust tomorrow's pick?

## Limits

- Actual founder response: NOT_VERIFIED
- Physical iPhone/TestFlight use: NOT_VERIFIED
- Approved direct/preview URLs: NOT_VERIFIED
- Verified recording windows/audio: NOT_VERIFIED
- Public V1 readiness: NO

# Score Ddirori facet-control adoption — 2026-10-26

## Scope and design basis

- Product: `apps/in_c_sheet` (Ddirori Score)
- Product baseline before this slice: `3cfcb608`
- Applied surface: library's expanded **분류별 찾기** (collection, group,
  minimum-rating filters)
- System basis: `shared-baseline.md`, `support-matrix.md`,
  `specifications/services/score.md`, and existing `packages/ddirori_ui`
  contracts.
- Historical R1/R2/R3 manifests were checked, not regenerated. R1 reported
  its README as changed; R2/R3 report broader existing repository drift,
  including unrelated Studio/Play work. Those reports are evidence of a moving
  baseline, not an instruction to overwrite the manifests.

## Actual product change

`_LibraryFacetExplorer` now uses the existing `DdiroriStyle`, tokenized
surface/border/radius/spacing, `DdiroriStack`, and `DdiroriChoices<String>`.
It no longer creates app-local `ChoiceChip` styling or reserves a fixed-width
label column.

The app adapter still owns facet values and callbacks. Re-selecting a selected
collection/group/rating clears only that filter; it does not open a score,
change selection IDs, alter sorting, or write score data.

## Evidence

- `dart format lib/main.dart test/adoption_pilot_test.dart`
- `flutter test test/adoption_pilot_test.dart` — 26 passed
- `flutter test test/score_r1_adoption_test.dart` — 28 passed
- `flutter analyze` — passed
- `git diff --check` — passed

The new widget regression mounts the facet explorer at 320px width, 200% text,
and dark theme; it selects a collection and verifies that only the controller
filter changes. It is not an iOS hardware, VoiceOver, or screenshot-capture
result.

## Handoff and remaining work

- iOS metadata remains `pending`/`reviewed: false`; release notes, TestFlight
  guidance, capture-scene wording, accessibility, and device-QA evidence were
  updated for this scope.
- The existing capture fixture contains collection metadata, but this change
  has not produced a fresh store screenshot. Its expanded state requires
  widget/manual QA rather than a claimed capture artifact.
- No shared API changed; the app consumed existing Ddirori UI contracts.
- Next candidates: evaluate viewer/annotation/practice chrome for remaining
  token or component bypasses, then change one behavior-preserving surface at
  a time with existing PDF/annotation regressions.

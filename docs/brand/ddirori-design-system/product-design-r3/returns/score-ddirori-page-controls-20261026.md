# Score Ddirori page-controls adoption — 2026-10-26

## Scope

- Product: `apps/in_c_sheet`
- Shared package: `packages/ddirori_ui`
- Product baseline: `9bb1ad00`
- Surface: PDF viewer page-navigation chrome.

## Contract correction and adoption

`DdiroriPageControls` now follows its documented host-owned navigation
contract: nullable `onPrevious` and `onNext` callbacks decide whether a
direction is available. It no longer guesses availability from page number or
count. An optional `statusLabel` preserves a reading, annotation, practice, or
performance context without putting product state in the shared package.

Score now supplies its existing controller-derived availability and mode label
to this component. Hidden-page policy, crop/zoom, PDF mapping, setlist order,
and keyboard/pedal handling remain in Score.

## Verification

- `packages/ddirori_ui`: `flutter test` — 38 passed; `flutter analyze` passed.
- Score: `flutter test test/score_r2_viewer_test.dart` — 8 passed;
  `flutter analyze` passed.
- The PDF widget regression covers normal, dark, narrow-landscape, and 200%
  text viewer scenes plus long-scan, annotation, input-focus, and document
  replacement paths.

The result does not certify physical iOS accessibility, pedal/keyboard
behavior, or long-session PDF performance; those are explicitly pending in
the iOS metadata.

## Documentation impact

`C36 PageControls` and the Flutter API reference now document host-derived
availability and the optional state label. Historical design manifests and
generated evidence snapshots were not regenerated or overwritten.

`product-design-r3/revision.py` returned 1 and listed this Score screen along
with pre-existing Score controller/store, Play, Studio, and design-document
inputs. The manifest is therefore retained as historical evidence; this
focused product change does not claim to re-freeze the wider R3 baseline.

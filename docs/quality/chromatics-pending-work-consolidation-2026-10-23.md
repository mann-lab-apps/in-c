# Chromatics Pending Work Consolidation: 2026-10-23

## Scope and Preservation

- The user approved review, validation, commits, push and merge of the pending
  Chromatics app changes. Release packaging and version changes are excluded.
- Verification snapshot: `32f7b2ff09519c321cb18c50d8cc620383b1695c`.
- Product tree: `44472bf9bbe03670842607e5504c72124190913f`.
- Candidate tree after the test-only harness fixes:
  `c440ff171059ae3c847f5eff9809cb515a35d773` (before this report).
- The snapshot captures 39 modified and 19 previously untracked paths on top of
  `d971b6b89b6f1bd7967ef2fcecdce315e2045a70`.
- The original worktree is still receiving edits. Only the frozen, verified
  contents will be staged; later changes must remain in the working directory.
- The user explicitly excluded the root site's `site/chromatics.html` changes.
  Shared brand/site redesign, other apps and deployment files remain untouched.

## Acceptance and Evidence Map

| Area | Preserved contract | Verification |
| --- | --- | --- |
| Menu, tools and docks | Existing commands, keyboard focus, local workspace settings, history and selection | App tests, actual Electron product checks |
| Properties and symbols | Object-specific editing, duration/clef preview, no unintended score change | App and notation tests, Electron smoke |
| Layout and PDF | Shared voice/staff rhythm, measured ink bounds, export rejection and retry without source mutation | Notation/layout tests, PDF geometry and snapshot scripts |
| Repeat, volta and ties | Bounded traversal, shared repeat ownership, branch ties and native references | Core, schema and editor tests |
| MusicXML | Open endings, sparse attributes, partial-tie warnings and non-resetting consumer CLI arguments | XML fixtures and argument tests |
| Independent MIDI inspection | Track/channel clocks, note-off validation and deterministic data extraction | Five Python unit tests |

## Current Verification

- Typecheck: PASS on the frozen snapshot.
- MIDI inspection: 5 tests PASS with `mido==1.3.3` via `uv --no-project`.
- Work queue and parity roadmap schema checks: PASS. These are not product parity gates.
- First full Vitest: 1,167 passed, one failed, nine existing opt-in/skipped cases;
  exit 1. `range clipboard snapshots hairpin inherit` took 5,069ms at the
  unchanged five-second limit. Its unmodified isolated run passed (3.90s total
  test phase), so the first run is not recorded as green.
- Scoped the six-case clipboard test's note queries to the notation container
  and reused the quick-tools navigation helper. No assertions, history/save
  operations, cases or time limits were removed or increased. All six cases pass
  (1.26-3.06s each; the original failing case 2.95s).
- Development build/typecheck: PASS after the test-only change. Rollup reports
  an upstream Zod comment-annotation warning, not a compile failure.
- Actual Electron Ddirori product checks: 193 PASS, 11 screenshots, no renderer
  exceptions. Evidence: `/private/tmp/chromatics-consolidation-evidence/run-Zimwy7`.
  Native save/reopen compares the complete JSON, and backup failure/retry uses an
  isolated profile. Light desktop, enlarged dark narrow view and a rendered PDF
  were inspected; this does not certify every real score or OS.
- Legacy MVP harness reconciliation: the measure-properties check expected three
  selects although the feature now exposes five, including two volta controls.
  It now checks all five accessible names and their containment. The toolbar's
  obsolete fixed 80px limit is replaced by a finite two-flex-row budget including
  group borders/margins, stable height across modes, all controls contained and
  at least 150px of score canvas. The focused 960/1400 run passes (89/51px toolbar
  heights); the 960 screenshot was inspected. No product layout was relaxed.
- Extended `verify-single-voice-mvp.cjs`: PASS, including the five measure
  properties and persistent toolbar contracts above.
- Notation snapshot comparison: PASS at 960/1400, without updating the baseline.
- Passive attachment PDF checks: PASS; the actual PDF was rasterized and inspected
  for the attachment glyphs and absence of editor controls. This is not a complete
  typography or header-placement review.
- Default part/span geometry suite: PASS, including native reopen, open volta,
  branch ties, slur geometry and actual PDF output. Opt-in native select keyboard
  and specialized geometry audits are not represented by this default result.
- Final full Vitest: PASS, exit 0, 1,168 passed / nine opt-in external MuseScore
  cases skipped (1,177 total), 72 passed test files / one skipped. Duration 544.77s,
  default timeouts, dot and JSON reports. Report:
  `/private/tmp/chromatics-consolidation-tests-final.json`.
- Whitespace/tab scan across all 58 paths and `git diff --check`: PASS.
- Remote CI is a separate gate and will be recorded on the consolidation PR.

## Consolidation Commits

- `1bd69a61`: repeat ownership, branch ties, MusicXML contracts and independent
  consumer test utilities.
- `4f7fa513`: editor controls, properties, notation layout, PDF regression
  coverage and the test-only harness corrections.
- The documentation checkpoint preserves the reviewed work queue and prior
  evidence without claiming the post-snapshot header changes are verified.
- At staging time, 13 later-edited product/docs/script files remain unstaged in
  the source worktree. They must not be discarded during worktree cleanup.

## Explicit Remaining Risks

- Opt-in external MuseScore tests are not ordinary suite passes. Existing reports
  retain nested-repeat/volta playback differences and intermittent consumer
  process aborts. Neither source nor consumer traversal is declared authoritative.
- Native menus, real-score typography, hardware/listening and external viewer
  compatibility are not certified by automated DOM or MIDI checks.
- Print-only header/title bounds and other follow-up engraving items remain in
  the existing work queue; this consolidation does not complete all feature gaps.
- Earlier broad-suite timeouts remain historical evidence. This run must report
  its own exact results without replacing assertions or hiding failures.
- No app release, signed artifacts, version bump or store submission is included.

## Reproduction

Run the following against the frozen candidate, not the concurrently edited
working directory. No timeout overrides or snapshot-update flags are used.

```sh
npm run typecheck
npm test -- --reporter=dot --reporter=json --outputFile.json=/private/tmp/chromatics-consolidation-tests-final.json
npm run build
uv run --no-project --with mido==1.3.3 python -B scripts/test_inspect_midi_notes.py
node scripts/verify-chromatics-v1-work-queue.mjs
node scripts/verify-chromatics-musescore-parity-roadmap.mjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-single-voice-mvp.cjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-notation-snapshots.cjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-passive-attachments-pdf.cjs
env -u ELECTRON_RUN_AS_NODE node_modules/.bin/electron scripts/verify-part-span-geometry.cjs
```

The Ddirori verifier additionally used the installed Playwright module through
`DDIRORI_PLAYWRIGHT_PATH` and a separate `DDIRORI_PRODUCT_EVIDENCE` directory.
All temporary logs and captures are local evidence, not shipped product assets.

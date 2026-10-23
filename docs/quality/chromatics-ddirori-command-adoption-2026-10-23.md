# Chromatics command component adoption and regression stability

## Scope and preservation

- Starting product commit: `1b73e45a` on `feature/chromatics-topbar-ia-alpha32-20261020`.
- Existing uncommitted menu, notation, MusicXML, playback and test work is preserved.
- Only new design integration and its evidence may be staged. No release, version,
  upload, push or merge is authorized by this work.
- Desktop renderer only; no iOS metadata or other application changes.

## Acceptance and evidence plan

| Contract | Required evidence |
| --- | --- |
| Default-limit regressions | Same frozen source/runtime, full and focused test reports; no hidden timeout override or excluded failures |
| Shared duration/voice controls | Real App commands, selected state, repeated selection does not clear a mandatory value, actual note entry |
| Shared range controls | Applicability, selection, existing history and native roundtrip regressions |
| Appearance | Real Electron, both themes/densities, 390/840/1440 widths and 200% text |
| Data preservation | Input, undo/redo, native save/reopen equality; PDF excludes tool chrome |
| Independent change | Index-only source checked separately from preserved uncommitted product work |

## Connection map

| Surface | Tokens | Common component | Product command |
| --- | --- | --- | --- |
| Duration and voice | Existing screen adapter | Shared Button | Existing duration/voice commands retained |
| Range hairpin palette | Existing screen adapter | Shared Button | Existing applicability and hairpin command retained |
| Search and empty results | Existing screen adapter | Existing product controls | Existing query/filter |
| Inspector | Existing screen adapter | Shared IconButton in SpanProperties; existing SpanPasteTargets | Existing selection/edit/reset |
| Dock | Existing screen adapter | Existing product dock | Existing collapse/restore/keyboard resize |
| Backup recovery | Existing screen adapter | ModalBackdrop and shared IconButton | Existing list/restore/retry |
| Settings/mixer/output | Existing screen adapter | Existing product controls | Existing native commands |

The shared `Choices` control clears a selected single value; it is intentionally
not used for mandatory duration/voice selection. The shared native-dialog API
does not replace the already verified product modal focus/recovery contract.
No mixed-value editing, free docking or new notation engine behavior is claimed.

## Frozen baseline

- Source: `/private/tmp/chromatics-regression-20261023-0qrd0o`; 163 source files
  checked against the live product on capture; hashes in `source-hashes.json`.
- Runtime: Node v25.2.1, Vitest 4.1.9. No other Vitest process at start.
- Full: `npm test -- --reporter=dot --reporter=json --outputFile.json=/private/tmp/chromatics-regression-baseline-20261023.json`.
- Exit 1: 1,135 passed / 2 failed / 8 skipped, 551.58 seconds. No App timeout
  occurred. The command has no global timeout override, but the frozen App test
  already has 42 per-case 10/15-second overrides (HEAD has 11). Thus it must not be
  described as every test passing within five seconds. Existing overrides are
  preserved, not introduced or enlarged by this work.
- Both failures belong to the pre-existing uncommitted
  `NotationPreview.passive-attachments.test.tsx` wide/tall harmony print cases.
  Focused same-source execution reproduced both failures in 900 ms: missing
  width-overflow attribute and negative harmony baseline (-117). These are not
  timeout failures and are not introduced by the Button integration.
- The user subsequently authorized a minimal harmony print fix. Before editing,
  the live notation work changed concurrently: its text-ink selector now includes
  harmony and inline-clef elements. The two original failing cases pass on that
  updated source (2 passed / 140 filtered, 1.09 s). This pre-existing work is
  preserved and not staged or claimed as a new design implementation. A fresh
  integrated snapshot is required; the frozen baseline remains a failure record.

## Performance experiment (not adopted)

- Removed only `vi.resetModules()` in a disposable same-source copy;
  DOM cleanup, mock/global/storage reset and all assertions remained intact.
- Same four-case focused command: reset 24.12 s vs cached modules 24.16 s,
  four passes each. The explicit hairpin case took 2.18 s in the reset run.
- Full cached experiment: 543.24 s, same 1,135 passed / 2 failed / 8 skipped.
  Report: `/private/tmp/chromatics-regression-cache-full-20261023.json`.
- No other Vitest job ran alongside either full comparison. The small full-run
  difference does not establish a module-reset cause. No module-reset or timeout
  policy change is applied. Test-cost investigation remains distinct from the
  pre-existing harmony print failures.

## Component contracts and modal regression

- Shared sources/assets are the committed `ef87416` foundation, not newer dirty
  brand files in the root worktree. Tokens/geometry are copied without edits.
  Chromatics imports source directly and uses its screen adapter; the catalog's
  global CSS/demo fixtures are not installed into the product page.
- Button/IconButton have a small `src/controls.tsx` entry point, re-exported by
  the existing public index. Product imports do not load the catalog mascot.
  Development output no longer emits the unused 739.86 KB mascot asset.
- IconButton now composes a product class and preserves an explicit title, so
  icon geometry and shortcut tooltips survive adoption. Commands stay in App and
  SpanProperties. No selected-object model is moved to the common package.
- New backup tests first failed on composing Escape and return focus after an
  ephemeral menu item disappears: 2 failed / 6 passed. The latter uses an isolated
  menu host fixture; current product backup entry points are persistent buttons,
  not evidence of a new backup menu command.
- Reusing ModalBackdrop replaces only duplicated keyboard/focus handling. List
  loading, delayed-result guards, restore lock and failure/retry stay in place.
- Related post-fix unit run: 29 passed (common controls, inspector, ModalBackdrop,
  NativeBackupsDialog). Initial App duration/voice/hairpin + common run: 12 passed
  / 330 filtered out. Filtered runs are not full-suite passes.

## Verification checkpoints

Final independent and captured integrated runs pass. Earlier checkpoints below
are retained as investigation evidence, not substituted for final-source results.

- Integrated capture: `/private/tmp/chromatics-ui-integrated-20261023-i2HeFE`,
  213 source/config files with SHA-256 in `source-hashes.json`.
  Initial run exited 1: 1,093 passed / 4 failed / 8 skipped plus one failed suite,
  564.44 s. The snapshot omitted `site/compositions-catalog.json` and acceptance
  documentation used by tests. These are verification setup failures, not product
  regressions, and the run is not a full-suite PASS. Another worker's Node 22
  Vitest run overlapped part of this execution; timing is not a controlled
  performance comparison. No process belonging to the other work was stopped.
- Replacement complete fixture snapshot:
  `/private/tmp/chromatics-ui-integrated-complete-20261023-g6Gs1l`, based on the
  committed repository fixture tree with the exact same 213 captured files.
  No live source is substituted into an already tested snapshot.
- Independent index tree: `10a5e393f786f2864f5f5fa6a96d26fa84c6fed7`, captured at
  `/private/tmp/chromatics-ui-independent-20261023-YPnMM3`. Only new changes over
  `1b73e45a`; existing notation/menu edits are not included.
- Preliminary real Electron run: 161 checks, 11 screenshots, native JSON
  roundtrip equality. Evidence `run-yDxPGm` under the OS temporary
  `chromatics-ddirori-product-evidence` directory. Its PDF was rasterized and
  inspected: populated score and no editor chrome. This is a small score fixture,
  not comprehensive engraving or external-viewer certification.
- The narrow 200% screenshot alone does not establish a clipping failure.
  The initial assertion incorrectly treated a scrollable status area as a failure.
  Measured integrated geometry: status y=830, height=120, viewport height=950,
  content height=140, overflow=auto. The corrected check scrolls to the last
  status child and verifies its bounds and hit target inside the viewport and
  status container; it also checks the last input tool's reachability. No status
  CSS is changed to hide or bypass the test.
- The first independent build found two unsupported Testing Library `exact`
  options in the staged-only test. The working tree already had the corrected
  string-name queries. Only that new staged test was aligned; no existing test
  or assertion was weakened. Independent rerun: 868 passed / 1 skipped, 311.01 s,
  exit 0 (`chromatics-ui-independent-final2-20261023.json`). Longest observed
  test 4.63 s; no timeout override added. This precedes the final CSS-only polish.

## Theme follow-up and final sources

- Direct screenshot inspection of the independent legacy category UI found
  controls and context values outside the original screen adapter scope. The
  latest menu-driven UI already covered those controls through its toolbar stack.
- Extend only `ddirori-product.css` to cover `.toolbar`, `.editor-context-strip`
  and dot-count labels/outputs; retain screen-only scope. Existing user
  `styles.css`, notation geometry, print rules and command handlers are untouched.
- New real Electron color contract failed against the unchanged legacy output
  (`input control theme light/compact/1440/16`). Corrected source checks enabled
  and disabled text tokens across both themes, densities, widths and font scales.
- Final independent source tree: `20afa1f76c46dbe8a13e825154aa515d348a79aa`,
  `/private/tmp/chromatics-command-independent-20261023-JV5mjy`.
- Final integrated capture: `/private/tmp/chromatics-command-integrated-20261023-cNEFss`.
  Its product source is the fixed captured checkpoint plus the final adapter and
  verifier. Further concurrent notation/menu work is not certified by this run.
- Both `npm run build` executions include typecheck and exit 0; these are
  development verification builds, not signed release packages. Known zod PURE
  comment warnings are nonfatal. Shared index/controls/tests additionally pass
  a strict standalone TypeScript check with the repository compiler options.
- Final real Electron independent: **191 checks, 11 screenshots**, exit 0,
  evidence `run-9i1BZt` in the OS temporary `chromatics-ddirori-product-evidence`.
- Final real Electron integrated: **193 checks, 11 screenshots**, exit 0,
  evidence `run-kA7eek` in that directory. The extra two checks exercise the
  uncommitted menu UI's keyboard dock resizing, not a new feature in this commit.
- Both reports include source hashes. They exercise actual product commands,
  undo/redo, complete native project JSON equality after save/reopen, PDF output,
  isolated-profile backup failure/retry, IME/focus and autosave failure preservation.
- Final independent full run: **868 passed / 1 existing skipped**, 66 passed
  files / 1 skipped, exit 0, 356.81 s. Command: `npm test -- --reporter=dot
  --reporter=json --outputFile.json=/private/tmp/chromatics-command-independent-results-20261023.json`.
  No new timeout, exclusion, module-reset or assertion relaxation is applied.
- Foundation commit: `c872bbcc feat: expose shared Ddirori web control contracts`.
  All nine committed foundation files were byte-compared against the final
  independent snapshot and index before committing. Product/user edits are not
  included in this foundation commit.
- Final captured integrated full run: **1,159 passed / 8 existing skipped**,
  71 passed files / 2 skipped, exit 0, 569.28 s. Command: `npm test --
  --reporter=dot --reporter=json
  --outputFile.json=/private/tmp/chromatics-command-integrated-results-20261023.json`.
  The original wide/tall harmony print regressions pass in this run. Fixture
  completeness was restored without changing test expectations or product code.
- Final PDF captures were rasterized with Poppler and visually inspected: music
  is present and editor chrome is absent. This does not certify every engraving
  combination or all native export platforms.

## Boundaries

- No whole-catalog replacement is claimed. Mandatory choices use controlled
  Button contracts; existing selection, docking, mixer and export models stay
  in the product. Mixed-value editing and free docking remain out of scope.
- Five-second timeout failures were not reproduced as a stable product defect in
  the controlled baseline/focused comparison. Existing longer per-case limits
  are reported, not increased. Concurrent machine load remains a timing risk.
- Harmony print failures pass on the captured concurrent notation fix. That
  larger uncommitted engine work still needs its owner's final integration commit
  and full engraving review; it is intentionally not bundled with UI adoption.
- No version, release packaging, push, merge, store or iOS metadata change.
- Electron evidence is from macOS with isolated userData. Windows/Linux native
  packaging and physical IME interaction were not tested; composition checks
  dispatch the relevant keyboard-event flags. No new recurring manual QA gate is
  introduced, and these boundaries must not be described as device certification.

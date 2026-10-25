# Studio R1 Renderer Return

## Identity

- Service: studio; product: Chromatics; parent brand: 띠로리.
- Status: **implemented-awaiting-review** for the scoped File group, single-span inspector and surrounding chrome; not full-app R1 certification.
- Implementation commit at evidence capture: **uncommitted**. The implementation and this return package are checkpointed together; use the Git history of this file for the resulting commit.
- Base product commit: `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`.
- Worktree: `/Users/jaemankim/Desktop/privates/coding/in-c`.
- Branch: `feature/chromatics-expanded-v1-checkpoint-20260913`.
- Actual package version: `0.1.0-alpha.14`, unchanged. This is not the separate alpha.34 worktree.
- Design revision: `product-design-r1`.
- Manifest SHA256: `00d7e83fa897871ccb399c5ca2d8ca1dbb84632e7b630e2df15b84bd693d2efb`.
- `revision.py --check` passed before and during implementation. No manifest regeneration.
- Desktop-only: iOS metadata not applicable. Other apps, common package dirty changes, static Paper, other worktrees and release metadata were not modified by this task.

## Applied Scope

- Document name/save state precedes existing command classifications. Classifications and their order remain unchanged.
- The existing File command group composes `@ddirori/ui` Button/IconButton; original native/MusicXML handlers and disabled policies remain the source of truth.
- Scoped neutral chrome, existing accent, shared typography/tokens, OS light/dark for adopted chrome. Notation canvas is not inside the shared typography host.
- Single-span/no-selection inspector retains native selects and app-owned GeometryInput. No mixed-selection implementation is claimed.
- Empty offset now says automatic, not zero. Explicit `0`, empty/undefined, `sp`, Enter/blur single commit, Escape draft cancellation and IME guard remain intact. Invalid input restores the committed value and adds a linked error.
- Selected span properties stay visible when visiting File commands. Endpoint validation, unsupported option and reset engine paths are unchanged.
- Dock widths use `chromatics.dock-widths.v1`, separately from existing visibility preferences. Valid 200-360 values survive, default 280; invalid stored values fall back/clamp. Closing returns focus to the visibility trigger.
- Below 1024px docks stack and have bounded internal scrolling. Fine pointers use compact32; coarse/non-fine targets use48. Physical touch hardware is not certified.

## Failure-First Evidence

- New tests initially failed for missing document status and the misleading `0` automatic placeholder.
- A second regression reproduced the selected inspector disappearing when switching to File. It passes after preserving the selected inspector independently of the command category.
- Selection-switch draft isolation was already correct and is regression coverage, not a newly fixed engine defect.
- Production inspection found inherited 1200px palette grid spanning the new columns. The desktop adapter now resets those tracks explicitly.
- Large-text inspection found clipped dock-width digits; sizing now follows character width rather than a fixed rem width.

## Verification

- App + SpanProperties: 140 tests passed before the final selected-panel continuity assertion; final focused R1 test passed afterwards.
- Related score-core, span editing, span viewport, system layout and MusicXML: 5 files / 103 tests passed.
- `npm run typecheck` and `npm run build`: passed.
- `scripts/verify-ddirori-studio.cjs`: built Electron renderer, isolated userData, real controls and serializers; memory bridge replaces OS file dialogs only. Latest matrix results are in `artifacts/r1-results.json`.
- Dock207/280/360, light/dark, 960/1400px, enlarged chrome text200%, synthetic Hangul composition, automatic/zero, one undo, error, focus return, native reopen, unchanged MusicXML/score payload and save failure are covered.
- PDF comparison uses Chromium print output before/after workspace changes, rasterized with Poppler. It is not an OS print-dialog test.
- `verify-notation-snapshots.cjs --fixed-canvas`: passed against the unchanged baseline. The new mode fixes only input canvas width and forbids baseline updates.
- Default responsive notation snapshot: **different at960px**. With stacked docks, available notation width grows644 to880, changing responsive system wrapping. At1400px the existing metrics match. This is not reported as an unqualified default visual-regression PASS.
- Root `npm test -- --reporter=dot`: **FAIL**, 7 failed files / 51 passed / 1 skipped; 12 failed tests / 615 passed / 23 skipped. The root runner collects package DOM tests without the package jsdom config, and collects two `node:test` files as Vitest suites. See `artifacts/vitest.log`. No test was deleted, weakened or excluded in configuration to hide this result.
- `npm test -- --dir src --reporter=dot`: **48 files passed / 1 skipped, 607 tests passed / 1 skipped**, including final App/SpanProperties changes. `artifacts/product-vitest.log`.
- `npm --prefix packages/ddirori_web test`: **6 files / 56 tests passed** with the existing package jsdom config. `artifacts/shared-vitest.log`.
- `node --test .../api-portability.test.mjs .../token-model.test.mjs`: **4 tests passed**. `artifacts/node-tests.log`.
- This split does not turn the root invocation into a PASS. A future repository-wide runner configuration task should explicitly combine these test environments.
- Final typecheck/build passed; see `artifacts/typecheck.log`, `build.log`. The build retains pre-existing third-party PURE annotation warnings.
- Final Electron matrix, fixed-canvas snapshot, revision hash check and diff check passed after the last CSS change. See `artifacts/electron.log`, `notation-fixed.log`, `revision-check.log`, `diff-check.log`. `source-sha256.txt` identifies uncommitted implementation files, not a fictional commit.

## Actual Screens

Fixture: existing `release-test`, single part Melody, selected `hairpin:release-hairpin`; no private score. Endpoint labels contain actual ticks and pitch. This differs from the static R1 review dataset intentionally.

- `artifacts/span-{light,dark}-{207,280,360}.png`: actual built Electron, viewport1400x1000, DPR2, text100%, actual dock widths, existing accent. Shared canvas font remains original Inter/system font; music glyphs remain VexFlow.
- `artifacts/file-light-1400.png`: document/command/tool/score hierarchy.
- `artifacts/no-span-selection.png`, `invalid-geometry.png`: no selection and linked numeric error.
- `artifacts/save-pending.png`, `save-failure.png`, `save-retry-success.png`: injected bridge delay/failure and actual product recovery UI, not real disk failure or native dialogs.
- `artifacts/narrow-text-{1,2}.png`, `file-text-2.png`: viewport960x1000, DPR2, text enlargement via measured chrome font sizes. Not physical OS accessibility text scaling.
- `artifacts/before-workspace.pdf`, `after-workspace.pdf`: actual Chromium PDFs; associated page PNGs reviewed.

## Differences and Limits

- The design described existing stored dock widths, but this checkout only stored visibility. User explicitly approved a new local width preference; no legacy key migration was necessary.
- Native selects remain. GeometryInput cannot be replaced by NumberControl without undefined/commit-contract support. No common API/source changes were made.
- Dark coverage is adopted editor chrome, not startup, all dialogs, reports or OS surfaces. The paper/background/glyph metrics retain original styling; the screen paper is not recolored to match chrome.
- The 960px responsive wrap difference remains documented; baseline was not rewritten to hide it. Fixed-canvas comparison isolates engine geometry from intended workspace layout.
- PDF rasters before/after workspace changes match: SHA256 `3f7e8c7a0c853f880a261c02462923b00047ddc81e7eb660858fb12645775358`. This compares two outputs of the changed product with identical score contents, not an archived pre-implementation PDF binary. The independent fixed-canvas test compares actual pre-existing engraving metrics.
- Compact32 applies only with a fine pointer; coarse emulation is evidence for CSS target sizes, not physical touch behavior.
- No real OS menu/file dialog, physical Korean IME, screen reader, audio, remote release or device certification. Synthetic events are not substituted for these claims.
- Shared proposals: none required for this slice. Any future optional-number API must be independently justified across consumers.
- No Commercial V1/RC or full design-system adoption claim.
- Preview: `http://127.0.0.1:5178/?fixture=release-test`, built renderer served locally. Native file bridge is unavailable in a regular browser. Electron evidence above uses the documented isolated bridge fixture, not this preview.

## Reproduction

```sh
npm run typecheck
npm run build
env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-ddirori-studio.cjs
env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-notation-snapshots.cjs --fixed-canvas
npm test -- --reporter=dot
npm test -- --dir src --reporter=dot
npm --prefix packages/ddirori_web test
node --test docs/brand/ddirori-design-system/tools/api-portability.test.mjs docs/brand/ddirori-design-system/tools/token-model.test.mjs
python3 docs/brand/ddirori-design-system/product-design-r1/revision.py --check
git diff --check
```

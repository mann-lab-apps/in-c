# Studio Product Design R2 Handoff

Status: implemented, awaiting product/design and human-input review. This is not Commercial V1, RC, release, or complete MuseScore parity approval.

## Source and Design Reference

- Service: Ddirori Studio, actual Chromatics desktop renderer in the original `in-c` worktree.
- Base product commit: `827ad18203e673b1e923d00cbcf0fd7f3af755d7` on `feature/chromatics-expanded-v1-checkpoint-20260913`.
- Implementation: **uncommitted**. `artifacts/implementation.diff` and `source-sha256.txt` identify this return's exact implementation; there is no invented future commit.
- Design revision: `product-design-r2`.
- R2 `revision.json` SHA256: `af56b0a3ca6e25b9928835645562f5056cfa16553f2881bdb9750df37636f416`.
- Initial revision check verified 590 hashes. The final check reports deliberate Studio changes and independent Play/Score changes. The historical manifest and design captures were not regenerated. See `logs/manifest-check.log`.
- Existing R1 neutral chrome, independent dock widths200-360/default280, visibility persistence, command categories, file lifecycle, font metrics and engraving pipeline remain in place.
- Other apps, iOS metadata, shared package changes and other Chromatics worktrees were not edited by this task. Their concurrent dirty changes remain outside this return.
- This original worktree's package version is `0.1.0-alpha.14`; it was not changed to the different version previously reported for another worktree.

## Applied Backlog

| ID | Implementation and result |
| --- | --- |
| T04 | First isolated the intermittent synthetic-input failure. Native background focus reproduces missing focusout/validation; foreground event paths preserve strict invalid, draft, selection and command assertions. Fixed the harness focus precondition, not GeometryInput's commit semantics. See [findings](t04-findings.md). |
| T02 | Added an always-discoverable next-input context and real input-toggle/rest commands. Duration/dots/accidental display their actual input or selected-event destination. Selected attachment actions remain explicitly separate. Inspector shows selected span identity, scope and automatic/value geometry. See [command mapping](command-mapping.md). |
| T03 | Kept fit-width as default; added workspace-only fixed scale, independent of score/undo/export. Preserved SVG keyboard target and viewport visibility across redraw/reflow; dock-field focus takes precedence over score scroll. See [viewport policy](t03-viewport-policy.md). |
| T01 | Retained R1 neutral surfaces and fine32/coarse48 policies, saved widths/visibility and real native/XML serialization. Did not replace notation with the static review Paper. |

## Actual Product Corrections

1. Native Select was missing from the global text-editing target guard: ArrowDown was prevented and Escape could clear the selected span. Native select and common combobox/listbox editing now retain their local keys; score shortcuts remain unchanged outside fields.
2. SVG notes already advertised `role=button` but Enter did not select them. Enter now calls the existing selection handler, including the passive-staff path; composing/229/modifier events are ignored. Space remains the existing transport shortcut.
3. SVG replacement discarded keyboard focus. Redraw now restores the logical selected target/address and clamps its viewport anchor without stealing focus from an editor field.
4. An opaque toolbar's inherited backdrop blur produced a blank screenshot despite valid button DOM rectangles. A pixel assertion reproduced the failure; removing that redundant blur restores actual painted commands.
5. The new input-context heading was compressed by the old nowrap toolbar. A real960px assertion reproduced zero context width and1900px scroll width. Wrapped group rows now provide912px of readable context inside a960px toolbar; text200% remains contained.

No engraving model/schema/file bridge replacement or shared API modification was made. The new screen-only fixed scale does not set PDF page geometry. New markup never serves as a hidden compatibility path for tests.

## Domain Contracts

- Existing command classification and enabled/disabled policy remain. Sequential duration/dot/accidental changes are input settings with command0; selected-event edits use the existing rhythm validation and undo commands.
- Span scope: current single selected span or no selected span. No mixed-span editor was added. Existing App event/chord/range policies remain as mapped.
- GeometryInput stays app-owned: empty means undefined/automatic, offset0 is explicit, height0 is invalid; offsets[-8,8], height[0.5,8], step0.25sp.
- Enter followed by blur commits once with one undo; Escape restores only the draft and stops propagation; composition does not commit. Selection changes discard the previous object's draft.
- Endpoint options and unsupported-current-value behavior remain engine-owned. Reset means undefined, not zero; no endpoint sorting or automatic clamping was added.
- A failed save retains dirty state, selection, score and undo. A real bridge success is required to become clean. The actual native serializer and MusicXML serializer run in the tests; only OS I/O is replaced by an isolated fixture bridge.

## T03 Numerical Findings

All rows use actual built Electron, release-test fixture, logical1400/960x1000, DPR2, text100%, fit/fixed150%.

| Mode | Viewport | Dock207 /280 /360 | SVG input width |
| --- | --- | --- | --- |
| Fit width | 1400 | variable side docks | 804 /680 /560px |
| Fit width | 960 | existing stacked layout | 880 /880 /880px |
| Fixed150% | both | all three widths | 900px, SVG height466px |

The selected event `m4-f-natural-2` and full part/staff/measure/voice address survive all12 combinations. A keyboard-focused score target remains focused and visible on1400-to960 reflow before any screenshot reveal helper runs. While a dock field owns focus, the field remains visible; the selected score target may be offscreen. Capture helpers may later reveal the score, which is not used as anchoring evidence.

Pending input stays eighth-note/dot1 at Melody/staff1/voice1/tick13440 before and after a dock/viewport change. The renderer has no independent insertion-caret glyph; this return validates the real input address, selected target and focus, not a mock caret. Anchoring maintains visibility, not pixel-identical positions across reflow.

The unchanged legacy responsive baseline does **not** pass: actual960 width880/height466 versus644/620, and actual1400 width680/height620 versus804/466. Both contain33 events. Current default280px side docks and compact stacking affect available width; the historical R1 statement that1400 matched is not reused as a current PASS. Fixed-canvas verification passes against the unchanged engraving baseline. No baseline was updated.

## Screens and Output

See `return.json`, `artifacts/renderer/r1-results.json`, `r2-workspace.json` and `artifact-sha256.txt` for actual conditions, runtime, matrix metrics and file identities.

- `artifacts/renderer/file-light-1400.png`: real document/status, command categories, file commands, score and selected-span inspector. Existing accent, not a new brand-color decision.
- `span-{light,dark}-{207,280,360}.png`: actual selected hairpin, endpoints, automatic geometry and dock widths. DPR2, viewport1400x1000, text100%, fine-pointer input32px.
- `no-span-selection.png`: no selected span, not an empty score or unsupported mixed state.
- `invalid-geometry.png`: invalid draft and linked range/unit feedback.
- `save-pending.png`, `save-failure.png`, `save-retry-success.png`: pending, failed dirty save and retry success using the real product save flow with an isolated OS-I/O bridge.
- `file-text-2.png`, `narrow-text-{1,2}.png`:960x1000 chrome text stress. `r2-next-input-{960,text-2}.png` show the actual active next-input and selected-object groups.
- `r2-{fit-width,fixed}-{1400,960}-{207,280,360}.png`: responsive and fixed view captures. Fixed150% intentionally scrolls inside the canvas rather than widening the document.
- `r2-export-{before,after}.pdf`: **actual App PDF export scene**, Chromium printToPDF, A4 one page. After workspace changes and native reopen, raster output remains identical; see `pdf-equivalence.json`. The OS save dialog is substituted, not certified.
- `before-workspace.pdf` / `after-workspace.pdf`: plain workspace print from the retained R1 verifier. These are not presented as the App export-scene evidence.

Visual review covered final neutral file controls, dark207 inspector, next input at960/text200%, and actual exported PDF. Paper/music fonts remain original VexFlow/renderer fonts, not the chrome's shared type scale.

## Checks and Retained Failures

The exact commands, counts and logs are in `return.json`. Root-wide Vitest, product-only tests and package-native/Node suites are reported separately. A successful split does not turn a failing root invocation into PASS. Responsive-baseline difference and expected manifest drift are also retained as non-PASS results.

| Gate | Actual result |
| --- | --- |
| Product-only Vitest | 48 files passed /1 skipped;611 tests passed /1 skipped |
| Root Vitest | 7 files failed,51 passed,1 skipped;12 tests failed,619 passed,23 skipped. DOM environment and Node-test collection failures retained |
| Shared package native config | 6 files /56 tests passed |
| Node-native design tools | 4 tests passed |
| Typecheck / production build | Passed |
| R1+R2 actual Electron matrix | Passed;960/1400,docks207/280/360,themes,text200%,fine32/coarse48,save/undo/native/XML/PDF |
| T04 controlled event matrix | 12 background negative controls reproduced;24 foreground sequences passed;0 failed foreground |
| Fixed-canvas / responsive snapshot | Fixed passed;responsive failed at both viewports,baseline unchanged |
| Roadmap / work queue / diff | Passed;document schema checks are not complete parity approval |

Tests are not added together across overlapping invocations. `protected-contracts.json` verifies unchanged command/schema/serializer,R1 CSS and snapshot baseline hashes against the base commit. The source and artifact hashes can be regenerated with `node collect-evidence.cjs` from this directory after completing the recorded commands.

`logs/` retains the T04 initial passing run, contaminated same-task stress failures, controlled negative/foreground results, command-context reds, keyboard-focus red, toolbar-pixel red, input-layout red and the initial product-suite failure on its renamed old heading. The heading test now checks the new real heading semantically. None of these reds was removed merely because a later run passed.

## Shared Impact and Design Differences

- Reused actual `Text`, `Input`, `Button`, `IconButton`, `Select`, `Choices` and R1 Density/neutral tokens; did not introduce a copied shared component or change common source/API.
- GeometryInput was deliberately not replaced by NumberControl: its undefined/zero/commit/IME contract remains local. Endpoints retain their actual native select, so native popup appearance differs from the static design.
- R2 preview shows only three category examples; the actual seven categories and existing commands are preserved. The active toolbar remains fuller than the preview because selected-object commands were not silently converted into input defaults.
- Narrow docks retain R1 stacking and their own scroll region, rather than pretending a shared-tab redesign was requested/completed.
- The existing quick-note strip retains its own horizontal scrolling at enlarged text; the new contextual groups wrap and the document itself does not overflow. Not every quick command is simultaneously onscreen at200%.
- Fixed scale is an app workspace adapter using common Choices/Select, not a universal zoom API or engraving change.
- No common API extension is proposed without a second real consumer. A future shared field commit API would first need another actual undefined/zero/IME consumer and migration evidence.

## Unreviewed / Follow-up

- Physical Korean IME, actual OS file dialogs/menu integration, screen reader and real touch hardware remain unverified. Electron composition/keyboard and pointer emulation do not replace them.
- Enlarged chrome fonts are measured CSS200% stress, not OS-wide text scaling. Fine32/coarse48 are measured in Electron, not hardware certification.
- Existing global root test collection/configuration failures and responsive baseline differences require their own reviewed follow-up; no broad config rewrite or baseline acceptance was slipped into this task.
- Human command-frequency/usability review and representative user-score PDF/external-app exchange remain separate. The release-test fixture is synthetic, not a user's score.
- This is desktop-only. No iOS route was changed by this task, so no iOS metadata edit/check or remote upload was performed. Concurrent iOS changes belong to their owners.
- No commit, push, merge, tag, manifest publication or release was made for R2.

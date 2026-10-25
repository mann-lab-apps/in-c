# Studio R3 Stabilization Handoff

Date: 2026-10-26 (Asia/Seoul). Local implementation and verification; external/human QA remains open. No release or Commercial V1/RC approval.

## Revision and Ownership

- Original `in-c`, branch `feature/chromatics-expanded-v1-checkpoint-20260913`, observed HEAD `bcdcc40fca6656594b6bd0d5c0f7543180a41745`.
- Implementation is **uncommitted**. No commit, push, merge, tag, version bump or release was performed.
- R3 manifest SHA256 remains `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`. Initial four R3 implementation hashes matched the prior return; `revision.py` reported existing implementation/concurrent service drift. No manifest was regenerated.
- Prior R1/R2/R3 returns, the eight protected R2 files, common UI source, other worktrees, mobile code and iOS metadata were preserved. Current source hashes and protected-file checks are in `source.json`.
- `cumulative-owned-files.diff` is explicitly cumulative against Git, including pre-existing R2/R3 edits in App and previously untracked R3 files. It is not claimed to be this slice's isolated diff. This handoff describes the incremental changes.
- The goal tool reports `paused` and exposes no resume operation. Implementation was executed in this turn under the user's request without creating a duplicate goal or claiming the tool became active. This is not a background-running guarantee.

## Slice 1: Test Runner Boundaries

- Reproduced the current root failure before editing: 7 files failed, 51 passed, 1 skipped; 12 tests failed, 629 passed, 23 skipped. See `logs/root-before.log`.
- New root `vitest.config.ts` keeps product and repository scripts in a `studio` project, retaining Vitest's normal filename patterns inside `src`/`scripts`.
- The `ddirori-ui` project extends the existing package configuration at its actual package root. Its jsdom environment and `restoreMocks` policy are reused, not duplicated or changed. Standalone package tests still pass.
- Node-native design-tool tests run through `npm run test:tools`. New `npm run test:all` runs root Vitest and then the native tool tests; CI and release-workflow test steps use this aggregate command. Workflows were edited, not remotely executed.
- `vitest-inventory.json` and `inventory-check.json` verify all 57 expected Vitest files exactly once: 51 product/script files and 6 common UI files. The two Node-native files remain covered by the native invocation. Historical return snapshots are not executable product tests.
- `npm test -- <file> -t <pattern>` remains usable. Product-only selection can use `npm test -- --project studio src`; the old `--dir src` spelling should not be treated as proof that a multi-project run excluded shared UI.

## Slice 2: Keyboard Save Retry

- Actual Tab/Enter activation reproduced lost focus after the first native-save cancellation. App tests also reproduced cancellation/failure losing the retry target. `keyboard-focus-red.log` and `keyboard-renderer-red.log` are retained.
- The first-save CTA now stays mounted while busy. Existing shared Button and native-save handlers remain in use; the central in-flight lock still rejects duplicate saves.
- A first one-frame focus fix passed once but failed on repeated production runs. Waiting for the exact focus postcondition also timed out, so it was not classified as just an assertion-timing problem. The common Button's promise lock can remain disabled after parent busy clears.
- The final adapter observes the actual trigger's disabled attribute after completion. It restores focus only after the trigger is enabled, remains connected, belongs to the same document generation, and focus has not moved to another control. Observer cleanup covers request replacement, document replacement and unmount. Later score edits do not replay old focus requests.
- Four regression cases cover cancel/failure with retry focus and with deliberate focus elsewhere. Actual Chromium disable/blur is modeled explicitly in jsdom. Selection/note payload, one history edit, retry command count and undo remain checked.
- One intermediate unit run also exposed an invalid fixture precondition: wizard focus was still queued when saving began. The fixture now waits for the actual input-toggle focus before its next task. Both that failed log and the final result remain available; no assertions were removed.
- Production keyboard trace covers new-score activation, native Enter submit, N/C insertion, undo/redo, Tab to native-save, and Enter for cancel/failure/retry. Retry requires zero additional Tabs after cancellation/failure. Busy Enter does not create a fourth request; all three attempts serialize identical contents.
- Matrix setup and title-value preparation still use QA DOM setup. Later file/PDF/recovery activation uses existing QA click helpers. This is not a claim that every action or text entry in the entire runner used physical keyboard input.

## Slice 3: Busy-row and Output Review

- Actual renderer assertion reproduced the busy row growing from 66.59375px to 143.5px. Scoped R3 CSS composes the existing Progress inline, with a 20px mark; no shared component API/source or notation styles changed.
- Final 960px and 1400px tasks both measure 66.59375px ready/busy height. Native-save focus checks passed repeatedly; final runs are recorded independently of exploratory passes.
- Actual one-page A4 PDF generation, native reopen, recovery, MusicXML export, dirty preservation and manual-guide Escape focus were rerun through production renderer/preload with isolated QA IPC destinations.
- PDF rasters and MusicXML bytes match the previous R3 actual outputs at both widths. Native score semantics also match; independent score-session IDs and generated rest-event UUIDs are explicitly normalized only in the comparison, never in saved data. Within each run, saved/reopened payloads remain exact.
- Final pending/failure/success screens, transfer guide and PDF were directly reviewed. Output/source validation is not Score receipt validation, and the one-page synthetic fixture does not prove representative multi-page Score practice.

## Actual Verification

`checks.json` records command, arguments, timestamps, log and actual exit status for all 11 final sequential checks. The ten implementation/config source hashes remained unchanged throughout those checks. Full-suite execution was not combined with product/test edits or build/Electron.

| Gate | Actual result |
| --- | --- |
| Focused App/SpanProperties/keymap | 3 files; 51 passed, 130 filtered out |
| Root Vitest in `test:all` | 56 files passed /1 skipped; **688 passed /1 skipped** |
| Node-native stage in `test:all` | **4 passed** |
| Standalone common UI | 6 files /56 passed; overlaps the root count |
| Typecheck / build | Passed, config included in TypeScript checking |
| Production first-use keyboard | Passed at 960 and 1400; light/dark welcome/wizard, text200 and fine32/coarse48 emulation retained |
| R2 production regression | Passed; dock207/280/360, fit/fixed, selection/focus/scroll, input/geometry/save contracts |
| Fixed-canvas notation snapshot | Passed, baseline unchanged |
| Default responsive snapshot | **Still fails**; actual images/diff preserved and reviewed |
| Roadmap / work queue / diff check | Passed; these are not full parity certification |

Root and native-stage counts are distinct; shared/focused runs overlap the root and must not be added. Injected disk/PDF failure logs are intentional retry scenarios, not a failed final gate. Remote CI has not run because nothing was pushed.

## Responsive Difference and External Boundary

- Default responsive metrics remain different from the historical baseline: at960, actual880x466 versus expected644x620; at1400, actual680x620 versus expected804x466. Both have33 events. These are the previously recorded width/height differences, not an accepted new baseline.
- `artifacts/responsive/` preserves this run's images/diff before the fixed-canvas runner could overwrite temporary captures. Fixed-canvas images are kept separately. The compact capture also shows existing chrome/docks pushing notation below the first viewport; first-viewport density remains a product/design review item, not a resolved engraving defect.
- A read-only environment check found Score installed on the booted `DDIRORI-QA-Play-20261023` simulator. That existing shared QA device was not launched, replaced, cleared or otherwise manipulated. No dedicated interactive Score device/session was selected in this turn.
- Therefore desktop-to-mobile transfer, OS picker, Score internal copy, page readiness, persistence/reopen and annotation/practice remain **unperformed**. The generated `practice.pdf` and manual guide are available for that next independent QA task. No direct app launch, sync or receiver callback was added.
- QA IPC still replaces OS dialogs/file destinations, as in the prior R3 runner. Real OS menu/dialog, physical Korean IME, screen reader, touch hardware, representative user scores and human usability remain unreviewed. No desktop-only change required an iOS metadata edit/check.

## Next Independent Work

1. Use a dedicated disposable Score QA device/session and the generated temporary PDF. Verify transfer, picker cancellation/retry, managed copy, reopen/page state and annotation separately; do not operate another agent's shared simulator or user files.
2. Review the compact chrome/notation first-viewport tradeoff with R2 responsive policy. Change product behavior only with a focused failure/acceptance contract; do not hide the mismatch by rewriting the baseline.
3. Perform human-input review for physical Korean IME, OS save-dialog cancellation/retry, screen reader and keyboard usability. Keep these results separate from synthetic event/QA IPC evidence.

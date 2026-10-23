# Chromatics Ddirori product adoption

This continues the October 22 draft, not a release. Existing uncommitted App,
styles, notation, playback and test changes belong to the user's separate work.
Only the appearance imports/instance, four ModalBackdrop connections and recovery
opener focus capture in App are part of this design change. No engine, release
version or iOS metadata changes.

## Product boundary

| Surface | Applied | Not claimed |
| --- | --- | --- |
| Toolbar / palette | Screen tokens, density, selected / disabled / focus styling on existing commands | Catalog command/state replacement or new notation features |
| Inspector | Existing single selection, span and measure controls receive theme styling | Generic multi-selection mixed-value editing |
| Dock | Existing controls and tabs receive theme; narrow screen prioritizes score | New docking engine or arbitrary floating panels |
| Settings / mixer / dialogs | Existing product flows styled, narrow dialog bounds corrected | Hardware audio quality or every part configuration |
| Appearance | Persisted light/dark and compact/comfortable, storage failure fallback | Preferences stored in score data or cloud sync |
| Print | Appearance UI excluded; music paper/geometry unchanged | A new PDF layout engine |

The shared token/font/palette files are unchanged copies from a21ddde, with the
original OFL notice preserved. Shared catalog React components and sample state
are not copied into the score engine. Further component substitution should keep
the current product command contracts and be validated separately.

## Verification of the design-only change

Independent worktree: `/private/tmp/chromatics-ddirori-verify-20261023`, based on
7fb8178 with only staged design changes. This is not the latest product source.

- TypeScript and `npm run build`: exit 0. Development compilation only.
- Entire suite: 840 passed, 1 skipped, 63 passed files / 1 skipped, exit 0.
- Electron: 118 checks, 9 captures, exit 0. Actual native preload, isolated
  userData, native file dialogs redirected only to per-run temporary files.
- Evidence run: `run-H39C8x` under the system temporary directory's
  `chromatics-ddirori-product-evidence`. Each run writes source hashes to report.json.
- Combined worktree Electron run `run-0DYcZS`: 118 checks, 9 captures, exit 0.
  Full combined-worktree regression is being assessed separately; the independent
  pass must not be substituted for it.

The verifier checks both toolbar entry-point versions, requires actual visible
controls, uses unique output directories, compares the complete parsed native
project after save/open/save-as, and checks modal viewport bounds and stacking.
The light/dark, density, 390/840/1440 width and 100/200% text matrix is automated.
Screenshots were inspected. Native PDF from run-QkuRt1 was rendered with Poppler:
music, beams, tuplets and title visible; no tool controls in the page.

Zod PURE-comment build warnings remain. No packaging, signing, upload, merge or
push. The font license's original trailing space is excluded from diff whitespace
validation; it is not normalized.

## Reproduce

Run in the product worktree:

```sh
npm run typecheck
npm test -- --reporter=dot
npm run build
DDIRORI_PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs node scripts/verify-ddirori-product.mjs
```

The optional Playwright variable can be omitted when `playwright` resolves from
the project. `DDIRORI_PRODUCT_EVIDENCE` selects a parent directory; the verifier
creates a new run directory so stale exports cannot pass a new check.
For interactive preview after compilation:

```sh
env -u ELECTRON_RUN_AS_NODE electron scripts/preview-ddirori.cjs
```

Use the local Electron executable (`node_modules/.bin/electron`) if it is not on
PATH. This opens the actual desktop renderer with a fresh isolated profile, not
a browser mock. User projects and the normal application profile are not used.

## Backup list recovery follow-up

- A failed list request now has a named refresh icon; list loading and restore
  pending disable duplicate actions. Failed restoration keeps the list for retry.
- Six focused tests cover list retry, loading vs empty, restore retry, corrupt
  entries, closed-dialog late responses and keyboard focus restoration.
- Long native error paths previously overflowed the modal and pushed actions out
  of view. A bounded grid track and wrapping keep them readable at 390px / 200%.
  Error text uses the dark/light error token instead of inheriting ordinary text.
- Native store failure was reproduced by creating a file at the backup-directory
  location in the disposable profile. Renaming that test file allowed the real
  refresh command to recover. No bridge success stub or user file was used.
- Latest product Electron: 130 checks / 11 captures, run-MzxzXi, exit 0.
  Actual keyboard dock restoration/resizing and selection inspector included.
- Independent Electron: 128 checks / 11 captures, run-pZ6gT1, exit 0.
  The old category UI uses pointer dock restoration and has no keyboard resize;
  its report explicitly identifies that narrower coverage.
- Independent final suite: 846 passed, 1 skipped, exit 0 (319.29 seconds).
  Appearance + backup + App backup integration focused run: 14 passed.
- Combined typecheck/development build passed. Final PDF from run-MzxzXi was
  rendered with Poppler and inspected; score geometry and music were present,
  with no tool controls. Both final reports' source hashes matched inspected files.

## Combined suite caveat

The live worktree contains separate concurrent product/test changes. Its first
full run had 1,106 passes / 7 failures / 8 skips. Five failures were App's default
5-second timeout; two were passive attachment boundary assertions. The latter
suite passed all 136 tests alone; the five App cases also passed a focused rerun.
The next full run had 1,121 passes / 3 failures / 8 skips: two App timeouts and
a subsequent duplicate-DOM failure. Neither run is recorded as PASS.

A separate integration snapshot at
`/private/tmp/chromatics-ddirori-integration-20261023-zFv8mA` copies the live source
without changing it; all 160 source files were hash-compared after copying.
It is separate from the design-only verification worktree. A full run there uses
an explicit 15-second per-test limit, without modifying tests or assertions.
That run passed 1,062 tests but failed one suite before collection because this
verification copy omitted site/compositions-catalog.json. This is a failed run,
not a full pass. A fresh snapshot includes those read-only test fixtures and the
modal changes described below. Counts between live runs are not assumed identical
while other work is in progress. Neither snapshot changes the live test timeout.

The initial design commit is d1f5a22. Deployment remains outside this task.

## Modal keyboard follow-up

- Actual Electron run-N11lnZ reproduced Shift+Tab escaping command search.
  ModalBackdrop now bounds Tab/Shift+Tab, preserves child autofocus, handles
  Escape and restores the opener (or the persistent trigger of a closed menu).
- New-score draft, shortcut help, command search and autosave recovery use the wrapper and declare
  aria-modal. Their commands, score model and undo/save handlers are unchanged.
- Composing key events are stopped before nested command handlers, without
  preventing the browser's input default. Synthetic composing Escape is checked
  in Electron; this is not a claim of every OS/input-method combination tested.
- Eight unit tests cover the keyboard boundary, no-controls fallback, autofocus,
  composing keys, removed menu items and an async request's disabled opener.
  Appearance, backup and modal focused suite: 20 passed, exit 0.
- Combined Electron run-ezzXQR: 141 checks / 11 captures, exit 0. Independent
  run-v2k8J3: 139 checks / 11 captures, exit 0. The two-check difference is the
  existing product's keyboard-resize support, not skipped failures.
- Typecheck and development compilation pass in the product; independent
  development compilation passes. Latest PDF was rendered and inspected, along
  with dark desktop and narrow enlarged modal captures. At that checkpoint the
  captured hashes matched the integration snapshot's 163 source files.
- Final integration snapshot: `/private/tmp/chromatics-ddirori-final-integration-20261023-HKimrD`.
  Full suite: 1,134 passed / 8 skipped, exit 0 (573.09 seconds), with an explicit
  15-second per-test limit. This precedes the recovery modal follow-up below.
  Subsequent concurrent App.test.tsx edits are outside that frozen result.
- Independent default-timeout final suite: 852 passed, 1 failed, 1 skipped,
  exit 1 (339.06 seconds). The existing explicit hairpin paste/history case
  exceeded 5 seconds; its isolated rerun passed under the unchanged default
  limit (1.36 seconds test time). The full run remains a failure in this record.

## Recovery modal follow-up

- Electron run-NJPa6G reproduced missing safe initial focus; run-fjMmza then
  exposed lost return focus after the async entry button was disabled. Both are
  failed runs. The UI now captures the opener before reading, initially focuses
  Postpone rather than Delete, and restores the captured opener on dismissal.
- Escape uses the existing postpone operation; it does not clear the snapshot.
  The existing in-flight deletion ref blocks dismissal until deletion settles.
- Combined run-98NWPV: 149 checks / 11 captures, exit 0. Native autosave content
  is compared before/after postpone and failed deletion. The delayed clear
  failure is injected at IPC in the disposable Electron process, not claimed
  as a spontaneous storage failure. No real user profile is accessed.
- Existing App recovery/autosave/new-score/command/shortcut cases: 44 passed,
  289 not selected, exit 0. This run preceded the explicit opener capture;
  that final delta is covered by the 20 focused tests and latest Electron run.
- Latest native PDF was rendered: its PNG is byte-identical to the previously
  inspected run-ezzXQR rendering. Latest report source hashes match product code.
- Final staged-only source is extracted directly from the Git index into
  `/private/tmp/chromatics-ddirori-final-stage-20261023-Tih8AF`. It excludes the
  user's unstaged changes. Development compilation passes. The final full suite
  with the explicit 15-second limit passed 854 tests / 1 skipped, exit 0
  (318.49 seconds). Final independent Electron run-XPkwAx passed 147 checks /
  11 captures. Product source typecheck also passed after opener capture.
- The exact staged source files were byte-compared against that final snapshot.
  Shared tokens/font/palette/license still match a21ddde byte-for-byte. Both
  staged and worktree whitespace checks pass (original font license retained).
  No repository timeout setting, test assertion or skip policy was weakened.

## Remaining boundaries

This applies the design to existing product controls; it is not a wholesale
replacement with catalog components. Generic mixed-value multi-selection,
arbitrary docking and new notation features remain out of scope. Hardware audio,
release signing, every OS/input-method combination and assistive technology
screen-reader certification are not implied by these checks.
Existing user changes in App/styles/notation/tests remain uncommitted and are
not included in these focused design commits. No production profile, signing,
packaging, metadata upload, push or merge was performed.

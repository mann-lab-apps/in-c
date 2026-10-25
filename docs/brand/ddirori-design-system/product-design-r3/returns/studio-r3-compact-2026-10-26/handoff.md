# Studio R3 Compact Workspace Handoff

2026-10-26 (Asia/Seoul). Local implementation and simulator receipt QA, with the
review gaps below. No release, Commercial V1 or RC approval.

## Revision and ownership

- Original `in-c`, branch `feature/chromatics-expanded-v1-checkpoint-20260913`,
  HEAD `bcdcc40fca6656594b6bd0d5c0f7543180a41745`. All work is **uncommitted**.
  Root package remains `0.1.0-alpha.14`. No remote actions or version changes.
- R3 manifest SHA256 remains
  `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`.
  Starting hashes matched the preceding stabilization return. Revision checking
  reported implementation/concurrent-service drift; the manifest was not rebuilt.
- Existing R1/R2/R3, Play/mobile/brand edits and other worktrees were preserved.
  No common component API/source, notation renderer, SpanProperties, keymap,
  iOS product source or iOS metadata was changed in this slice.
- `source.json` records the actual checked source hashes and preserved files.
  `slice-only.diff` compares the six implementation/QA files to this task's
  starting copies, including a new-file diff for the compact verifier. It is
  isolated from pre-existing R2/R3 edits; documentation and return scripts are
  additional files recorded by the artifact manifest.
- Goal lookup returned no current goal, so this explicit request created a new
  matching active goal. The earlier paused-state history was not falsely reported
  as a resume. Goal status is separate from running processes.

## Applied backlog and command boundaries

1. Note details now start collapsed in a native disclosure. Explicit user choice
   persists at `chromatics.note-details.v1`, independently of score/native data.
   Primary next-input controls remain outside it. The existing detailed command
   handlers, enabled states, selection and history are unchanged.
2. At 761–1023px the two docks form a two-column band with a 10rem maximum height
   and independent scrolling. The canvas spans both columns below. A single
   visible dock spans both columns. Desktop widths and existing saved200–360px,
   default280px preferences are retained rather than rewritten to compact widths.
3. Keyboard scrolling reserves the actual focus-ring extent with existing spacing
   tokens. Print media excludes the new disclosure. No glyph, font metrics,
   engraving geometry or export model was changed.
4. Actual generated PDF receipt was exercised on a new dedicated Score simulator.
   The Studio manual guide remains manual; no receiver callback, protocol,
   automatic sync or Score product feature was added.

| Existing path | Adapter behavior and preservation |
| --- | --- |
| Primary next input | Existing duration/dot/accidental/input handlers remain immediately accessible |
| Detailed note editing | Real `음표 상세 설정` summary opens the original controls; native Tab/Enter and persisted reopening are checked |
| Selected properties | Existing GeometryInput, undefined/0 semantics, commit/undo/IME contracts remain in the R2 regression; compact focus scroll keeps selection and history |
| Dock visibility/width | Existing state and saved values retained; display reflow does not mutate score or native payload |
| Native project save | Actual first-use save/cancel/failure/retry and reopen retained; PDF success does not clean the project |
| PDF→Score | Exported file is manually downloaded, selected through the OS picker and copied by Score; no product claim of automatic receipt |

## Failure-first and actual geometry

- Before: at960x1000 the first staff started at1454.9765625px, below the viewport.
  The viewport verifier failed. After: staff913–953px and actual note ink
  957.5–967.5px. At1400 the staff is793–833px and note ink837.5–847.5px.
  Default SVG dimensions remain880x466 and680x620 respectively, with33 events.
- The new App regression first failed because the disclosure did not exist.
  One existing App assertion then correctly failed because the detailed section
  was no longer initially visible. Tests now traverse the actual category and
  summary before detailed commands; assertions were not removed and no hidden
  compatibility control was introduced. Earlier logs are retained.
- Production keyboard QA reaches the summary in13 Tabs, opens it with Enter,
  reaches voice2, verifies preference after reload and retains focus when closed.
  Dock-field traversal uses DOM focus only to establish its starting point, then
  native Tab. This is not physical keyboard or IME certification.
- Initial field-box containment missed a clipped4px focus outline. A stronger
  production assertion failed; token-based scroll padding/margin now leaves the
  entire ring inside the compact panel. The selected event remains `m1-c4` with
  zero edits. Final property-focus captures were directly reviewed.
- Print-media emulation initially exposed the new summary. The explicit print
  exclusion now passes. Actual App PDF output had not failed, since export mode
  already hid that wrapper; this distinction is kept in the evidence.

## Actual verification

`checks-reviewed.json` records all ten final sequential commands with timestamps,
logs and exit-zero receipts. Six implementation/QA hashes stayed stable throughout
the run. Product edits, build and Electron were not run concurrently with the
global suite. Earlier `checks.json` is retained as an earlier checkpoint.

| Gate | Result and scope |
| --- | --- |
| `npm run test:all` Vitest | 56 files passed /1 skipped; **689 passed /1 skipped** |
| Node-native stage | **4 passed**, separate from the Vitest count |
| Typecheck / production build | Passed |
| Compact production renderer | 960/1400, first actual note ink, no horizontal overflow, disclosure/persistence, focus-ring scroll, print exclusion |
| Theme/density stress | Dark960, chrome text200 and emulated coarse48 passed; not OS/hardware certification |
| Existing R2 production | dock207/280/360, fit/fixed, selection/focus/scroll, geometry, IME adapter and save failures passed |
| First-use production | Actual new score, input, undo/redo, native save/retry/reopen, PDF dirty boundary and recovery passed |
| Fixed-canvas notation | Passed; baseline unchanged |
| Default responsive snapshot | **FAIL retained and reviewed**, separated from fixed-canvas and compact acceptance |
| Roadmap / work queue / diff check | Passed; not overall parity certification |

The default one-page PDF raster and MusicXML bytes match the prior R3 output.
Native score semantics match after excluding independent session ID and generated
rest UUIDs only in comparison; stored/reopened payloads remain untouched.
`collect-evidence.cjs` verifies these comparisons and produces source/artifact
hashes. Captures include viewport, theme and runtime metrics in the adjacent JSON.

## Responsive policy and visual review

Historical default responsive dimensions still differ:960 actual880x466 versus
expected644x620,1400 actual680x620 versus expected804x466. The before/after compact
change does not alter those canvas dimensions. `artifacts/responsive/` preserves
the current failing diff and screenshots before temporary fixed-canvas captures
could overwrite them. No baseline was regenerated or approved.

Current policy has three separate gates: fixed-canvas checks pure engraving;
compact acceptance checks real viewport access and ink visibility; the historical
responsive snapshot remains a visible failure pending product/design approval of
the intended dock/canvas dimensions. Fixed-canvas success does not turn that
failure into a pass. Reviewed actual960/1400 and focus-ring captures show the
first system without changing paper/glyph layout. At1000px height the compact
fixture's first note is near the bottom; shorter windows still require scrolling.
The bounded docks introduce internal scroll, an explicit tradeoff for canvas space.

## Actual PDF→Score receipt

- Built existing Score for a dedicated iPhone17Pro simulator, iOS26.5, bundle
  `com.mannlab.inc.clef`, version1.0.0/build14. Source/binary/kernel hashes are in
  `score-device.json`; no source or metadata change was needed. The existing Play
  QA simulator was not operated, replaced or reset.
- The actual Studio wizard generated64 measures. A requested PDF target3 produced
  **two actual A4 pages**; the receipt records the actual result, not the request.
  Both source-page renders and the actual viewer captures are retained.
- On the dedicated simulator, Safari downloaded the synthetic PDF from a
  localhost-only fixture page using its native linked-file download action.
  Localhost is a QA transport, not a product feature or proof of physical
  desktop-to-phone transfer. Earlier inline/share attempts did not advance
  reliably and are retained as diagnostics, not declared product defects.
- Actual Score import opened the real iOS document picker. Cancel returned to the
  empty0-item library; retry reopened the picker and selected the downloaded
  65KB file. Score rendered1/2, then an actual pointer swipe displayed2/2.
- A pointer-drawn annotation on page2 was saved by leaving the viewer. The library
  showed one score and last page2. Terminating/relaunching only this Score process
  and reopening the actual row restored2/2 and the visible stroke. Read-only
  inspection confirmed lastPage2 and the exact same annotation layer:one stroke,
  pageNumber2,11 points. No preferences/model/import files were injected.
- Source and Score-managed copy SHA256 are identical:
  `816f09251d1c865999049f2ca7a390a8b8cecd6b13973b6e35a502e7fa3e76ff`.
  `score-receipt.json` and `verify-score-receipt.cjs` independently check managed
  path, file hash, actual page count, cold-reopen identity and annotation equality.
- `34-score-cold-reopen.png` visibly proves2/2 and the retained stroke. Capture27's
  label says page two but that tap did not advance; capture28 is the actual
  successful page change. Trace labels are not substituted for visual evidence.
- The desktop first-use runner's `scoreReceiptVerified:false` remains correct for
  its own sender-only scope. The separate simulator receipt is the evidence for
  receiver success. PDF export does not mark the Studio project clean.

## Shared impact, limits and next work

No common API extension, shared-source copy, iOS product/metadata edit or manifest
rewrite. This composes existing disclosure, workspace state, tokens and handlers.
The dedicated simulator is shut down and the temporary HTTP server stopped;
no owned verification or transfer process is left running. The disposable device
and its synthetic data are retained for reproducibility, not erased.

Remaining review: historical responsive baseline policy; shorter desktop windows;
physical desktop-to-device transfer and OS save dialogs; physical Korean IME;
screen readers; touch/Apple Pencil hardware; representative user scores and human
usability. Emulation, synthetic fixtures and QA IPC do not certify those areas.
Remote CI/release was not run. This is a local R3 stabilization return, not a claim
that Commercial V1 or RC is complete.

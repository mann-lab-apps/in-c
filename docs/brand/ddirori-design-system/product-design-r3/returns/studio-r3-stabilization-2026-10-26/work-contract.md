# Studio R3 Stabilization Contract

Date: 2026-10-26 (Asia/Seoul). Implementation is uncommitted; no release authorization.

## Starting State

- Worktree: original `in-c`; branch `feature/chromatics-expanded-v1-checkpoint-20260913`.
- Observed HEAD: `bcdcc40fca6656594b6bd0d5c0f7543180a41745`.
- R3 manifest SHA256: `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`.
- All four implementation hashes in the prior `studio-product-design-r3/source.json` matched before this task. That return is historical and will not be overwritten.
- `revision.py` reports existing Studio, R3 README and concurrent Play/Score drift. No manifest regeneration is authorized.
- Existing R2/R3, Play, brand and mobile changes are preserved. Other worktrees, secrets, iOS metadata, package version and common UI source are outside this implementation.
- Goal tool still reports `paused`. No supported resume tool is available; this turn executes the user's request without claiming the goal became active or promising background continuation.

## Acceptance and Evidence

| Slice | Contract | Evidence |
| --- | --- | --- |
| Runner | Product and repository-script tests keep Vitest semantics; shared UI uses its own DOM configuration; Node-native tool tests keep `node:test` | Current root failure log, corrected root run, standalone shared run, Node run, inventory comparison |
| Runner | One documented aggregate command executes all three domains and CI does not silently lose native tests | Package/workflow diff and actual aggregate invocation |
| Keyboard | Actual first-input, native save cancel/failure/retry preserve keyboard access and return usable focus | Failure-first App and production renderer keyboard trace |
| Contracts | Commands, undo, snapshot identity, IME, selection and output semantics remain intact | Focused tests, typecheck, production checks, relevant broader regression |
| Handoff | PDF source success is not Score receipt; device/permission restrictions are reported | Generated temporary PDF, environment inspection and explicit performed/unperformed boundaries |

## Exclusions and Execution

No engine/schema/bridge rewrite, shared API expansion, silent visual baseline update, user-file modification, commit, push or release. Do not run build/Electron or edit product/tests during a full suite. Use existing commands and adapters; distinguish verified regression coverage from product fixes. Keep new evidence and current source hashes here rather than replacing old logs.

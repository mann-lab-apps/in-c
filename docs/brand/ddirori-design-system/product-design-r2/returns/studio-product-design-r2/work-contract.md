# Studio Product Design R2 Work Contract

- Requested scope: T04 first, T02 input/selection command mapping and inspector hierarchy, T03 workspace/notation policy, T01 R1 preservation.
- Starting product HEAD: `827ad18203e673b1e923d00cbcf0fd7f3af755d7`; branch `feature/chromatics-expanded-v1-checkpoint-20260913`, original `in-c` worktree.
- Initial R2 revision check: 590 hashes verified; historical design manifest remains unchanged. Implementation creates new return evidence rather than overwriting design captures.
- Existing shared package and design edits are owned by other work. No iOS route/metadata, schema, bridge or engraving engine replacement is planned.

| Contract | Evidence to collect |
| --- | --- |
| T04 root cause | Unmodified product event traces: original synthetic sequence, focus-before-input control, Electron keyboard insertion control; failed records retained |
| T02 input/selection | Actual existing handlers before/after, App regression, score snapshot and undo count; no mixed-span claim |
| Geometry | undefined/0, field ranges/step, endpoint validation, reset, stale selection drafts, IME/Escape propagation |
| T03 | Actual responsive viewport vs fixed input canvas, dock widths/visibility, selection/caret/scroll observations, existing zoom availability |
| Persistence/output | Actual native/MusicXML serializer, failed save and retry, reopen, PDF export versus workspace print clearly identified |
| Accessibility | 960/1400,207/280/360, light/dark, chrome text200%, fine32/coarse48, keyboard and focus return; physical IME/OS/SR scope explicit |
| Gates | typecheck, related App/SpanProperties/core/notation, product suite, root invocation and package-native results reported separately |

Implementation status and all results will be reported in the final return; this contract is not a PASS record.

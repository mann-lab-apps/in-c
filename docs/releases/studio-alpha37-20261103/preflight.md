# Studio alpha.37 release preparation

alpha.35 remains unpublished after Linux packaging failed on ignored piano assets, macOS reported two 15-second UI timeouts with two following failures, and Windows reported three XSD byte-hash failures plus a PDF guide query failure. alpha.36 included the piano bank and retained failed-test logs while suppressing successful-test console noise. Its workflow was cancelled before publication when the remaining Windows failures were identified. Neither tag is moved, deleted or reused.

The XSD provenance/bytes/expected hashes are unchanged. A scoped `.gitattributes` rule disables checkout text conversion for the three pinned XSD files. The existing hash assertions remain intact. The Windows source checkout will be simulated in a new independent clone with `core.autocrlf=true` before publication.

The existing PDF-to-Score guide test now controls the native PDF response explicitly. It asserts one native save request, no premature result, resolves the native response inside `act`, then checks the actual result region's public guide button. Keyboard, dirty-state, manual transfer dialog and no automatic Score/project-save assertions are retained. The test timeout is unchanged; the original Windows failure is preserved separately. No product handler, engine, schema or output geometry changes are introduced by this correction.

The previous fresh alpha.36 checkout passed asset verification, build, five focused macOS-failure cases, Studio profile/fixed-canvas, actual packaged bridge/native/PDF/MIDI and 12-second muted offline piano QA. Those results are distinguished from the final alpha.37 checks. The original workspace, other worktrees, secret files and iOS metadata remain untouched.

## Final local alpha.37 result

The independent clone uses `core.autocrlf=true`. All three original XSD hashes match without modifying the schema or provenance. Focused XML 39, UI 6 and Node-native 5 checks pass. Fresh build/typecheck, profile/fixed-canvas, unpacked arm64 native/PDF/MIDI/backup smoke and 12-second offline piano pass. Full `CI=true GITHUB_ACTIONS=true npm run test:all` passes: 352 Vitest files / 3767 tests, external opt-in 1 file / 1 test skipped, Node-native 5 passed, 534.90 seconds. The tracked checkout remains clean. Baselines are unchanged.

The source/tag commit is `8fc5e6a134d810db0da2dc5ea3a0265ebb9983f0`. Log hashes, checkout conditions and exact commands are represented in local-validation.json and the referenced raw output files. Previous failed/cancelled attempts are distinguished in previous-attempts.json. The remote Release run is https://github.com/mann-lab-apps/in-c/actions/runs/41577135779 ; at this record it is still testing. Publication and signed universal artifacts are separate pending results.

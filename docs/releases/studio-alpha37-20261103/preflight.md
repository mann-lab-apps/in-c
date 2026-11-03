# Studio alpha.37 release preparation

alpha.35 remains unpublished after Linux packaging failed on ignored piano assets, macOS reported two 15-second UI timeouts with two following failures, and Windows reported three XSD byte-hash failures plus a PDF guide query failure. alpha.36 included the piano bank and retained failed-test logs while suppressing successful-test console noise. Its workflow was cancelled before publication when the remaining Windows failures were identified. Neither tag is moved, deleted or reused.

The XSD provenance/bytes/expected hashes are unchanged. A scoped `.gitattributes` rule disables checkout text conversion for the three pinned XSD files. The existing hash assertions remain intact. The Windows source checkout will be simulated in a new independent clone with `core.autocrlf=true` before publication.

The existing PDF-to-Score guide test now controls the native PDF response explicitly. It asserts one native save request, no premature result, resolves the native response inside `act`, then checks the actual result region's public guide button. Keyboard, dirty-state, manual transfer dialog and no automatic Score/project-save assertions are retained. The test timeout is unchanged; the original Windows failure is preserved separately. No product handler, engine, schema or output geometry changes are introduced by this correction.

The previous fresh alpha.36 checkout passed asset verification, build, five focused macOS-failure cases, Studio profile/fixed-canvas, actual packaged bridge/native/PDF/MIDI and 12-second muted offline piano QA. Those results are distinguished from the final alpha.37 checks. The original workspace, other worktrees, secret files and iOS metadata remain untouched.

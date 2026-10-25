# T04 Event and Focus Diagnosis

## Finding

The current failure can be reproduced by the Electron harness driving a document which has lost OS focus. After Escape has already blurred the field, native value injection is still possible in that inactive document. Calling `input.focus(); input.blur()` there does not produce `focusin`/`focusout`. React therefore receives no blur with which to validate the injected99. The resulting DOM is99, validity=false, aria-invalid=false, exactly the previously reported symptom.

This is an automation focus-precondition defect. No GeometryInput product mutation is required by the isolated result. The historical R2 failure did not record window focus, so its exact cause cannot be retroactively proven from that log alone; the same observable failure is now reproduced with native focus control and event traces.

## Experiments Before Product Changes

- Initial legacy/focused/native-keyboard run:36 sequences passed. Passing once was not treated as a diagnosis.
- Added same-task stress while tracing focus:45 of48 sequences failed after the window lost focus. The first loss generated a real blur of a valid3 draft before composition began, producing one legitimate score edit. Subsequent failures share that changed score; they are not45 independent product failures. Raw records are preserved.
- The trace at the first failure shows `documentFocused:false`, then value injection and no focusout99. The trace before the loss contains the expected focusin/input/blur/focusout and linked error.
- An initial `BrowserWindow.blur()` control did not reliably deactivate the only app window; its precondition assertion failed. That attempt is not counted as evidence for background validation.
- A second isolated QA window provides deterministic native focus control.12 background sequences reproduce the missing-event symptom;12 focused synthetic sequences and12 Electron keyboard insertions preserve automatic value, selected span, command0 and linked validation error. Physical Korean IME is not simulated by `insertText`.

## Harness Correction

- Establish the QA application's/window's native focus and require `document.hasFocus()` before driven interactions. A failure to focus is a named harness precondition error.
- Focus a number/select field before injecting its input/change sequence.
- Continue to assert strict invalid=true, original value restoration, error description, selection preservation and command0 for foreground editing.
- The background-control test has the opposite, explicit purpose: require the missing focusout and invalid99 state while preserving score/selection. It is recorded as a negative control, not an approved product edit path.
- Use animation frames for React/render observations and event-driven focus checks. The validation assertion is not weakened and an arbitrary longer validation sleep is not used as the fix.
- Retain previous red logs and event traces. Do not modify historical design evidence or manifest.

## Product Regression

`SpanProperties.test.tsx` now covers compositionstart, composing Enter, compositionend, Escape, invalid99, blur, original automatic value, linked range/unit error, command0 and no selection/global-key propagation. GeometryInput's undefined/0/range/step/commit semantics remain unchanged.

Final execution counts and exact source hashes belong to the return's validation inventory. This finding does not certify physical IME, OS dialogs or screen-reader behavior.

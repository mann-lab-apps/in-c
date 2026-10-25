# Slice 1 Checkpoint

The original960px first staff began at1454.9765625px, outside the initial1000px viewport. After the note-details disclosure and bounded two-column compact dock band, first staff top is913px and measured first note ink bottom is967.5px. At1400px the first staff top is793px. SVG widths remain880/680px respectively, with both saved dock widths280px.

`checks.json` contains actual exit-zero receipts for typecheck, build, production compact keyboard/persistence/dark/text200/coarse QA, existing R2 geometry/input/workspace QA, actual first-use project/reopen/PDF QA, fixed-canvas notation, root `test:all`, both document verifiers and diff check. Root Vitest:689 passed /1 skipped; Node-native:4 passed. Sources were unchanged throughout those sequential checks. This is a local slice result, not release approval.

Regression setup now explicitly expands the real summary before detailed note editing; no hidden compatibility control was added. Native Tab/Enter can open the summary, reach voice2, reopen with the preference preserved, and close with summary focus retained. Keyboard traversal scrolls the last property into the compact panel without changing selection/history. Dark, text200 and coarse48 checks passed; these are not physical-input certification.

Visual review found a follow-up: the last property's box fits but its outline can be clipped at the compact panel bottom. The next regression will measure the actual focus-ring extent rather than weakening the field-visibility condition. Previous logs/captures are retained. Score receiver QA and default responsive baseline reconciliation remain open.

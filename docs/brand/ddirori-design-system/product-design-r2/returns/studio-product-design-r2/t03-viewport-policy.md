# T03 Viewport and Focus Policy

R1 neutral chrome, stored dock widths200-360/default280 and panel visibility remain the workspace base. The prior960px responsive difference is retained as historical evidence, not overwritten with a new baseline.

## Actual Modes

- Default **fit width** uses the existing ResizeObserver-driven notation layout. At960px docks stack, so the actual notation input width differs from a desktop side-dock layout. Line wrapping may change. Selection identity, event address and sequential input tick are not reset.
- **Fixed scale** is a new local workspace option. Its page content input width is900px (996px page including original48px side padding). User percentages75/100/125/150/200 scale the view, with horizontal scrolling inside the score canvas. Changing dock width or viewport does not reflow this fixed notation input.
- Preference: `chromatics.notation-view.v1`, independent of native score, MusicXML, undo and print settings. Existing users without the key retain fit width. The shared Choices/Select controls compose the view adapter; GeometryInput is not repurposed for zoom.
- Fixed scale is a screen rule. The App's PDF export scene uses its existing print plan, not the workspace width/zoom. Chromium export-scene PDFs and plain workspace print are reported separately.

## Focus and Scroll

- When a keyboard-focused SVG note/span redraws, restore keyboard focus to the current logical selected target, using part/staff/measure/voice to disambiguate repeated event IDs.
- While the focused target is in the canvas, reflow keeps that target visible and anchors the viewport to its prior visible position, clamped to the viewport if necessary.
- While a dock or view field is focused, that field owns focus/scroll intent. A layout change must not jump back to a selected note and hide the editing field. The selected event/span identity remains unchanged even if it is outside the current screen.
- The existing renderer does not expose an independent insertion-caret glyph. Verify the real selected event/address and pending input summary/tick; do not label a mock cursor as a completed engine caret. Playback's real overlay remains separate.

## Evidence Separation

1. Fixed-canvas snapshots compare unchanged engraving metrics with identical input widths; baseline updates remain forbidden in that mode.
2. Responsive matrix measures actual960/1400 viewports and207/280/360 docks. It records the resulting SVG dimensions, selection/address, active field and scroll positions.
3. Canvas-focus reflow is tested before any capture helper scrolls to reveal the target. A screenshot helper's scroll is not anchoring evidence.
4. A field-focused matrix may explicitly reveal the selected note for the image, but metrics are collected first and field/selection policies are evaluated separately.
5. Pending input defaults and insertion address are compared before/after workspace changes; command history must remain unchanged.

Final numerical results, screenshots and remaining limitations are recorded in the return inventory after the implementation gates finish.

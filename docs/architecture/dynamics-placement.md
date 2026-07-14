# Dynamics and Expression Placement

Last reviewed: 2026-07-14

Dynamics, hairpins, fermatas, articulations, and staff text share the same practical rule in Chromatics: the model keeps the musical intent attached to score events, while the renderer reserves enough visual space that the mark is readable at both desktop and narrow widths.

## Current model

- Dynamics are represented as score expressions linked to a measure and event position.
- Hairpins carry start and end event ids so imported MusicXML can preserve a visible span.
- Fermatas and articulations are note-level marks.
- Staff text is imported as an expression and rendered near the staff rather than treated as playback text.

This is intentionally sufficient for the alpha.4 editor and MusicXML round trip. More precise playback semantics can be layered on later without changing the score-facing placement contract.

## Placement contract

- First systems must reserve enough top margin for rehearsal marks and fermatas.
- Below-staff dynamics and text must stay inside the render width and page bounds.
- Narrow layouts must wrap systems before measure content reaches the right edge.
- Release QA fixtures should cover at least one dynamic, one hairpin, one fermata, one articulation, one staff text expression, ties, rests, and a whole note.

## Verification

The release QA fixture lives at `src/musicxml/fixtures/release-qa.musicxml`.

The regression coverage is intentionally lightweight:

- `musicxml.test.ts` checks that the fixture imports dynamics, hairpins, fermatas, articulations, staff text, ties, rests, and whole notes.
- `system-layout.test.ts` checks first-system top margin and desktop/narrow viewport bounds for the same fixture.
- The release checklist points maintainers to this fixture before tagging a build.

## Later refinement

Do not promote this into a larger layout engine until a real score fails the current contract. The next useful extension would be collision avoidance between stacked below-staff expressions and lyrics or multiple staves.

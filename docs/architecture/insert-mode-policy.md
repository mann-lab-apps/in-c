# Insert Mode Policy

작성일: 2026-07-14

## Decision

Chromatics keeps overwrite mode as the default. Insert mode can be added later as
an explicit mode, not as the default note input behavior.

## Why Overwrite Remains Default

- Measures stay exact-filled without surprising downstream shifts.
- Current duration, tuplets, ties, range paste, and delete commands already assume
  stable measure rhythm.
- New users can replace a rest with a note without needing to understand hidden
  timeline edits.

## Future Insert Mode

Insert mode should be a visible toggle with an editor status label. The insertion
point is the input cursor or the selected event start. The inserted duration pushes
later events only inside the same voice and measure.

The command must fail with a clear message when:

- the pushed content would exceed the measure duration;
- the selected span crosses a tuplet group boundary;
- the push would split a tied note without an explicit tie policy;
- the measure contains multiple voices and the active voice is ambiguous.

## First Implementation Slice

1. Add an `insert` editor mode state.
2. Implement same-measure, same-voice insert before selected event.
3. Fill any remaining gap with rests.
4. Add undo/redo tests and exact rhythm tests.
5. Leave cross-measure insertion and tuplet insertion for later.


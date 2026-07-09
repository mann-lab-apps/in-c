# Measure Selection And Measure-Level Edits

Measure selection is a structural selection mode. It is separate from event
selection and is entered by clicking an empty area or selection region inside a
measure.

## Selection Priority

- Clicking a note or rest selects that event.
- Clicking measure background selects the measure.
- Event click handling stops propagation so event selection does not also select
  the containing measure.
- Measure selection clears note input state and returns the editor to select
  mode.

## Delete Policy

Delete and Backspace are selection-sensitive.

- Event selection deletes or merges the selected event through the rhythm delete
  path.
- Range selection deletes same-measure, same-voice event ranges through the
  rhythm delete path. The editor applies the selected events from right to left
  and wraps the edits in one undoable batch command.
- Range deletion is intentionally limited to one measure for now. A range that
  crosses a measure boundary is rejected with user-facing guidance instead of
  guessing how to rebalance neighboring measures.
- Measure selection deletes the selected measure.
- The last remaining measure is never deleted. The editor keeps the measure and
  shows `Cannot delete the last measure.`
- Deleting a measure clears note input state.
- After deleting a measure, selection moves to the next measure when available,
  otherwise the previous measure.

The toolbar delete-measure button uses the active measure. When an event is
selected, the active measure is the containing measure. When a measure is
selected, the active measure is that measure.

## Range Edit Scope

Range selection is event-level selection, not measure selection. It is useful
for contiguous notes and rests inside the same voice.

The supported range commands are deletion and simple copy/paste:

- The selected range must be contiguous in voice order.
- Every selected event must be in the same measure and voice.
- The command must keep the measure exactly filled.
- Copy/paste is limited to same-duration target ranges.
- Full-measure rests, tuplets, and tied notes are excluded from range clipboard
  editing for now.
- Undo and redo treat each range deletion or paste as one edit.

Batch edits are not part of this first range-editing scope. They need explicit
operation policies, target-capacity validation, and relation handling before
they can be safe.

## Context Menu Direction

A future measure context menu should begin with these actions:

- Insert measure after
- Delete measure
- Duplicate measure
- Clear measure
- Change time signature
- Change key signature

Later additions can include barline/repeat settings and measure-level
copy/paste once block selection is available.

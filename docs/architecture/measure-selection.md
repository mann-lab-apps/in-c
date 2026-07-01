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
- Measure selection deletes the selected measure.
- The last remaining measure is never deleted. The editor keeps the measure and
  shows `Cannot delete the last measure.`
- Deleting a measure clears note input state.
- After deleting a measure, selection moves to the next measure when available,
  otherwise the previous measure.

The toolbar delete-measure button uses the active measure. When an event is
selected, the active measure is the containing measure. When a measure is
selected, the active measure is that measure.

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

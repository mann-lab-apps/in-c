# T02 Actual Command Mapping

Baseline: `827ad18203e673b1e923d00cbcf0fd7f3af755d7`. These are existing engine paths; R2 adds explicit context and a discoverable entry to the same note-input handler. No new score command/schema is introduced.

| Control / key | Sequential input active | Event selected, input inactive | Measure/range / span / none policy |
| --- | --- | --- | --- |
| N | `toggleNoteInputMode` exits input, leaves score unchanged | Same handler creates `NoteInputState` from selection and remembered duration | A valid anchor is required. Span keyboard remains reserved; explicit input button clears span selection and uses the existing underlying anchor |
| Duration1-7 | `setDurationValue` + local input duration; tuplet ratio preserved; command0 | `buildDurationCommand` + existing rhythm validation; remembered duration updates only on success | Measure/range updates remembered input duration only. Existing span keyboard guard remains |
| Dot . / , | Local input dots; disabled in pending tuplets; command0 | `buildDotCommand`, existing rhythm/limit checks, undo1 when effective | Existing enablement unchanged; no mixed editing added |
| Flat/natural/sharp | Local pending accidental; command0 | `buildAccidentalCommand` on selected note/chord under existing policy | Rests/ranges retain the original disabled policy |
| R / 0 | `enterRest` sequential insertion, advances input tick; command under existing pending-tuplet contract | `convertSelectionToRest`, same note duration and existing undo | Existing same-measure range conversion limitations remain. The new explicit “쉼표 넣기” button is available only while input is active |
| Voice Cmd/Ctrl+Alt+1-4 | `switchActiveVoice` retargets input; missing voice is created by the existing `staff-measures.replace` command | Same handler switches selected event/address | Existing part/staff/voice rules remain; voice creation is a real score mutation, not a workspace-only preference |
| Staff selector | `switchActiveStaff` changes input target | Same handler changes selected address | Existing empty-measure and target validation unchanged |
| Fermata/articulation/chord/ornament | These continue to edit the selected existing object, not input defaults | Existing attachment commands | They remain separately identified as selected-object actions; not silently merged into input defaults |
| Span endpoints | Existing `buildSpanEndpointCommand` validates anchors and order | Single selected span only | Unsupported current endpoint remains visible; no automatic sorting or mixed span editor |
| Span geometry | App-owned GeometryInput, `buildSpanEngravingCommand` | Same single-span command | Empty=undefined/automatic; offset0 is explicit; height0 invalid; offset[-8,8],height[0.5,8],step0.25 sp |
| Span reset | `onEngravingChange(undefined)` | Whole selected engraving resets; undo1 if effective | Reset is not zero. Existing no-engraving disabled policy remains |
| Save Cmd/Ctrl+S | Existing native-envelope/MusicXML routing; pending tuplets blocked | Same handlers and save snapshot policy | Only real bridge success clears dirty; failure/cancel preserves document, selection and undo |

The editor always retains an event, measure or range anchor. “No selection” in SpanProperties means no selected span; it does not delete the editor anchor or reset pending note input. Selecting a span explicitly exits sequential input, as before. Clearing a span selection does not reset input defaults.

The new inspector title identifies selected notation separately from the next-input summary. The active duration/dot/accidental controls display their real destination. Their dual command behavior is preserved rather than changing an engine edit into a default-only setting through wording.

Native Select and shared combobox/listbox keyboard events are now recognized as form editing targets, so Arrow keys/Escape stay within the field. The global score keymap remains unchanged outside those fields.

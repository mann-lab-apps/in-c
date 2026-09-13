# Chromatics Expanded Commercial V1

Decision date: 2026-09-12. Authority: explicit user scope expansion.

This scope supersedes earlier native-format exclusions and MIDI/pitch-first,
templates/styles, object filters, image export and workspace postponements.
Required means implementation and acceptance evidence, not a research placeholder.
MusicXML/MXL interchange is retained. A first native open/save/Save As slice is
implemented as of 2026-09-13; see [Native format](chromatics-native-project-format.md)
for its precise acceptance and remaining work. No RC or feature-complete claim is made.

## Reference Audit

Checked 2026-09-12 against the live MuseScore Studio handbook. The installed
reference baseline was previously verified as MuseScore 4.7.5; this is not a
claim that it is the latest release. Handbook content can move independently.

- [File export](https://handbook.musescore.org/file-management/file-export):
  parts are chosen separately from export format; MusicXML and image output
  are exchange operations. Chromatics must not confuse these with primary save.
- [Input by duration](https://handbook.musescore.org/basics/input-by-duration-mode):
  choose pitch first, then duration to enter it; keyboard and MIDI chord entry
  are reference behaviors, not evidence of Chromatics support.
- [Opening and saving](https://handbook.musescore.org/file-management/opening-and-saving-scores):
  native document storage and interchange are distinct user workflows.

Before each remaining area is implemented, record its exact official reference
and observed behavior here or in its evidence entry. Missing research is a
prerequisite task, not permission to postpone Required implementation. Finale
version is unconfirmed; do not invent a Finale 18 reference or app-export fixture.

## Required Contracts

All rows are V1 Required. IDs map to the existing work queue, which owns live
status. Each acceptance needs code tests and, where stated, separate human QA.
Tests named below are planned unless linked from the evidence log.

| ID | Workflow and current gap | Dependencies | Acceptance and failure criteria | Evidence required |
| --- | --- | --- | --- | --- |
| CV1-X-PART-XML | Export selected part; XML currently saves full score only | Existing part projection, serializer, file bridge | Export only chosen staves/events plus global marks; preserve transpose/voices; do not change dirty state, primary path or original file; reject source overwrite | Projection round-trip, App pending/cancel/failure tests, disk guard, Electron export/reopen; native dialog separately |
| CV1-X-NATIVE-SCHEMA | Portable native project missing | Model validation audit | Versioned score, layout, part overrides and project settings; schema limits, migration, unknown-future-version rejection; exclude machine-local paths/devices | Invalid/valid/migration unit fixtures; pristine-machine round-trip |
| CV1-X-NATIVE-LIFECYCLE | Native open/save/recovery missing | CV1-X-NATIVE-SCHEMA | Open/save/resave/recent/recovery; atomic replacement and backup; async edits remain dirty; preserve XML/MXL interchange and explicit Save As | Real disk failure/retry, App races, package smoke; native dialogs separately |
| CV1-X-SPAN-PROPERTIES | Direct selection/endpoints and numeric shape first slice implemented; segment/collision contracts remain | Native v2 geometry, v1 migration | Select span, change endpoints/side/geometry, reset automatic placement, undo/redo/delete; invalid cross-part endpoints rejected | Core/App/renderer tests, native round-trip, human engraving |
| CV1-X-OBJECT-FILTERS | Only notes/rests and limited marking filters | Selection model audit | Single/list/range selection for lyrics, harmony, dynamics, text, rehearsal, slurs/hairpins; filters preserve unrelated voices/staves/parts | Addressed selection and App keyboard/mouse tests |
| CV1-X-OBJECT-CLIPBOARD | Independent object copy breadth incomplete | CV1-X-OBJECT-FILTERS | Copy/paste/delete selected objects; reconnect IDs; relative measure/tick; contained/cross-boundary span policy; undo restores unrelated data | Core/App + XML/native round-trip, partial-span fixtures |
| CV1-X-PART-LAYOUT | Local part page settings only | CV1-X-NATIVE-SCHEMA | Independent title, spacing, system/page breaks retained across machines; score edits remain linked; removed parts cannot leave dangling layouts | Part/full-score edit and reopen, export tests; human PDF |
| CV1-X-ENGRAVING | Limited presets and automatic lanes | Native geometry + part-layout contracts | Measure density/width, manual page fit, breaks and spacing; explicit precedence for manual vs automatic placement; no unreadable overlap on QA scores | Layout bounds, reviewed screenshots, PDF render checks; human engraving |
| CV1-X-CONCERT-VIEW | Written-to-sounding playback exists; display toggle missing | Pitch/key/transposition model audit | Written/concert display with correct keys and editing semantics; toggle never double-transposes stored notes/audio/XML/MIDI | Wind ensemble fixtures, edit/undo/toggle/round-trip and playback tests |
| CV1-X-MIDI-INPUT | Device input absent | Device API investigation | Explicit input access, device select/reconnect, step input/chords, voice/duration/rest; no edits in text fields or stale selection; note-off clears held state | Simulated messages/integration and permission failures; physical-device QA separately |
| CV1-X-PITCH-FIRST | Duration-first only | Note-input state audit | Pitch/chord preview then duration commits; mode/keyboard/toolbar agree; IME/text entry safe; existing duration-first unchanged | State and App voice/rest/tuplet/undo regressions |
| CV1-X-TEMPLATES-STYLES | Built-ins only | Native schema + layout contracts | Save/reuse/import/export user instrument templates and styles; validate malformed inputs; reset defaults; no unintended score replacement | New-score and style App workflows, file round-trip |
| CV1-X-COMMANDS-SHORTCUTS | Help dialog only | Existing command inventory | Search and run applicable commands; keyboard focus/escape; customize shortcuts, detect conflicts and reset; persist user settings | App commands/disabled state, conflict/IME/restore tests |
| CV1-X-WORKSPACE | Visibility toggles only | Current dock layout | Resize/reorder/dock panels, save/restore/reset workspace; keyboard alternatives; compact widths retain score and commands | Pointer/keyboard App tests and 960/1400 screenshot bounds |
| CV1-X-IMAGE-EXPORT | PNG/SVG absent | Current renderer/export scope | Page/range/part export, resolution/background; self-contained assets; correct crop; no selection/debug UI; prevent accidental overwrite | Parse SVG, render PNG/SVG and pixel/bounds tests; actual saved files |
| CV1-X-WORKFLOW-AUDIT | Done slices do not prove complete workflows | All above; iterative, not last-only | Solo/piano/ensemble/wind author-edit-undo-save-reopen-export; audit chords/tuplets/lyrics/repeats; register every missing Required behavior | Versioned fixtures, headless interaction and file artifacts; human listening/engraving |

## Execution and Signoff

Select Todo/In progress/Partial tasks whose implementation dependencies are met.
Finish a testable slice, update evidence and status, then select the next task.
An umbrella task stays Partial until every acceptance is covered; documentation
alone never closes implementation. Required tasks cannot become Research/Post-V1
without explicit user approval. External blocks do not stop independent tasks.

When Ready work drains, repeat the reference and whole-score audit. Queue schema
success is not feature completeness. Preserve existing manual/external gates and
report implementation completion separately from RC approval. No commit, push,
merge, publish, deployment or new device/app installation is implied by this goal.

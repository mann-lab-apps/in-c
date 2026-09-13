# Chromatics Native Project Format

Implementation checkpoint: 2026-09-13, uncommitted worktree. Expanded V1 Required,
not a completed release contract. Extension: `.chromatics`; UTF-8 JSON envelope.

## Version 2

- `format: "chromatics-project"`, `version: 2` are the current discriminators.
- Slur/hairpin `engraving` optionally stores above/below placement, X/Y offsets
  in staff spaces (-8 to 8), and height (0.5 to 8). Height is slur quadratic
  control depth or full hairpin opening. Missing fields retain automatic layout;
  reset removes the override and supports undo. Same values reach screen/PDF.
  Outer SVG bounds expand for moved geometry; inter-system collision reservation
  and segment-specific handles remain Required. MusicXML reports geometry loss.
- `score` preserves the complete current Score model, IDs, annotations,
  transposition, ties/tuplets, breaks and page setup without XML conversion.
- `partLayouts` stores part IDs, optional titles, and layout/page settings.
- `view` stores score or selected part view. `settings.inputMode` is portable.
- Machine paths, device IDs and unknown fields are rejected, not silently dropped.
- Limits: 16 MiB UTF-8; depth 32; 300,000 tree values; bounded arrays/strings and
  finite numeric values. Structural validation uses Zod 4.6.2; references,
  duplicate IDs, tuplet/tie relations and invalid rhythms are also checked.
  In-progress empty/gapped voices may be saved. Cross-part span anchors fail.
  Hairpin event-ID endpoints may reference notes or rests; slur/octave endpoints
  still require notes. This validation expansion adds no stored field/version.
  Older development builds may reject rest-anchored hairpins; no backwards-reader
  compatibility is claimed. Arbitrary tick anchors need a separate schema contract.
  Note pitches remain display/written pitches. Octave lines are converted to
  performed pitch for XML and playback/MIDI, then reversed during standard XML
  import; native serialization never bakes in that conversion. Staff intervals
  include all note onsets before the end-anchor duration expires. Existing native
  cross-staff/unrepresentable spans remain editable but are not interpreted by
  this playback conversion and are rejected by XML export. Their support remains
  a Required implementation gap, not a supported silent conversion.

Version 1 development files are validated and migrated in memory to version 2
without changing musical or portable settings data. Version 1 cannot contain
the new geometry field. Tests pin legacy migration, unchanged source, version-2
geometry round-trip, invalid fields and future rejection. No released third-party
native format is implied. Version 0, versions above 2 and non-numeric versions
are rejected with the original untouched; resave uses version 2.

## Current Lifecycle

Start screen and File mode offer native opening; File mode offers native
save/Save As separately from MusicXML. Cmd/Ctrl+S
resaves an opened/saved native document; otherwise it retains the existing XML
policy. XML saving while a native document is active does not clear native dirty
state. Native save snapshots score/view/part page settings; pending edits remain
dirty. New/import/recovery documents clear the prior native path.
Cmd/Ctrl+Shift+S uses native Save As. The shared recent list retains legacy XML
entries and tags native entries for the correct decoder. Updates are serialized
and atomically replaced, with five-entry deduplication.

Automatic recovery now retains the native envelope as well as the legacy Score
snapshot. Recovery restores part view/page settings and preserves titles/breaks
for resave; it never restores write authorization to the original path. Auto-
save write/clear/read operations are serialized and replacement is atomic.

Main-process sessions require dialog-authorized paths, validate before writing,
serialize open/save operations, write and fsync a same-directory temporary file,
back up the existing file, then rename. Failed backup/rename removes the temp
file and preserves the original. Backups are in the app userData directory under
`native-project-backups`. External changes detected before overwrite are refused.
This is not a guarantee against external writes racing after the check or power
loss on every filesystem; directory fsync and cross-process locking are not done.

## Still Required

- Backup discovery/selection UI now lists valid and unreadable backups. Reads
  are validated again after selection, restricted to listed IDs, and reject
  symlink substitution. Restoring preserves portable state but not an original
  write path; subsequent save uses a new destination. Closing the dialog cancels
  a pending restore. Backup creation publishes a complete private file atomically.
  Existing backup files are retained; automatic pruning is not implemented.
- Full recovery failure/race audit and explicit retention controls remain Required.
  Native automatic recovery is implemented, not equivalent to crash/power-loss QA.
- Part-specific titles/breaks now apply to the actual screen and PDF renderer;
  lower-staff break references normalize to the corresponding part system.
  Independent titles are editable in the part heading with Enter/blur commit,
  Escape cancel, empty-value reset to instrument name, undo/redo and native
  save/reopen. Score title and instrument name are unchanged. Late save replies
  preserve newer title edits. Page/system break controls now edit the current
  score/part layout independently; lower-staff selection maps to the corresponding
  system measure. Removal, undo/redo and native reopen are App-tested. Page-setting
  edits also join the history. Reset removes the independent title, breaks and page
  setup, restoring instrument name and the base part projection with score page
  settings; undo restores all overrides. Portable part editing establishes native
  project state, so MusicXML interchange alone does not clear unsaved portable
  changes. Structural score-edit/removed-anchor and complete authoring audits remain.
- Initial native span geometry is connected to numeric editing and screen/PDF.
  Segment-specific handles, independent part geometry and collision-aware manual
  inter-system spacing remain Required.
  No implementation of pitch-first input is implied by its stored setting.
- Full async lifecycle audit, external-modification windows, backup retention,
  physical cross-machine and native-dialog QA. No RC signoff.

## References

Checked 2026-09-13: current MuseScore Studio 4 handbook
[Opening and saving](https://handbook.musescore.org/file-management/opening-and-saving-scores)
distinguishes Save, Save As and Save a copy;
[File export](https://handbook.musescore.org/file-management/file-export)
separates selected parts/formats from native storage. These inform the workflow,
not a claim to read/write MuseScore native files. Validation API reference:
[Zod schemas](https://zod.dev/api). No new MuseScore/Finale GUI observation.

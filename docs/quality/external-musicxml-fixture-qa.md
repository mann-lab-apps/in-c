# External MusicXML Fixture QA

Chromatics Desktop V1 uses this checklist to keep MusicXML import/export
compatibility visible before public release.

## Automated Seed Fixtures

The current automated fixture set is stored in
`src/musicxml/fixtures/external-apps/manifest.json`.

These are hand-authored compatibility seeds. They are useful automated guards,
but they do not satisfy the public RC requirement for real exported files from
the named applications.

| Fixture | App label | Origin | Collection status | Evidence | Coverage |
| --- | --- | --- | --- | --- | --- |
| `musescore-grand-staff-basic.musicxml` | MuseScore | compatibility seed | seed placeholder | this section | Piano grand staff, two staves, staff-specific clefs, staff-tagged notes, supported `mf` dynamic and staccato articulation without warnings, round-trip import/export. |
| `musescore-4-7-5-cli-grand-staff-export.musicxml` | MuseScore Studio 4.7.5 | app export | app-export collected by CLI | [2026-09-11 MuseScore CLI app-export fixture](#2026-09-11-musescore-cli-app-export-fixture) | MuseScore-exported uncompressed MusicXML, grand staff, staff-specific clefs, MuseScore lower-staff voice numbering, supported `mf` dynamic and staccato articulation without warnings, Chromatics round-trip. |
| `finale-string-duet-basic.musicxml` | Finale | compatibility seed | seed placeholder | this section | Two-part score, part names/abbreviations, treble and bass clefs, round-trip import/export. |
| `sibelius-multi-voice-basic.musicxml` | Sibelius | compatibility seed | seed placeholder | this section | Same-staff voice 1/2 streams with MusicXML backup, round-trip import/export. |
| `dorico-unsupported-directions.musicxml` | Dorico | compatibility seed | seed placeholder | this section | Supported note import plus unsupported technical notation and pedal direction warnings. |

Run:

```sh
npm run verify:musicxml-fixtures
```

The harness verifies manifest metadata, part names, staff counts, clefs, basic
note events, dynamics, articulations, voice counts where specified, warning
codes, warning paths, and a Chromatics serialize/parse round-trip for the
supported subset. Manifest entries must track origin, collection status, export
settings, evidence links, expected supported notation, and expected warning
snapshots.

The local reference-app audit is available through:

```sh
npm run verify:notation-reference-apps
```

This command does not open GUI apps or claim external-app QA completion. It checks
the local macOS Applications folders for primary and secondary reference apps,
validates that the required MusicXML export manifest has MuseScore, Dorico,
Sibelius, and Finale roles, and prints the next manual collection action for
each app.

The local MuseScore CLI import/render smoke is available through:

```sh
npm run verify:musescore-cli-fixtures
```

This command runs MuseScore Studio CLI with factory settings and default
MusicXML font import, opens the collected MuseScore CLI app-export fixture,
exports a PDF file to a temporary folder, and verifies that the output has a PDF
header, EOF marker, and non-trivial size. Additional inputs can be checked one
at a time with `MUSESCORE_CLI_FIXTURE_ID`, or all configured inputs can be
attempted with `MUSESCORE_CLI_VERIFY_ALL=1`. The default gate intentionally runs
one representative fixture because local MuseScore 4.7.5 intermittently crashes
when multiple conversions are launched back-to-back from the same Node process.

## Real App Export Fixtures Required Before Public RC

The manifest's `requiredAppExports` list is the authoritative collection gate
for public RC signoff. Until a real file is collected, the entry remains
`manual-collection-required`; do not mark it as automated evidence.

| App | Required status before RC | Export setting to record | Evidence slot |
| --- | --- | --- | --- |
| MuseScore | collected app-export fixture; GUI/manual snapshot still required | MuseScore Studio version, uncompressed MusicXML export, default notation/style settings | `musescore-4-7-5-cli-grand-staff-export`, warning-free Chromatics import/export, manual GUI reopen snapshot still open |
| Dorico | collected app-export fixture | Dorico version, uncompressed MusicXML export, unsupported advanced direction coverage | fixture id, import/export result, warning snapshot, reopen/manual snapshot |
| Sibelius | collected app-export fixture | Sibelius version, uncompressed MusicXML export from same-staff multi-voice score | fixture id, import/export result, warning snapshot, reopen/manual snapshot |
| Finale | collected app-export fixture or documented Finale-origin migration file | Finale source version if locally available; otherwise user-provided Finale-origin MusicXML with documented source/version/migration path | fixture id, import/export result, warning snapshot, reopen/manual snapshot |

When a real export is added, place it under
`src/musicxml/fixtures/external-apps/`, add it to `fixtures` with
`origin: "app-export"` and `collectionStatus: "app-export-collected"`, update
its expected part/staff/voice/note/dynamics/articulation/warning code and
warning path values, and change the matching `requiredAppExports` status from
`manual-collection-required` to `collected`.

## 2026-09-03 Collection Availability Audit

Codex checked the local macOS QA environment with:

```sh
find /Applications -maxdepth 1 -iname '*MuseScore*' -o -iname '*Dorico*' -o -iname '*Sibelius*' -o -iname '*Finale*'
```

No MuseScore, Dorico, Sibelius, or Finale applications were found under
`/Applications`, and no real app-export MusicXML files were present under
`src/musicxml/fixtures/external-apps/`. The four `requiredAppExports` entries
therefore remain `manual-collection-required`.

Next action before public RC: install or provide real exported `.musicxml` files
from MuseScore Studio, Dorico, Sibelius, and Finale-origin sources; then add them
as versioned `origin: "app-export"` fixtures with exact app versions, export
settings, import/export results, warning snapshots, and reopen/manual snapshots.

## 2026-09-11 MuseScore/Finale Reference Environment Audit

Codex ran:

```sh
npm run verify:notation-reference-apps
```

Result:

| App | Role | Local status | Version | Executable | Fixture status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| MuseScore | primary current/free market reference | installed | 4.7.5 | `/Applications/MuseScore 4.app/Contents/MacOS/mscore` | `manual-collection-required` | Run manual GUI/CLI export QA and collect `musescore-grand-staff-app-export.musicxml`. |
| Finale | primary legacy Finale-style migration reference | not installed | n/a | n/a | `manual-collection-required` | Install Finale in a compatible environment or provide a documented Finale-origin MusicXML fixture. |

This audit supersedes the 2026-09-03 local availability result for MuseScore.
It did not yet complete real app-export QA at the time of that audit: no
MuseScore export was collected, no Finale-origin export was collected, and no
GUI reopen/manual snapshot was performed in that package.

## 2026-09-11 MuseScore CLI App-Export Fixture

Codex used the local MuseScore Studio CLI to import the compatibility seed and
export a versioned uncompressed MusicXML fixture:

```sh
/Applications/MuseScore\ 4.app/Contents/MacOS/mscore -F --musicxml-use-default-font -o /tmp/musescore-4-7-5-cli-grand-staff-export.musicxml src/musicxml/fixtures/external-apps/musescore-grand-staff-basic.musicxml
```

The generated fixture is stored at
`src/musicxml/fixtures/external-apps/musescore-4-7-5-cli-grand-staff-export.musicxml`
and is connected to `src/musicxml/fixtures/external-apps/manifest.json` as
`origin: "app-export"` / `collectionStatus: "app-export-collected"`.
`npm run verify:musicxml-fixtures` verifies the MuseScore-exported grand staff,
staff-specific clefs, MuseScore lower-staff voice numbering, `mf` dynamic,
staccato articulation, empty warning snapshot, and Chromatics reserialize/parse
round-trip.

Scope boundary: this is a MuseScore Studio 4.7.5 CLI export fixture, not a
human-authored MuseScore GUI score. GUI reopen/manual snapshot QA remains
required before public RC.

## 2026-09-11 MuseScore CLI Import/Render Smoke

Codex first confirmed the local CLI:

```sh
/Applications/MuseScore\ 4.app/Contents/MacOS/mscore --version
```

Result: `MuseScore4 4.7.5`.

Codex then added and ran:

```sh
npm run verify:musescore-cli-fixtures
```

Result: pass. The default gate rendered
`src/musicxml/fixtures/external-apps/musescore-4-7-5-cli-grand-staff-export.musicxml`
to PDF under a temp output directory, and the verifier checked PDF header, EOF
marker, and file size. The script uses `-F --musicxml-use-default-font` to
reduce local user-setting and font differences. The first attempt can still
hit MuseScore 4.7.5's local CLI `SIGABRT`/mutex instability, so the verifier
records attempts and retries up to three times before failing.

Scope boundary: this verifies MuseScore can re-import/render the collected
MuseScore CLI export fixture. It does not replace GUI reopen or human visual QA
before public RC.

## 2026-09-11 Long-Running Work Queue And Reference Audit Gate

Codex added `docs/product/chromatics-commercial-v1-work-queue.md` and:

```sh
npm run verify:chromatics-v1-work-queue
```

The new queue gate requires Commercial V1 blocker rows to keep the shared
columns, approved status values, non-empty next actions, and required categories
for MusicXML compatibility, same-staff multi-voice, part view, PDF/page setup,
and packaged-app QA.

Codex also expanded:

```sh
npm run verify:notation-reference-apps
```

The audit now covers MuseScore, Dorico, Sibelius, and Finale instead of only the
two primary references. Current local result: MuseScore Studio 4.7.5 is installed
and its CLI app-export fixture is collected; Dorico, Sibelius, and Finale are not
installed locally and remain `manual-collection-required` / external-file
blockers before public RC.

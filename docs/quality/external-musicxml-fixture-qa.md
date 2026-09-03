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

## Real App Export Fixtures Required Before Public RC

The manifest's `requiredAppExports` list is the authoritative collection gate
for public RC signoff. Until a real file is collected, the entry remains
`manual-collection-required`; do not mark it as automated evidence.

| App | Required status before RC | Export setting to record | Evidence slot |
| --- | --- | --- | --- |
| MuseScore | collected app-export fixture | MuseScore Studio version, uncompressed MusicXML export, default notation/style settings | fixture id, import/export result, warning snapshot, reopen/manual snapshot |
| Dorico | collected app-export fixture | Dorico version, uncompressed MusicXML export, unsupported advanced direction coverage | fixture id, import/export result, warning snapshot, reopen/manual snapshot |
| Sibelius | collected app-export fixture | Sibelius version, uncompressed MusicXML export from same-staff multi-voice score | fixture id, import/export result, warning snapshot, reopen/manual snapshot |
| Finale | collected app-export fixture or documented Finale-origin migration file | Finale 27/export source version, or migration app if Finale itself is unavailable | fixture id, import/export result, warning snapshot, reopen/manual snapshot |

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

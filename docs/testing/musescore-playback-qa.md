# MuseScore MIDI Playback QA

This is an opt-in independent-consumer test, not the normal unit gate. It exports
Chromatics MusicXML, asks the installed MuseScore CLI to make MIDI from both the
original fixture and the Chromatics round-trip, and reads all three MIDI files
with Mido 1.3.3. It checks note-on pitch/order/quarter-beat timing
and sustain of tied C notes (within 0.125 beat). It does not assert audio quality,
velocity, articulation parity, human performance convention or GUI acceptance.

Requirements: installed MuseScore, `uv`, and Python through `uv`. `MUSESCORE_BIN`
can override `/Applications/MuseScore 4.app/Contents/MacOS/mscore`. Mido is pinned
in the invocation, not installed as an application runtime dependency. The helper
uses [Mido's MIDI track/tick API](https://mido.readthedocs.io/en/stable/files/midi.html),
rejects asynchronous/SMPTE timing and unmatched/unclosed notes, and keeps track
and channel identities. Overlapping unisons are paired FIFO.

All CLI QA export paths now share non-resetting arguments: no `-F` / `-R` or
long-form factory/revert flags. The [handbook's CLI page](https://handbook.musescore.org/en_gb/appendix)
warns about preference deletion and notes that its older options may differ from
Studio 4. Installed 4.7.5 `--help` does not offer `--config-folder`; we do not pass
that unsupported option or claim settings isolation. Outputs are temporary, but
the consumer's existing preferences may influence import/playback. Existing
preferences are neither read/dumped by this test nor intentionally reset. Prior
`-F` runs' impact on user settings has not been verified. Removing it is not
claimed to fix the intermittent SIGABRT.

```sh
uv run --no-project --with mido==1.3.3 python -B scripts/test_inspect_midi_notes.py
RUN_MUSESCORE_PLAYBACK_QA=1 npm test -- src/musicxml/musescore-playback.test.ts -t 'repeat-volta-slur-contract'
RUN_MUSESCORE_PLAYBACK_QA=1 npm test -- src/musicxml/musescore-playback.test.ts -t nested
RUN_MUSESCORE_PLAYBACK_QA=1 npm test -- src/musicxml/musescore-playback.test.ts -t omit-ending-count
```

Each run retains its temporary `chromatics-midi-reference-*` directory with both
XML inputs, the MIDI outputs and, when all three can be read, `comparison.json`.
`version.json`, `source-process.json` and `roundtrip-process.json` retain exit,
signal and diagnostic output before assertions. The last file is absent when the
source stage fails. Nonzero exit/signal is a failure,
even if an output file exists. Default Vitest skips these four external cases;
that skip is not a compatibility pass. No expected-failure or consumer-output
golden is used to make a mismatching traversal green.

Source and round-trip MuseScore notes must first match each other; both must then
match the independently specified traversal and tie contract. Equality of the two
consumer outputs alone is not a compatibility pass. This separates serialization
changes from consumer interpretation without choosing either consumer as an
automatic musical authority. The 400-second per-case timeout covers two bounded
90-second conversions, version lookup and three bounded MIDI inspections.

## Observed 2026-10-23

- MuseScore 4.7.5 simple first/second ending: pitch sequence `[72,74,72,76]`,
  onsets `[0,4,8,12]` match Chromatics. Tied C duration is 4 beats in Chromatics
  and 3.9979167 beats in MuseScore (one 480-PPQN tick shorter).
- Plain nested repeat: Chromatics 12 notes, MuseScore 9. Strict comparison fails.
- Nested repeat inside an outer ending: Chromatics 8 notes, MuseScore 9. Strict
  comparison fails. Do not infer the intended musical traversal from one consumer.
- Several CLI invocations terminated with `SIGABRT` / mutex-lock errors before
  comparison, including the last simple-case attempt. Normal-exit runs above
  establish scoped results, not stable CLI availability. A native-arm64 probe also
  aborted; the installed Qt bundle has only Cocoa, so offscreen is not a workaround.

Helper self-tests: five pass. The internal focused bundle: 80 pass, three external
cases skipped. Product code is unchanged by this audit; full-suite/UI/PDF reruns
were not performed for this verification-only change. Detailed paths and failure
categories are retained in `docs/quality/evidence-log.md`.

## Source / Round-trip Isolation Follow-up

2026-10-23 runs with this additional control did not reach three-way comparison:
simple endings and nested volta converted the original fixture normally, then
aborted on the round-trip; plain nested repeat aborted at the source stage. All
three cases failed on `SIGABRT`, not on a new semantic assertion. Prior normal-exit
note mismatches remain evidence, but these attempts do not locate their cause.
No product traversal or expectations were changed. The latest internal focused
bundle passes 46 tests with three opt-in skips; that is not external approval.

## Non-resetting CLI Follow-up

2026-10-23, installed MuseScore 4.7.5, source and round-trip stages both exit 0:

- Simple endings: all three MIDI streams satisfy the independent four-note and
  tied-duration contract. Source and round-trip consumer notes are identical.
- Nested volta: source/round-trip consumer notes are identical, but both produce
  `[72,74,76,74,76,77,74,76,77]` against Chromatics' eight-note contract. Strict
  compatibility test remains failed.
- Plain nested repeat: first source attempt aborts with SIGABRT. One completed
  rerun reaches comparison: source/round-trip again match each other with the same
  nine-note sequence above, versus Chromatics' twelve-note contract. Test fails.

For these fixtures, the observed consumer difference also exists with the original
input; it is not introduced solely by Chromatics serialization. That does not
establish either interpretation as musically authoritative, change expectations,
or prove GUI/listening compatibility. Process/argument and comparison JSON paths
are in the evidence log. Successful runs do not establish stable CLI availability.

Source-review hypothesis: [MuseScore 4.7.5 RepeatList](https://github.com/musescore/MuseScore/blob/v4.7.5/src/engraving/dom/repeatlist.cpp#L879)
replaces a single start-repeat reference when it meets a new start and rewinds to
that reference at an end repeat. Chromatics pairs starts/ends with a stack and
expands regions recursively. This is consistent with the observed return to the
inner region instead of the outer opening, but is not a debugger trace or a GUI
approval. Keep this interpretation separate from the measured MIDI evidence.

## Specification Review and Next Isolation Control

2026-10-23 read-only review: the [MusicXML 4.0 repeat reference](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/repeat/)
limits `times` and `after-jump` to backward repeats outside endings. The latter
concerns D.C./D.S. jumps; these nested fixtures contain no such jumps, so adding
that flag is not a justified repair. [Ending numbers](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ending/)
describe the passes that play an ending, separately from its displayed text.
[MuseScore's volta handbook](https://handbook.musescore.org/notation/repeats/voltas)
likewise distinguishes displayed text and the playback repeat list.

Local `nested-volta-ownership.musicxml` puts `times="2"` on measure 4's ending
barline, and `buildMeasureBarlines` currently emits a stored repeat count even
there. The proposed control was a temporary structured-XML variant omitting only this
redundant count, alongside the unchanged source and round-trip. Keep nested-repeat
and simple-ending controls and all independent pitch/onset/tie expectations.
This was initially an unexecuted isolation experiment; results follow below.
It is not a schema validation failure or a serialization fix. The plain nested
repeat mismatch has no endings, so this observation alone cannot explain both
failures. Do not remove counts indiscriminately or rewrite expected traversal.

## Ending-count Isolation Result

The `omit-ending-count` variant uses an ordered XML parser/builder on temporary
source and round-trip copies. `control.json` records exactly one removed count
from each. A default unit test checks the remaining XML structure, unchanged
Chromatics MIDI, idempotence and the untouched original fixture. Consumer stages
retain the existing expected eight-note traversal; a mismatch is still a failure.

MuseScore 4.7.5 exits normally for both normalized inputs in
`chromatics-midi-reference-dsuSvT`. Both produce
`[72,74,76,74,76,77,74,76,77]` rather than `[72,74,76,74,76,77,72,79]`.
This attribute omission alone therefore does not resolve the observed mismatch.
It is not a verified general model of nested-repeat interpretation.

The fresh as-written bundle aborts: simple endings at round-trip (`qP46nM`),
plain nested repeat at source (`xKb65J`), nested volta at round-trip (`OVc4KS`).
An isolated nested-volta rerun with no concurrent Electron also aborts at
round-trip (`0hgjfk`). These aborting runs are not new semantic comparisons;
the earlier normal-exit as-written evidence remains separately recorded.
No expected sequence, product parser/exporter, original fixture or preferences
are rewritten by this experiment. GUI/listening and CLI stability remain open.

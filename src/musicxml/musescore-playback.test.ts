import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { parseMusicXml, serializeMusicXml } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { museScoreExportArgs } from '../../scripts/musescore-export-args.mjs'

interface MidiNotes {
  ticksPerBeat: number
  notes: { pitch: number; startBeat: number; durationBeats: number }[]
}

function omitEndingRepeatCounts(xml: string): { xml: string; removed: number } {
  const nodes = new XMLParser({ ignoreAttributes: false, preserveOrder: true, trimValues: false }).parse(xml)
  let removed = 0
  const visit = (children: Record<string, unknown>[]) => {
    for (const node of children) {
      const barline = node.barline
      if (Array.isArray(barline) && barline.some(child => Object.hasOwn(child, 'ending'))) {
        for (const child of barline) {
          const attributes = child[':@'] as Record<string, string> | undefined
          if (Object.hasOwn(child, 'repeat') && attributes?.['@_direction'] === 'backward' && Object.hasOwn(attributes, '@_times')) {
            delete attributes['@_times']
            removed++
          }
        }
      }
      for (const [key, value] of Object.entries(node)) {
        if (key !== ':@' && Array.isArray(value)) visit(value)
      }
    }
  }
  visit(nodes)
  return { xml: new XMLBuilder({ ignoreAttributes: false, preserveOrder: true, suppressEmptyNode: true }).build(nodes), removed }
}

it('isolates ending repeat counts without changing nested traversal, note order or the original fixture', async () => {
  const url = new URL('./fixtures/nested-volta-ownership.musicxml', import.meta.url)
  const source = await readFile(url, 'utf8'), normalized = omitEndingRepeatCounts(source)
  expect(normalized.removed).toBe(1)
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: false })
  const expected = parser.parse(source)
  delete expected['score-partwise'].part.measure[3].barline.repeat['@_times']
  expect(parser.parse(normalized.xml)).toEqual(expected)
  expect(serializeMidi(parseMusicXml(normalized.xml))).toEqual(serializeMidi(parseMusicXml(source)))
  expect(omitEndingRepeatCounts(normalized.xml).removed).toBe(0)
  expect(await readFile(url, 'utf8')).toBe(source)
})

it.skipIf(process.env.RUN_MUSESCORE_PLAYBACK_QA !== '1').each([
  { fixture: 'repeat-volta-slur-contract', variant: 'as-written', pitches: [72, 74, 72, 76], beats: [0, 4, 8, 12], tiedBeats: 4 },
  { fixture: 'nested-repeat-slur-contract', variant: 'as-written', pitches: [72, 74, 76, 74, 76, 77, 72, 74, 76, 74, 76, 77], beats: Array.from({ length: 12 }, (_, i) => i), tiedBeats: 1 },
  { fixture: 'nested-volta-ownership', variant: 'as-written', pitches: [72, 74, 76, 74, 76, 77, 72, 79], beats: Array.from({ length: 8 }, (_, i) => i), tiedBeats: 1 },
  { fixture: 'nested-volta-ownership', variant: 'omit-ending-count', pitches: [72, 74, 76, 74, 76, 77, 72, 79], beats: Array.from({ length: 8 }, (_, i) => i), tiedBeats: 1 }
])('compares independent MIDI playback for $fixture ($variant)', async ({ fixture, variant, pitches, beats, tiedBeats }) => {
  const directory = await mkdtemp(join(tmpdir(), 'chromatics-midi-reference-'))
  const source = await readFile(new URL(`./fixtures/${fixture}.musicxml`, import.meta.url), 'utf8')
  const score = parseMusicXml(source)
  const sourceInput = join(directory, 'source.musicxml'), sourceMidi = join(directory, 'musescore-source.mid')
  const input = join(directory, 'chromatics.musicxml')
  const ownMidi = join(directory, 'chromatics.mid'), referenceMidi = join(directory, 'musescore.mid')
  const roundtrip = serializeMusicXml(score)
  const controls = variant === 'omit-ending-count'
    ? { source: omitEndingRepeatCounts(source), roundtrip: omitEndingRepeatCounts(roundtrip) }
    : { source: { xml: source, removed: 0 }, roundtrip: { xml: roundtrip, removed: 0 } }
  if (variant === 'omit-ending-count') {
    expect(controls.source.removed).toBe(1)
    expect(controls.roundtrip.removed).toBe(1)
  }
  await writeFile(sourceInput, controls.source.xml)
  await writeFile(input, controls.roundtrip.xml)
  await writeFile(join(directory, 'control.json'), JSON.stringify({ variant,
    removedSourceCounts: controls.source.removed, removedRoundtripCounts: controls.roundtrip.removed }, null, 2))
  await writeFile(ownMidi, serializeMidi(score))
  const binary = process.env.MUSESCORE_BIN ?? '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 30_000 })
  await writeFile(join(directory, 'version.json'), JSON.stringify({ status: version.status, signal: version.signal,
    error: version.error?.message, stdout: version.stdout, stderr: version.stderr }, null, 2))
  expect(version.error, version.stderr).toBeUndefined()
  expect(version.status, version.stderr).toBe(0)
  const referenceVersion = version.stdout.trim() || version.stderr.trim()
  for (const [stage, xml, midi] of [['source', sourceInput, sourceMidi], ['roundtrip', input, referenceMidi]] as const) {
    const args = museScoreExportArgs(xml, midi)
    const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 90_000 })
    const processEvidence = { fixture, variant, directory, referenceVersion, stage, args,
      exitCode: result.status, signal: result.signal, error: result.error?.message,
      stdout: result.stdout, stderr: result.stderr }
    await writeFile(join(directory, `${stage}-process.json`), JSON.stringify(processEvidence, null, 2))
    console.log(JSON.stringify({ fixture, variant, directory, referenceVersion, stage, exitCode: result.status, signal: result.signal }))
    expect(result.error, result.stderr).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  }
  const inspect = (file: string): MidiNotes => {
    const read = spawnSync('uv', ['run', '--no-project', '--with', 'mido==1.3.3', 'python', '-B',
      resolve('scripts/inspect_midi_notes.py'), file], { encoding: 'utf8', timeout: 60_000 })
    expect(read.error, read.stderr).toBeUndefined()
    expect(read.status, read.stderr).toBe(0)
    return JSON.parse(read.stdout) as MidiNotes
  }
  const own = inspect(ownMidi), originalReference = inspect(sourceMidi), reference = inspect(referenceMidi)
  console.log(JSON.stringify({ fixture, variant, own, originalReference, reference, scope: 'source vs roundtrip consumer playback; not sound or articulation parity' }))
  await writeFile(join(directory, 'comparison.json'), JSON.stringify({ fixture, variant, referenceVersion, own, originalReference, reference }, null, 2))
  // This isolates serialization changes from a consumer's repeat interpretation.
  expect(reference.notes).toEqual(originalReference.notes)
  for (const midi of [own, originalReference, reference]) {
    expect(midi.notes.map(note => note.pitch)).toEqual(pitches)
    expect(midi.notes.map(note => note.startBeat)).toEqual(beats)
    // Consumers may shorten note-off timing for articulation, but must sustain the tied note.
    for (const note of midi.notes.filter(note => note.pitch === 72)) {
      expect(note.durationBeats).toBeGreaterThanOrEqual(tiedBeats - 0.125)
    }
  }
}, 400_000)

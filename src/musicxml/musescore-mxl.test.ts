import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from './index'
import { encodeMusicXmlFile } from './container'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { museScoreExportArgs } from '../../scripts/musescore-export-args.mjs'

it.skipIf(process.env.RUN_MUSESCORE_SPAN_QA !== '1').each([
  { fixture: 'repeat-volta-slur-contract', totalBeats: 16 },
  { fixture: 'repeat-volta-branch-ties', totalBeats: 4 },
  { fixture: 'sparse-attributes-contract', totalBeats: 15 },
  { fixture: 'volta-open-end', totalBeats: 20 }
])('exchanges $fixture through the installed MuseScore CLI', async ({ fixture, totalBeats }) => {
  const binary = process.env.MUSESCORE_BIN ?? '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
  const directory = await mkdtemp(join(tmpdir(), 'chromatics-volta-reference-'))
  const score = parseMusicXml(await readFile(new URL(`./fixtures/${fixture}.musicxml`, import.meta.url), 'utf8'))
  const input = join(directory, 'chromatics.musicxml'), output = join(directory, 'musescore.musicxml')
  console.log(JSON.stringify({ fixture, directory, stage: 'export-started' }))
  await writeFile(input, serializeMusicXml(score))
  const result = spawnSync(binary, museScoreExportArgs(input, output), { encoding: 'utf8', timeout: 90_000 })
  expect(result.error, result.stderr).toBeUndefined()
  expect(result.status, result.stderr).toBe(0)
  const reopened = parseMusicXml(await readFile(output, 'utf8'))
  const signature = (candidate: typeof score) => {
    const measures = candidate.parts[0]!.staves[0]!.measures
    const events = measures.flatMap(measure => measure.voices.flatMap(voice => voice.events))
    return {
      measures: measures.map(measure => ({ repeatStart: Boolean(measure.repeat?.start), repeatEnd: Boolean(measure.repeat?.end), volta: measure.volta,
        clef: measure.clef, key: measure.keySignature, time: measure.timeSignature, transposition: measure.transposition })),
      notes: events.map(event => ({ type: event.type, pitch: event.type === 'note' ? event.pitch : undefined, duration: event.duration, position: event.position })),
      ties: events.map(event => event.type === 'note' ? [Boolean(event.ties?.start), Boolean(event.ties?.stop)] : []),
      slurs: candidate.slurs?.map(span => [events.findIndex(event => event.id === span.startEventId), events.findIndex(event => event.id === span.endEventId)]),
      playback: createPlaybackTimeline(candidate).events.map(event => [events.findIndex(source => source.id === event.eventId), event.startBeat, event.durationBeats])
    }
  }
  expect(signature(reopened)).toEqual(signature(score))
  expect(createPlaybackTimeline(reopened).totalBeats).toBe(totalBeats)
  expect(createPlaybackTimeline({ ...reopened, slurs: [] })).toEqual(createPlaybackTimeline(reopened))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(reopened))).score).toEqual(reopened)
  console.log(JSON.stringify({ fixture, directory, stage: 'semantic-comparison-passed', exitCode: result.status, signal: result.signal }))
  expect(result.status, result.stderr).toBe(0)
  const pdf = join(directory, 'musescore.pdf')
  const rendered = spawnSync(binary, museScoreExportArgs(input, pdf), { encoding: 'utf8', timeout: 90_000 })
  expect(rendered.error, rendered.stderr).toBeUndefined()
  expect(rendered.status, rendered.stderr).toBe(0)
  console.log(JSON.stringify({ fixture, directory, pdf, humanGuiQa: 'not-run' }))
  console.log(JSON.stringify({ fixture, directory, result: 'Chromatics export/MuseScore export/reimport preserves tie, volta and slur semantics', humanGuiQa: 'not-run' }))
}, 190_000)

it.skipIf(process.env.RUN_MUSESCORE_MXL_QA !== '1')('exchanges Chromatics MXL and written transposition through the installed MuseScore CLI', async () => {
  const binary = process.env.MUSESCORE_BIN ?? '/Applications/MuseScore 4.app/Contents/MacOS/mscore'
  const directory = await mkdtemp(join(tmpdir(), 'chromatics-mxl-reference-'))
  try {
    const score = parseMusicXml(await readFile(new URL('./fixtures/single-part-treble.musicxml', import.meta.url), 'utf8'))
    for (const measure of score.parts[0]!.staves[0]!.measures) {
      measure.transposition = { diatonic: -1, chromatic: -2 }
    }
    const input = join(directory, 'chromatics.mxl')
    const output = join(directory, 'musescore.musicxml')
    await writeFile(input, encodeMusicXmlFile(serializeMusicXml(score), input))
    const version = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 30_000 })
    expect(version.error).toBeUndefined()
    const result = spawnSync(binary, museScoreExportArgs(input, output), { encoding: 'utf8', timeout: 90_000 })
    expect(result.error, result.stderr).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
    const reopened = parseMusicXml(await readFile(output, 'utf8'))
    expect(reopened.parts).toHaveLength(score.parts.length)
    const before = score.parts[0]!.staves[0]!.measures
    const after = reopened.parts[0]!.staves[0]!.measures
    expect(after).toHaveLength(before.length)
    expect(after[0]!.transposition).toMatchObject({ chromatic: -2 })
    const notes = (measures: typeof before) => measures.flatMap((measure) => measure.voices.flatMap((voice) => voice.events.flatMap((event) =>
      event.type === 'note' ? [{ pitch: event.pitch, duration: event.duration }] : []
    )))
    expect(notes(after)).toEqual(notes(before))
    console.log(JSON.stringify({ reference: version.stdout.trim() || version.stderr.trim(), result: 'MXL import/XML export written-note and transposition round-trip passed', humanGuiQa: 'not-run' }))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 150_000)

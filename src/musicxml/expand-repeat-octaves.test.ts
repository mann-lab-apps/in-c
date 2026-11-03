import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from './index'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createRepeatTempoStateFixture } from '../testing/repeat-tempo-state-fixture'
import { secondaryRepeatFixture } from '../testing/secondary-repeat-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import type { Score, OctaveShiftType } from '../score-core'

const pitches = (score: Score) => createPlaybackTimeline(score).events.map(event =>
  event.frequencies?.map(frequency => Math.round(69 + 12 * Math.log2(frequency / 440))) ?? [])

function copied(score: Score, expected: number[][], label: string) {
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), ordinary = serializeMusicXml(score)
  const result = expandScoreRepeatsForMusicXml(score), locations = new Map<string, number>()
  for (const part of result.parts) for (const staff of part.staves) staff.measures.forEach((measure, index) => {
    for (const voice of measure.voices) for (const event of voice.events) locations.set(event.id, index)
  })
  expect(result.octaveShifts?.map(span => [locations.get(span.startEventId), locations.get(span.endEventId)])).toEqual(expected)
  const { contents, report } = serializeMusicXmlWithReport(result), reopened = parseMusicXml(contents)
  expect(reopened.octaveShifts).toHaveLength(expected.length)
  expect(pitches(result)).toEqual(pitches(score))
  expect(pitches(reopened)).toEqual(pitches(score))
  expect(serializeMidi(result)).toEqual(serializeMidi(score))
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMusicXml(score)).toBe(ordinary)
  const qa = process.env.DDIRORI_REPEAT_OCTAVE_COPY_OUT
  if (qa) {
    const directory = join(qa, label); mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), native)
    writeFileSync(join(directory, 'source.musicxml'), ordinary)
    writeFileSync(join(directory, 'expanded.musicxml'), contents)
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(directory, 'oracle.json'), JSON.stringify({ pairs: expected, sourceOctaves: score.octaveShifts, pitches: pitches(score), warnings: report.warnings }))
  }
  return { result, contents, report }
}

it.each([
  ['8va', 12, 'down', 8], ['8vb', -12, 'up', 8],
  ['15ma', 24, 'down', 15], ['15mb', -24, 'up', 15]
] as const)('copies complete repeated %s without changing written pitches or performed audio', (type, shift, direction, size) => {
  const score = createRepeatTempoStateFixture()
  score.octaveShifts = [{ id: 'within-bar', type, startEventId: 'tempo-a', endEventId: 'tempo-b' }]
  const { result, contents } = copied(score, [[0, 0], [1, 1], [2, 2]], `octave-${type}`)
  expect(pitches(result)).toEqual([60, 62, 60, 62, 60, 62, 64].map((pitch, index) => [pitch + (index === 6 ? 0 : shift)]))
  expect(contents.match(new RegExp(`<octave-shift type="${direction}" size="${size}"`, 'g'))).toHaveLength(3)
})

it.each(['8va', '8vb', '15ma', '15mb'] as OctaveShiftType[])('retains a one-note %s through the entire note and stops before its neighbor', type => {
  const score = createRepeatTempoStateFixture()
  score.octaveShifts = [{ id: 'one-note', type, startEventId: 'tempo-a', endEventId: 'tempo-a' }]
  const { result } = copied(score, [[0, 0], [1, 1], [2, 2]], `octave-single-${type}`)
  const delta = (type.startsWith('15') ? 24 : 12) * (type.endsWith('b') ? -1 : 1)
  expect(pitches(result)).toEqual([60 + delta, 62, 60 + delta, 62, 60 + delta, 62, 64].map(pitch => [pitch]))
})

it('copies a complete repeated phrase on a lower transposing owner without shifting other staves', () => {
  const { score } = secondaryRepeatFixture('lower', 'repeat'), lower = score.parts[0].staves[1]
  for (const measure of lower.measures) measure.transposition = { chromatic: -2, diatonic: -1 }
  score.octaveShifts = [{ id: 'lower-range', type: '8va', startEventId: 'lower-note-0', endEventId: 'lower-note-1' }]
  const { result } = copied(score, [[0, 1], [2, 3]], 'octave-lower-transpose')
  expect(result.parts[0].staves[0].measures.map(measure => measure.voices[0].events[0].type === 'note' && measure.voices[0].events[0].pitch.octave))
    .toEqual([4, 4, 4, 4, 4, 4])
})

it.each(['jump', 'reversed', 'missing'] as const)('rejects %s octave ranges without silently clipping their meaning', kind => {
  const score = createRepeatTempoStateFixture()
  score.octaveShifts = [{ id: 'preserved', type: '8va', startEventId: kind === 'reversed' ? 'tempo-b' : 'tempo-a',
    endEventId: kind === 'jump' ? 'tempo-c' : kind === 'missing' ? 'absent' : 'tempo-a' }]
  const before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/)
  expect(score).toEqual(before)
  const qa = process.env.DDIRORI_REPEAT_OCTAVE_COPY_OUT
  if (qa && kind === 'jump') {
    const directory = join(qa, 'unsupported-octave-jump'); mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(directory, 'source.musicxml'), serializeMusicXml(score))
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(score))
  }
})

it('retains simultaneous slur, hairpin and octave owners in the same complete copied phrase', () => {
  const score = createRepeatTempoStateFixture(), endpoints = { startEventId: 'tempo-a', endEventId: 'tempo-b' }
  score.octaveShifts = [{ id: 'mixed-octave', type: '8va', ...endpoints }]
  score.slurs = [{ id: 'mixed-slur', ...endpoints }]
  score.hairpins = [{ id: 'mixed-hairpin', type: 'crescendo', ...endpoints }]
  const { result } = copied(score, [[0, 0], [1, 1], [2, 2]], 'octave-mixed')
  expect(result.slurs).toHaveLength(3); expect(result.hairpins).toHaveLength(3)
  expect(new Set([...result.slurs!, ...result.hairpins!, ...result.octaveShifts!].map(span => span.id)).size).toBe(9)
})

it('retains all written chord members and their performed octave in each copy', () => {
  const score = createRepeatTempoStateFixture(), first = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (first.type !== 'note') throw Error('Expected note fixture')
  first.pitches = [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }]
  score.octaveShifts = [{ id: 'chord-octave', type: '8va', startEventId: 'tempo-a', endEventId: 'tempo-b' }]
  const { result } = copied(score, [[0, 0], [1, 1], [2, 2]], 'octave-chord')
  expect(pitches(result)[0]).toEqual([72, 76])
  const copiedFirst = result.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(copiedFirst.type === 'note' && copiedFirst.pitches).toEqual(first.pitches)
})

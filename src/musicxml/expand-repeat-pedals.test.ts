import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, serializeMusicXml } from './index'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createRepeatTempoStateFixture } from '../testing/repeat-tempo-state-fixture'
import { secondaryRepeatFixture } from '../testing/secondary-repeat-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { TICKS_PER_QUARTER, type Score } from '../score-core'

function fixture() {
  const score = createRepeatTempoStateFixture(), part = score.parts[0], staff = part.staves[0]
  score.pedalEvents = [
    { id: 'down', partId: part.id, staffId: staff.id, measureId: staff.measures[0].id, tick: 0, value: 127 },
    { id: 'half', partId: part.id, staffId: staff.id, measureId: staff.measures[0].id, tick: TICKS_PER_QUARTER, value: 32 },
    { id: 'up', partId: part.id, staffId: staff.id, measureId: staff.measures[1].id, tick: 0, value: 0 }
  ]
  return score
}
const pedalTimes = (score: Score) => createPlaybackTimeline(score).pedalEvents?.map(event => [event.partId, event.startBeat, event.value])
function copied(score: Score, label: string) {
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), ordinary = serializeMusicXml(score)
  const result = expandScoreRepeatsForMusicXml(score), xml = serializeMusicXml(result), reopened = parseMusicXml(xml)
  expect(pedalTimes(result)).toEqual(pedalTimes(score))
  expect(pedalTimes(reopened)).toEqual(pedalTimes(score))
  expect(serializeMidi(result)).toEqual(serializeMidi(score))
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before); expect(encodeNativeProject(createNativeProject(score))).toBe(native); expect(serializeMusicXml(score)).toBe(ordinary)
  const out = process.env.DDIRORI_REPEAT_PEDAL_COPY_OUT
  if (out) {
    const dir = join(out, label); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'source.musicxml'), ordinary)
    writeFileSync(join(dir, 'expanded.musicxml'), xml); writeFileSync(join(dir, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(dir, 'oracle.json'), JSON.stringify({ pedalTimes: pedalTimes(score), sourcePedals: score.pedalEvents }))
  }
  return result
}
it('projects literal CC64 values and explicit releases at each structural return', () => {
  const result = copied(fixture(), 'pedal-repeat')
  expect(pedalTimes(result)).toEqual([[0,127],[1,32],[2,0],[2,127],[3,32],[4,0],[4,127],[5,32],[6,0]].map(([beat,value])=>['tempo-part',beat,value]))
  expect(new Set(result.pedalEvents?.map(event => event.id)).size).toBe(9)
})
it('preserves same-tick lift/retake order rather than sorting by value', () => {
  const score = fixture(); score.pedalEvents!.splice(2, 0, { ...score.pedalEvents![1], id: 'retake', value: 127 })
  copied(score, 'pedal-retake')
})
it('keeps an authored measure-end release before the next structural reset', () => {
  const score = fixture(); score.pedalEvents!.splice(2, 0, { ...score.pedalEvents![0], id: 'bar-end-up', tick: 2 * TICKS_PER_QUARTER, value: 0 })
  copied(score, 'pedal-bar-end')
})
it('retains fermata-adjusted controller times and unchanged key note-offs', () => {
  const score = fixture(), note = score.parts[0].staves[0].measures[0].voices[0].events[0]
  if (note.type !== 'note') throw Error('Expected note fixture')
  note.fermata = true
  copied(score, 'pedal-fermata')
})
it('keeps each instrument controller separate across repeated copies', () => {
  const score = fixture(), part = structuredClone(score.parts[0]); part.id = 'other-part'
  for (const staff of part.staves) {
    staff.id += '-other'
    for (const measure of staff.measures) { measure.id += '-other'; for (const voice of measure.voices) for (const event of voice.events) { event.id += '-other'; if (event.type === 'note') event.pitch.octave++ } }
  }
  score.parts.push(part)
  score.pedalEvents!.push(...structuredClone(score.pedalEvents!).map(event => ({ ...event, id: event.id + '-other', partId: part.id, staffId: event.staffId + '-other', measureId: event.measureId + '-other' })))
  copied(score, 'pedal-instruments')
})
it('does not rewrite a score with no repeat markers, including its original pedal identities', () => {
  const score = fixture(); delete score.parts[0].staves[0].measures[0].repeat
  expect(expandScoreRepeatsForMusicXml(score)).toEqual(score)
})
it('keeps a secondary-owned volta traversal and releases at both backward and skipped-ending jumps', () => {
  const { score, staff } = secondaryRepeatFixture('lower', 'volta'), part = score.parts[0]
  score.pedalEvents = [0, 1, 2].map((index) => ({ id: `volta-pedal-${index}`, partId: part.id, staffId: staff.id,
    measureId: staff.measures[index].id, tick: 0, value: index === 0 ? 127 : 0 }))
  const result = copied(score, 'pedal-volta')
  expect(pedalTimes(result)).toEqual([[0,127],[4,0],[8,0],[8,127],[12,0],[12,0]].map(([beat,value])=>[part.id,beat,value]))
})
it('retains authored staff owners for pedals split between staves in an explicit copy', () => {
  const score = fixture(), lower = structuredClone(score.parts[0].staves[0]); lower.id += '-lower'
  for (const measure of lower.measures) {
    measure.id += '-lower'
    for (const voice of measure.voices) for (const event of voice.events) { event.id += '-lower'; if (event.type === 'note') event.pitch.octave-- }
  }
  score.parts[0].staves.push(lower)
  Object.assign(score.pedalEvents![2], { staffId: lower.id, measureId: lower.measures[1].id })
  const result = copied(score, 'pedal-staves')
  expect(result.pedalEvents!.filter(event => event.value === 0 && !event.id.includes('-pedal-reset-')).map(event => event.staffId)).toEqual([lower.id])
})
it.each([{ partId: 'absent' }, { staffId: 'absent' }, { measureId: 'absent' }, { tick: Infinity }, { value: 128 }])('rejects unsupported pedal ownership/value %j without dropping it', patch => {
  const score = fixture(); Object.assign(score.pedalEvents![0], patch); const before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/); expect(score).toEqual(before)
})

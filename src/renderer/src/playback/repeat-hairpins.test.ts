import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRepeatHairpinFixture, type RepeatHairpinCase } from '../../../testing/repeat-hairpin-fixture'
import { createPlaybackTimeline, findPlaybackStartBeat } from './timeline'
import { createPianoCommands } from './piano-transport'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'

const cases: RepeatHairpinCase[] = ['internal', 'missing-first-stop', 'missing-last-stop', 'cross-ending']
describe.each([false, true])('repeat hairpin occurrences rest=%s', rest => {
  it.each(cases)('pairs %s stops before the next occurrence and preserves files', kind => {
    const { score, order } = createRepeatHairpinFixture(kind, rest), before = structuredClone(score)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events.map(e => [e.eventId, e.startBeat, e.durationBeats])).toEqual(order.map((index, occurrence) => [`rh-n${index}`, occurrence * 4, 4]))
    const velocities = kind === 'internal' ? [[.16,.20],[.20,.24],[.16,.20],[.20,.24],[.16,.20],[.20,.24],[.16,.16]]
      : kind === 'missing-first-stop' ? [[.16,.16],[.16,.16],[.16,.20],[.20,.24]]
      : kind === 'missing-last-stop' ? [[.16,.20],[.20,.24],[.16,.16],[.16,.16]]
      : [[.16,.16],[.16,.16],[.16,.16],[.16,.16]]
    timeline.events.forEach((e, i) => { expect(e.velocityStart).toBeCloseTo(velocities[i][0]); expect(e.velocityEnd).toBeCloseTo(velocities[i][1]) })
    expect(findPlaybackStartBeat(timeline, 'rh-n0')).toBe(0)
    // Exact-onset selection/resume uses the corresponding performed attack.
    for (const event of timeline.events.filter(e => e.frequency)) {
      const reservation = createPianoCommands(timeline, event.startBeat, 120, {}).filter(c => c.type === 'on')[0]
      expect(reservation.time).toBe(0); expect(reservation.offset).toBe(0)
      expect(reservation.velocity).toBeCloseTo(event.velocityStart / .24 * 127)
    }
    const native = encodeNativeProject(createNativeProject(score)), xml = serializeMusicXml(score), midi = serializeMidi(score)
    expect(decodeNativeProject(native).score).toEqual(before)
    const reopened = createPlaybackTimeline(parseMusicXml(xml))
    expect(reopened.events.map(e => [e.startBeat,e.durationBeats,e.velocityStart,e.velocityEnd])).toEqual(timeline.events.map(e => [e.startBeat,e.durationBeats,e.velocityStart,e.velocityEnd]))
    expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_REPEAT_HAIRPIN_QA_DIR
    if (out) { const dir = join(out, `${kind}-${rest ? 'rest' : 'note'}`); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'source.musicxml'), xml); writeFileSync(join(dir, 'expected.mid'), midi); writeFileSync(join(dir, 'timeline.json'), JSON.stringify(timeline, null, 2)) }
  })
})

it('uses a secondary staff repeat traversal for a cross-ending hairpin on the primary staff', () => {
  const { score } = createRepeatHairpinFixture('cross-ending'), part = score.parts[0]
  const canonical = structuredClone(part.staves[0]); canonical.id = 'repeat-owner'
  for (const measure of canonical.measures) { measure.id += '-owner'; for (const voice of measure.voices) for (const event of voice.events) event.id += '-owner' }
  const first = canonical.measures[0].voices[0].events[0], second = canonical.measures[1].voices[0].events[0]
  if (first.type !== 'note' || second.type !== 'note') throw Error('Expected note controls')
  second.pitch = structuredClone(first.pitch); first.ties = { start: true }; second.ties = { stop: true }
  for (const measure of part.staves[0].measures) { delete measure.repeat; delete measure.volta }
  part.staves.push(canonical)
  const before = structuredClone(score), timeline = createPlaybackTimeline(score)
  expect(timeline.events.filter(e => e.staffId === 'rh-staff').map(e => [e.eventId,e.startBeat,e.velocityStart,e.velocityEnd]))
    .toEqual([['rh-n0',0,.16,.16],['rh-n1',4,.16,.16],['rh-n0',8,.16,.16],['rh-n2',12,.16,.16]])
  const sustained = timeline.events.find(e => e.staffId === 'repeat-owner' && e.startBeat === 0)!
  expect(sustained.durationBeats).toBe(8)
  expect(sustained.tiedEvents).toEqual([{ eventId: 'rh-n1-owner', measureId: 'rh-m1-owner' }])
  expect(score).toEqual(before)
})

it('keeps an interrupted tied endpoint and diminuendo written while rejecting its cross-ending ramp', () => {
  const { score } = createRepeatHairpinFixture('cross-ending'), measures = score.parts[0].staves[0].measures
  const start = measures[1].voices[0].events[0], stop = measures[2].voices[0].events[0]
  if (start.type !== 'note' || stop.type !== 'note') throw Error('Expected note controls')
  stop.pitch = structuredClone(start.pitch); start.ties = { start: true }; stop.ties = { stop: true }
  score.hairpins![0].type = 'diminuendo'
  const before = structuredClone(score), timeline = createPlaybackTimeline(score)
  expect(timeline.events.map(e => [e.startBeat,e.durationBeats,e.velocityStart,e.velocityEnd]))
    .toEqual([0,4,8,12].map(beat => [beat,4,.16,.16]))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(before)
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  expect(score).toEqual(before)
})

it('does not apply a voice-local repeated ramp to neighboring parts, staves or voices', () => {
  const { score } = createRepeatHairpinFixture('internal')
  const original = score.parts[0]
  for (const measure of original.staves[0].measures) {
    const voice = structuredClone(measure.voices[0]); voice.id = 'voice-2'; voice.events[0].id += '-voice'; measure.voices.push(voice)
  }
  const staff = structuredClone(original.staves[0]); staff.id = 'neighbor-staff'
  for (const m of staff.measures) { m.id += '-staff'; for (const v of m.voices) for (const e of v.events) e.id += '-staff' }
  original.staves.push(staff)
  const part = structuredClone(original); part.id = 'neighbor-part'
  for (const s of part.staves) { s.id += '-part'; for (const m of s.measures) { m.id += '-part'; for (const v of m.voices) for (const e of v.events) e.id += '-part' } }
  score.parts.push(part)
  const snapshot = structuredClone(score), timeline = createPlaybackTimeline(score)
  const neighbors = timeline.events.filter(e => e.partId !== 'rh-part' || e.staffId !== 'rh-staff' || e.voiceId !== 'voice-1')
  expect(neighbors.length).toBe(49)
  expect(neighbors.every(e => e.velocityStart === .16 && e.velocityEnd === .16)).toBe(true)
  expect(createPianoCommands(timeline, 0, 120, { 'rh-part': { muted: false, solo: true, volume: .5 } }).filter(c => c.type === 'on')).toHaveLength(28)
  expect(score).toEqual(snapshot)
})

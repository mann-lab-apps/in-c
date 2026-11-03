import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from './index'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createRepeatHairpinFixture } from '../testing/repeat-hairpin-fixture'
import { createRepeatTempoStateFixture } from '../testing/repeat-tempo-state-fixture'
import { secondaryRepeatFixture } from '../testing/secondary-repeat-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { TICKS_PER_QUARTER, type Score } from '../score-core'

const envelope = (score: Score) => createPlaybackTimeline(score).events.map(event => [
  event.partId, event.staffId, event.voiceId, event.startBeat, event.durationBeats,
  event.frequency, event.frequencies, event.velocityStart, event.velocityEnd
])

function rangeOrder(score: Score) {
  const addresses = new Map<string, number[]>()
  score.parts.forEach((part, p) => part.staves.forEach((staff, s) => staff.measures.forEach((measure, m) => {
    measure.voices.forEach((voice, v) => voice.events.forEach(event => addresses.set(event.id, [p, s, m, v, event.position.tick])))
  })))
  return score.hairpins?.map(span => ({ start: addresses.get(span.startEventId), end: addresses.get(span.endEventId), type: span.type }))
}

function copied(score: Score, pairs: number[][], label: string) {
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score))
  const ordinary = serializeMusicXml(score), result = expandScoreRepeatsForMusicXml(score)
  const locations = new Map<string, { index: number; tick: number }>()
  for (const part of result.parts) for (const staff of part.staves) staff.measures.forEach((measure, index) => {
    for (const voice of measure.voices) for (const event of voice.events) locations.set(event.id, { index, tick: event.position.tick })
  })
  expect(result.hairpins?.map(span => [locations.get(span.startEventId)?.index, locations.get(span.endEventId)?.index])).toEqual(pairs)
  expect(envelope(result)).toEqual(envelope(score))
  const { contents, report } = serializeMusicXmlWithReport(result), reopened = parseMusicXml(contents)
  expect(contents.match(/<wedge\b[^>]*type="(?:crescendo|diminuendo)"/g)).toHaveLength(pairs.length)
  expect(contents.match(/<wedge\b[^>]*type="stop"/g)).toHaveLength(pairs.length)
  expect(reopened.hairpins).toHaveLength(pairs.length)
  expect(rangeOrder(reopened)).toEqual(rangeOrder(result))
  expect(envelope(reopened).map(row => row.slice(3))).toEqual(envelope(score).map(row => row.slice(3)))
  expect(serializeMidi(result)).toEqual(serializeMidi(score))
  expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  expect(serializeMusicXml(score)).toBe(ordinary)
  const qa = process.env.DDIRORI_REPEAT_HAIRPIN_COPY_OUT
  if (qa) {
    const directory = join(qa, label); mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), native)
    writeFileSync(join(directory, 'source.musicxml'), ordinary)
    writeFileSync(join(directory, 'expanded.musicxml'), contents)
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(score))
    writeFileSync(join(directory, 'oracle.json'), JSON.stringify({ pairs: result.hairpins?.map(span => ({
      from: locations.get(span.startEventId), to: locations.get(span.endEventId), type: span.type
    })), sourceHairpins: score.hairpins, envelope: envelope(score), warnings: report.warnings }))
  }
  return { result, report }
}

it.each([
  ['crescendo', false], ['diminuendo', false], ['crescendo', true], ['diminuendo', true]
] as const)('copies complete repeated %s ranges with rest start=%s and exact velocity envelopes', (type, rest) => {
  const { score } = createRepeatHairpinFixture('internal', rest)
  score.hairpins![0].type = type
  score.hairpins![0].engraving = { placement: 'above', offsetY: 0, height: 4 }
  const { result, report } = copied(score, [[0, 1], [2, 3], [4, 5]], `hairpin-${type}-${rest ? 'rest' : 'note'}`)
  expect(result.hairpins?.map(span => span.engraving)).toEqual(Array(3).fill(score.hairpins![0].engraving))
  expect(report.warnings.filter(warning => warning.code === 'unsupported-layout')).toHaveLength(3)
  expect(new Set(result.hairpins?.map(span => span.id)).size).toBe(3)
  const expected = type === 'crescendo'
    ? [[.16, .20], [.20, .24], [.16, .20], [.20, .24], [.16, .20], [.20, .24], [.16, .16]]
    : [[.16, .12], [.12, .08], [.16, .12], [.12, .08], [.16, .12], [.12, .08], [.16, .16]]
  createPlaybackTimeline(result).events.forEach((event, index) => {
    expect(event.velocityStart).toBeCloseTo(expected[index][0])
    expect(event.velocityEnd).toBeCloseTo(expected[index][1])
  })
})

it('copies a same-measure range without joining repeated passes', () => {
  const score = createRepeatTempoStateFixture()
  score.hairpins = [{ id: 'within-bar', startEventId: 'tempo-a', endEventId: 'tempo-b', type: 'crescendo' }]
  copied(score, [[0, 0], [1, 1], [2, 2]], 'hairpin-same-measure')
})

it('copies a complete introduction range only on its original complete occurrence', () => {
  const { score } = createRepeatHairpinFixture('internal'), measures = score.parts[0].staves[0].measures
  delete measures[0].repeat; measures[1].repeat = { start: true, end: true, times: 2 }
  copied(score, [[0, 1]], 'hairpin-introduction')
})

it.each([false, true])('preserves overlapping source range order instead of sorting its velocity effects reversed=%s', reversed => {
  const { score } = createRepeatHairpinFixture('internal'), measures = score.parts[0].staves[0].measures
  const second = structuredClone(measures[0].voices[0].events[0]); second.id = 'second-note'
  second.duration = { value: 'half', dots: 0 }; second.position.tick = 2 * TICKS_PER_QUARTER
  measures[0].voices[0].events[0].duration = { value: 'half', dots: 0 }
  measures[0].voices[0].events.push(second)
  score.hairpins!.push({ id: 'inner-second', startEventId: 'second-note', endEventId: 'rh-n1', type: 'diminuendo' })
  if (reversed) score.hairpins!.reverse()
  const { result } = copied(score, [[0, 1], [0, 1], [2, 3], [2, 3], [4, 5], [4, 5]], reversed ? 'hairpin-overlap-reversed' : 'hairpin-overlap')
  expect(result.hairpins?.map(span => span.type)).toEqual(Array(3).fill(reversed ? ['diminuendo', 'crescendo'] : ['crescendo', 'diminuendo']).flat())
})

it.each(['missing-first-stop', 'missing-last-stop', 'cross-ending'] as const)('rejects %s instead of clipping or bridging a jump', kind => {
  const { score } = createRepeatHairpinFixture(kind), before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/)
  expect(score).toEqual(before)
  const qa = process.env.DDIRORI_REPEAT_HAIRPIN_COPY_OUT
  if (qa) {
    const directory = join(qa, `unsupported-hairpin-${kind}`); mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(directory, 'source.musicxml'), serializeMusicXml(score))
    writeFileSync(join(directory, 'expected.mid'), serializeMidi(score))
  }
})

it('retains a secondary repeat owner and leaves neighboring staves, parts and voices unchanged', () => {
  const { score } = secondaryRepeatFixture('lower', 'repeat'), primary = score.parts[0].staves[0]
  for (const measure of primary.measures) {
    const voice = structuredClone(measure.voices[0]); voice.id = 'voice-2'
    for (const event of voice.events) event.id += '-neighbor'
    measure.voices.push(voice)
  }
  score.hairpins = [{ id: 'local-primary', type: 'crescendo', startEventId: 'primary-note-0', endEventId: 'primary-note-1' }]
  const { result } = copied(score, [[0, 1], [2, 3]], 'hairpin-secondary-owner')
  const neighbors = createPlaybackTimeline(result).events.filter(event => event.partId !== score.parts[0].id || event.staffId !== primary.id || event.voiceId === 'voice-2')
  expect(neighbors.length).toBeGreaterThan(0)
  expect(neighbors.every(event => event.velocityStart === .16 && event.velocityEnd === .16)).toBe(true)
})

it.each(['reversed', 'missing', 'cross-voice'] as const)('rejects %s hairpin endpoints without changing the source', kind => {
  const { score } = createRepeatHairpinFixture('internal')
  if (kind === 'reversed') Object.assign(score.hairpins![0], { startEventId: 'rh-n1', endEventId: 'rh-n0' })
  if (kind === 'missing') score.hairpins![0].endEventId = 'absent'
  if (kind === 'cross-voice') score.parts[0].staves[0].measures[1].voices[0].id = 'another-voice'
  const before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/)
  expect(score).toEqual(before)
})

it('rejects noncanonical cross-measure range order instead of changing overlapping playback precedence', () => {
  const { score } = createRepeatHairpinFixture('internal'), measure = score.parts[0].staves[0].measures[1]
  const second = structuredClone(measure.voices[0].events[0]); second.id = 'later-end'
  second.position.tick = 2 * TICKS_PER_QUARTER; second.duration = { value: 'half', dots: 0 }
  measure.voices[0].events[0].duration = { value: 'half', dots: 0 }; measure.voices[0].events.push(second)
  score.hairpins!.unshift({ id: 'later-start-first', startEventId: 'rh-n1', endEventId: 'later-end', type: 'diminuendo' })
  const before = structuredClone(score)
  expect(() => expandScoreRepeatsForMusicXml(score)).toThrow(/MusicXML/)
  expect(score).toEqual(before)
})

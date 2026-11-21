import { expect, it } from 'vitest'
import { createSwingPlaybackFixture, createInternalSwingPickupFixture as internalPickup } from '../../../testing/swing-playback-fixture'
import { TICKS_PER_QUARTER as T } from '../../../score-core'
import { createPlaybackTimeline } from './timeline'
import { createPracticeLoopPlan } from './practice-loop'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'


it.each([false, true])('releases the preceding bar before a delayed internal pickup attack, fermata=%s', fermata => {
  const score = internalPickup(fermata), timeline = createPlaybackTimeline(score), before = structuredClone(score)
  const preceding = timeline.events.find(event => event.eventId === 'swing-7')!, pickup = timeline.events.find(event => event.eventId === 'short-note')!
  expect(preceding.startBeat).toBeCloseTo(3.6)
  expect(preceding.startBeat + preceding.durationBeats).toBeCloseTo(fermata ? 4.2 : 4)
  expect(pickup.startBeat).toBeCloseTo(fermata ? 4.3 : 4.1)
  expect(pickup.startBeat + pickup.durationBeats).toBeCloseTo(fermata ? 4.7 : 4.5)
  expect(timeline.totalBeats).toBeCloseTo(fermata ? 8.7 : 8.5)
  const address = { partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, voiceId: 'swing-voice', measureId: 'swing-bar' }
  expect(createPracticeLoopPlan(score, { type: 'event', eventId: 'swing-7', address }).range?.endBeat).toBeCloseTo(fermata ? 4.2 : 4)
  expect(score).toEqual(before)
})

it('keeps a tied chord continuous across the internal pickup while retaining source ownership', () => {
  const score = internalPickup(), bars = score.parts[0].staves[0].measures
  const from = bars[0].voices[0].events[7], to = bars[1].voices[0].events[0]
  if (from.type !== 'note' || to.type !== 'note') throw Error('Expected synthetic notes')
  from.pitches = [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }]; to.pitches = structuredClone(from.pitches)
  from.ties = { start: true }; to.ties = { stop: true }
  const native = encodeNativeProject(createNativeProject(score)), timeline = createPlaybackTimeline(score)
  const sustained = timeline.events.find(event => event.eventId === from.id)!
  expect(sustained.startBeat).toBeCloseTo(3.6)
  expect(sustained.startBeat + sustained.durationBeats).toBeCloseTo(4.5)
  expect(sustained.frequencies).toHaveLength(2)
  expect(sustained.tiedEvents).toEqual([{ eventId: to.id, measureId: bars[1].id }])
  expect(timeline.events.some(event => event.eventId === to.id)).toBe(false)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})

it('does not borrow a repeated pickup’s delayed attack for the preceding pass release', () => {
  const score = createSwingPlaybackFixture('eighth', '3:2'), staff = score.parts[0].staves[0], initial = staff.measures[0], regular = structuredClone(initial)
  initial.timing = { type: 'pickup', durationTicks: T / 2 }; initial.voices[0].events = initial.voices[0].events.slice(0, 1); initial.repeat = { start: true }
  regular.id = 'repeat-bar'; regular.number = 2; regular.repeat = { end: true, times: 2 }
  regular.voices[0].events = regular.voices[0].events.map(event => ({ ...event, id: 'repeat-' + event.id }))
  staff.measures.push(regular)
  const timeline = createPlaybackTimeline(score), endings = timeline.events.filter(event => event.eventId === 'repeat-swing-7')
  expect(endings).toHaveLength(2)
  expect(endings[0].startBeat + endings[0].durationBeats).toBeCloseTo(4.5)
  expect(endings[1].startBeat + endings[1].durationBeats).toBeCloseTo(9)
  const attacks = timeline.events.filter(event => event.eventId === 'swing-0').map(event => event.startBeat)
  expect(attacks).toHaveLength(2)
  expect(attacks[0]).toBeCloseTo(0.1, 10); expect(attacks[1]).toBeCloseTo(4.6, 10)
})

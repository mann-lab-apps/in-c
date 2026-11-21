import { expect, it } from 'vitest'
import { createSwingPlaybackFixture } from '../../../testing/swing-playback-fixture'
import { createPlaybackTimeline } from './timeline'
import { createPracticeLoopPlan } from './practice-loop'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'

it('keeps a part’s eighth-note swing identical when another part with straight sixteenths is removed', () => {
  const score = createSwingPlaybackFixture('eighth', '3:2'), first = score.parts[0]
  const other = createSwingPlaybackFixture('16th').parts[0]; other.id = 'other'; other.staves[0].id = 'other-staff'
  other.staves[0].measures[0].id = 'other-bar'; other.staves[0].measures[0].voices[0].id = 'other-voice'
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  score.parts.push(other)
  const before = encodeNativeProject(createNativeProject(score)), timeline = createPlaybackTimeline(score)
  const starts = timeline.events.map(event => event.startBeat)
  expect(starts).toEqual([...starts].sort((a, b) => a - b))
  const fullPart = timeline.events.filter(event => event.partId === first.id)
  const solo = createPlaybackTimeline({ ...score, parts: [first] })
  expect(fullPart[1].startBeat).toBeCloseTo(0.6)
  expect(fullPart).toEqual(solo.events)
  expect(timeline.events.filter(event => event.partId === 'other')[1].startBeat).toBe(0.25)
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})

it('keeps voice-local subdivision eligibility and loop anchors independent on one staff', () => {
  const score = createSwingPlaybackFixture('eighth', '3:2'), bar = score.parts[0].staves[0].measures[0]
  const short = createSwingPlaybackFixture('16th').parts[0].staves[0].measures[0].voices[0]
  short.id = 'voice-2'; for (const event of short.events) event.id = 'short-' + event.id
  bar.voices.push(short)
  const timeline = createPlaybackTimeline(score), address = { partId: score.parts[0].id, staffId: score.parts[0].staves[0].id, measureId: bar.id, voiceId: 'swing-voice' }
  expect(timeline.events.find(event => event.eventId === 'swing-1')!.startBeat).toBeCloseTo(0.6)
  expect(timeline.events.find(event => event.eventId === 'short-swing-1')!.startBeat).toBe(0.25)
  expect(createPracticeLoopPlan(score, { type: 'event', eventId: 'swing-1', address }).range).toEqual(expect.objectContaining({ startBeat: 0.6, endBeat: 1 }))
  expect(createPracticeLoopPlan(score, { type: 'event', eventId: 'short-swing-1', address: { ...address, voiceId: 'voice-2' } }).range).toEqual(expect.objectContaining({ startBeat: 0.25, endBeat: 0.5 }))
})

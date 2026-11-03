import { expect, it } from 'vitest'
import { collectPianoPitches } from './piano-cache-plan'
import type { PlaybackTimeline } from './timeline'

const event = { eventId: 'n', partId: 'p', staffId: 's', measureId: 'm', voiceId: 'v',
  startBeat: 0, durationBeats: 1, velocityStart: .16, velocityEnd: .16 }

it('prepares chord pitches and trill neighbors from every part, independent of the mixer', () => {
  const timeline: PlaybackTimeline = { events: [
    { ...event, frequencies: [440, 880], ornaments: ['trill'], trillFrequency: 493.8833012561241 },
    { ...event, partId: 'other', frequency: 220 }, { ...event, frequency: 440 }
  ], totalBeats: 4, tempoEvents: [] }
  expect(collectPianoPitches(timeline)).toEqual([69, 81, 71, 57])
})

it('leaves rests and inaudible out-of-range parts to transport validation', () => {
  const timeline: PlaybackTimeline = { events: [event, { ...event, frequency: 1 },
    { ...event, frequency: Infinity }], totalBeats: 4, tempoEvents: [] }
  expect(collectPianoPitches(timeline)).toEqual([])
})

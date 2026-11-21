import { createRest, decomposeDurationTicks, durationToTicks, measureDurationTicks, type Duration, type VoiceEvent } from '../score-core'
import { createVoiceMoveFixture } from './voice-move-fixture'

/** Exact owned measure, including complete legacy tuplets when requested. */
export function createTremoloTimingFixture(duration: Duration, marks: 1 | 2 | 3 = 1) {
  const score = createVoiceMoveFixture()
  score.title = '트레몰로 꼬리 간격 검증'
  const measure = score.parts[0].staves[0].measures[0], voice = measure.voices[0]
  const note = voice.events[0]
  if (note.type !== 'note') throw new Error('Expected owned leading note')
  note.duration = duration; note.tremolo = { type: 'single', marks }
  const events: VoiceEvent[] = [note], noteTicks = durationToTicks(duration)
  let tick = noteTicks
  for (let i = 1; i < (duration.tuplet?.actualNotes ?? 1); i++) {
    events.push(createRest({ id: 'tremolo-tuplet-rest-' + i, position: { tick }, duration }))
    tick += noteTicks
  }
  if (duration.tuplet) voice.tuplets = [{
    id: 'tremolo-timing-tuplet', eventIds: events.map(event => event.id),
    actualNotes: duration.tuplet.actualNotes, normalNotes: duration.tuplet.normalNotes
  }]
  const padding = decomposeDurationTicks(measureDurationTicks(measure) - tick)
  if (!padding) throw new Error('Owned timing fixture needs exact rest padding')
  for (const [i, restDuration] of padding.entries()) {
    events.push(createRest({ id: 'tremolo-tail-' + i, position: { tick }, duration: restDuration }))
    tick += durationToTicks(restDuration)
  }
  voice.events = events
  return score
}

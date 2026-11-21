import { createFullMeasureRest, createNote, createRest, TICKS_PER_QUARTER as T } from '../score-core'
import { createPracticeLoopFixture } from './practice-loop-fixture'
export function createVoiceMoveFixture(target = false) {
  const score = createPracticeLoopFixture()
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) measure.voices[0].id = 'voice-1'
  score.title = '빈 성부 이동 검증'
  score.slurs = [{ id: 'other-part-manual-slur', startEventId: 'lower-note-0', endEventId: 'lower-note-1', engraving: { placement: 'above', offsetX: 0, height: 4 } }]
  const measure = score.parts[0].staves[0].measures[0]
  measure.number = 10
  measure.voices[0].events = [
    createNote({ id: 'leading', pitch: { step: 'F', octave: 4, alter: 1 } }),
    createNote({ id: 'moving', position: { tick: T }, pitch: { step: 'F', octave: 4 } }),
    createNote({ id: 'following', position: { tick: 2 * T }, pitch: { step: 'F', octave: 4 } }),
    createRest({ id: 'tail', position: { tick: 3 * T } })
  ]
  if (target) measure.voices.push({ id: 'voice-2', events: [createFullMeasureRest({ id: 'empty-target' })] })
  return score
}

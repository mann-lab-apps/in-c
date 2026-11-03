import { createRepeatTempoStateFixture } from './repeat-tempo-state-fixture'
import { createRest, TICKS_PER_QUARTER } from '../score-core'

export function createMixedStaffPedalFixture(retakeLast = true, reverseStaves = false) {
  const score = createRepeatTempoStateFixture(), part = score.parts[0], upper = part.staves[0]
  const lower = structuredClone(upper); lower.id += '-lower'
  for (const staff of [upper, lower]) {
    if (staff === lower) for (const measure of staff.measures) {
      measure.id += '-lower'
      for (const voice of measure.voices) for (const event of voice.events) {
        event.id += '-lower'
        if (event.type === 'note') event.pitch.octave--
      }
    }
    const events = staff.measures[0].voices[0].events
    events[1].duration = { value: 'eighth', dots: 0 }
    events.push(createRest({ id: `gap-${staff.id}`, duration: { value: 'eighth', dots: 0 }, position: { tick: TICKS_PER_QUARTER * 1.5 } }))
  }
  part.staves.push(lower)
  if (reverseStaves) part.staves.reverse()
  // Global tempo is owned by the primary staff, even in the reversed layout.
  score.tempoEvents![0].measureId = part.staves[0].measures[0].id
  const down = { id: 'initial-down', partId: part.id, staffId: upper.id, measureId: upper.measures[0].id, tick: 0, value: 127 }
  const lift = { ...down, id: 'lower-lift', staffId: lower.id, measureId: lower.measures[0].id, tick: TICKS_PER_QUARTER, value: 32 }
  const retake = { ...down, id: 'upper-retake', tick: TICKS_PER_QUARTER }
  score.pedalEvents = [down, ...(retakeLast ? [lift, retake] : [retake, lift]), { ...lift, id: 'tail-up', measureId: lower.measures[1].id, tick: 0, value: 0 }]
  return score
}

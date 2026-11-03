import { expect, it } from 'vitest'
import { createPerformedPedalPlan } from './pedal-plan'
import { createScoreRepeatPlaybackPlan } from './repeat-plan'
import { createRepeatTempoStateFixture } from '../testing/repeat-tempo-state-fixture'

function fixture() {
  const score = createRepeatTempoStateFixture(), part = score.parts[0], staff = part.staves[0]
  score.pedalEvents = [{ id: 'press', partId: part.id, staffId: staff.id, measureId: staff.measures[0].id, tick: 0, value: 127 },
    { id: 'release', partId: part.id, staffId: staff.id, measureId: staff.measures[1].id, tick: 0, value: 0 }]
  return score
}
it('retains literal existing transport IDs, same-tick reset order and source identities without mutation', () => {
  const score = fixture(), before = structuredClone(score)
  expect(createPerformedPedalPlan(score, createScoreRepeatPlaybackPlan(score)).map(event => [event.id, event.startBeat, event.value, event.sourceId ?? null]))
    .toEqual([['press-0', 0, 127, 'press'], ['pedal-reset-tempo-part-1', 2, 0, null], ['press-1', 2, 127, 'press'],
      ['pedal-reset-tempo-part-2', 4, 0, null], ['press-2', 4, 127, 'press'], ['release-3', 6, 0, 'release']])
  expect(score).toEqual(before)
})
it('retains the old linear fallback when a shared repeat plan is not supplied', () => {
  expect(createPerformedPedalPlan(fixture()).map(event => [event.id, event.startBeat, event.value, event.measureIndex]))
    .toEqual([['press-0', 0, 127, 0], ['release-1', 2, 0, 1]])
})

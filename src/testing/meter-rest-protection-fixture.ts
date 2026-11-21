import { createDuration, createRest, createTimePosition, TICKS_PER_QUARTER } from '../score-core'
import { createNativeProject } from '../project/schema'
import { createNewScore } from '../renderer/src/editor/new-score'

/** Generated, owned QA score; never opens or changes a user's document. */
export function createMeterRestProtectionProject() {
  const score = createNewScore({ title: '마디 박자 보호 검증', templateId: 'duet', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const staff = score.parts[0].staves[0]
  staff.measures[0].voices[0].events = [0, 1, 2, 3].map(index => createRest({
    id: `protected-rest-${index}`, position: createTimePosition(index * TICKS_PER_QUARTER), duration: createDuration('quarter')
  }))
  Object.assign(staff.measures[1].voices[0].events[0], { fermata: true, breathMark: 'caesura' })
  score.hairpins = [{ id: 'protected-rest-hairpin', startEventId: 'protected-rest-0', endEventId: 'protected-rest-3',
    type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  return createNativeProject(score)
}

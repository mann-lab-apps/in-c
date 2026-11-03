import { createRest, TICKS_PER_QUARTER } from '../score-core'
import { createInteriorHairpinFixture } from './interior-hairpin-fixture'

export function createStemExpressionHairpinFixture(cross: boolean, manual: boolean) {
  const project = createInteriorHairpinFixture(cross, manual), score = project.score
  score.title = 'Generated low stem expression clearance'
  delete score.dynamics
  const voice = score.parts[0].staves[0].measures[1].voices[0], note = voice.events[0]
  if (note.type !== 'note') throw Error('Fixture needs a real middle note')
  delete note.lyrics
  note.pitch = { step: 'C', octave: 2 }; note.duration = { value: 'half', dots: 0 }
  voice.events.push(createRest({ id: 'interior-half-rest', position: { tick: 2 * TICKS_PER_QUARTER }, duration: { value: 'half', dots: 0 } }))
  return project
}

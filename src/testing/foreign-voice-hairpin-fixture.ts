import { createNote, createRest, createVoice, TICKS_PER_QUARTER } from '../score-core'
import { createStemExpressionHairpinFixture } from './stem-expression-hairpin-fixture'

/** Voice1 owns the wedge; unrelated voice2 supplies low ledger ink and beams. */
export function createForeignVoiceHairpinFixture(cross: boolean, manual: boolean) {
  const project = createStemExpressionHairpinFixture(cross, manual), score = project.score
  score.title = 'Generated competing voice beam clearance'
  const measure = score.parts[0].staves[0].measures[1]
  const anchor = measure.voices[0].events[0]
  if (anchor.type !== 'note') throw Error('Expected primary note')
  anchor.pitch = { step: 'C', octave: 4 }; anchor.duration = { value: 'whole', dots: 0 }
  measure.voices[0].events = [anchor]
  const pitches = ['C', 'E', 'D', 'F'] as const
  measure.voices.push(createVoice({ id: 'voice-2', events: [
    ...pitches.map((step, index) => createNote({ id: `foreign-low-${index}`, position: { tick: index * TICKS_PER_QUARTER / 2 }, pitch: { step, octave: 1 }, duration: { value: 'eighth', dots: 0 } })),
    createRest({ id: 'foreign-rest', position: { tick: 2 * TICKS_PER_QUARTER }, duration: { value: 'half', dots: 0 } })
  ] }))
  score.slurs = [{ id: 'retained-manual-slur', startEventId: 'interior-note-0', endEventId: 'interior-note-2', engraving: { offsetY: 0, height: 3 } }]
  return project
}

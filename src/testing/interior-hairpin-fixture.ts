import { createNote, createVoice } from '../score-core'
import { createNativeProject } from '../project/schema'
import { createNewScore } from '../renderer/src/editor/new-score'

export function createInteriorHairpinFixture(cross: boolean, manual: boolean) {
  const score = createNewScore({ title: 'Generated interior hairpin clearance', keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 }, measureCount: 3 })
  const measures = score.parts[0].staves[0].measures
  for (const [index, measure] of measures.entries()) {
    const note = createNote({ id: `interior-note-${index}`, pitch: { step: 'C', octave: 4 }, duration: { value: 'whole', dots: 0 } })
    if (index === 1) note.lyrics = [{ number: 1, text: '가나다', syllabic: 'single' }, { number: 2, text: '라마바', syllabic: 'single' }]
    measure.voices = [createVoice({ id: 'voice-1', events: [note] })]
  }
  score.hairpins = [{ id: 'interior-hairpin', startEventId: 'interior-note-0', endEventId: 'interior-note-2', type: 'crescendo', ...(manual ? { engraving: { offsetY: 0, height: 2 } } : {}) }]
  score.dynamics = [{ id: 'interior-dynamic', measureId: measures[1].id, value: 'mf' }]
  score.expressionTexts = [{ id: 'interior-expression', measureId: measures[1].id, text: 'dolce', tick: 0 }]
  if (cross) score.layout = { systemBreakBeforeMeasureIds: [measures[1].id] }
  return createNativeProject(score)
}

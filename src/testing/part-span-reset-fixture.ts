import { createStructuralPartLayoutFixture } from './structural-part-layout-fixture'
import { createNote } from '../score-core'
import { validateNativeProject } from '../project/schema'

export function createPartSpanResetFixture() {
  const { project } = createStructuralPartLayoutFixture(), piano = project.score.parts[1], upper = piano.staves[0]
  const last = upper.measures[2]
  last.voices[0].events = [createNote({ id: 'shared-span-last', pitch: { step: 'C', octave: 4 }, duration: { value: 'whole', dots: 0 } })]
  const first = upper.measures[0].voices[0].events.find(e => e.type === 'note')!
  project.score.slurs = [...(project.score.slurs ?? []), { id: 'shared-reset-slur', startEventId: first.id, endEventId: 'shared-span-last', engraving: { offsetY: 0, height: 3 } }]
  const independent = project.partLayouts.find(p => p.partId === piano.id)!
  independent.layout.systemBreakBeforeMeasureIds = []
  independent.layout.pageBreakBeforeMeasureIds = [upper.measures[1].id]
  validateNativeProject(project)
  return project
}

import richXml from '../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import { parseMusicXml } from '../musicxml'
import { createNativeProject, validateNativeProject } from '../project/schema'
import { applyScoreCommand, createFullMeasureRest, createVoice } from '../score-core'
import { buildRemoveMeasure } from '../renderer/src/editor/measure-management'

export function createStructuralPartLayoutFixture() {
  const score = parseMusicXml(richXml)
  score.title = 'Independent part structural layout'
  for (const part of score.parts) for (const staff of part.staves) {
    const last = staff.measures.at(-1)!
    const extra = { ...last, id: `${part.id}-${staff.id}-extra-measure`, number: 3,
      voices: last.voices.map(voice => createVoice({ id: voice.id, events: [createFullMeasureRest({ id: `${part.id}-${staff.id}-${voice.id}-extra-rest` })] })) }
    delete extra.repeat; delete extra.volta
    staff.measures.push(extra)
  }
  const first = score.parts[0], piano = score.parts[1], lower = piano.staves[1]
  if (score.parts.length !== 2 || !lower || first.staves[0].measures.length !== 3) throw Error('Expected aligned two-part/grand-staff fixture')
  const a = first.staves[0].measures, b = lower.measures
  score.layout = { systemBreakBeforeMeasureIds: [a[1].id], pageBreakBeforeMeasureIds: [a[2].id] }
  const project = createNativeProject(score)
  project.view = { mode: 'part', partId: piano.id }
  project.partLayouts = [
    { partId: first.id, title: 'Independent A', layout: {
      systemBreakBeforeMeasureIds: [a[1].id, a[2].id], pageBreakBeforeMeasureIds: [a[1].id],
      pageSetup: { pageSize: 'a4', orientation: 'portrait', pageMarginMm: 7, staffSizePercent: 100, systemSpacingPercent: 100 }
    } },
    { partId: piano.id, title: 'Independent B', layout: {
      systemBreakBeforeMeasureIds: [b[1].id], pageBreakBeforeMeasureIds: [b[2].id],
      pageSetup: { pageSize: 'a4', orientation: 'portrait', pageMarginMm: 11, staffSizePercent: 100, systemSpacingPercent: 100 }
    } }
  ]
  validateNativeProject(project)
  const edit = buildRemoveMeasure(score, b[1].id)
  if (!edit) throw Error('Fixture must support aligned middle-measure removal')
  const deleted = structuredClone(project)
  deleted.score = applyScoreCommand(score, edit.command).score
  // Independent expected ownership: only the deleted anchors disappear.
  deleted.partLayouts[0].layout.systemBreakBeforeMeasureIds = [a[2].id]
  deleted.partLayouts[0].layout.pageBreakBeforeMeasureIds = []
  deleted.partLayouts[1].layout.systemBreakBeforeMeasureIds = []
  deleted.partLayouts[1].layout.pageBreakBeforeMeasureIds = [b[2].id]
  validateNativeProject(deleted)
  return { project, deleted, target: { partId: piano.id, staffId: lower.id, measureId: b[1].id, eventId: b[1].voices[0].events[0].id }, retained: { first: a[2].id, lower: b[2].id, upper: piano.staves[0].measures[2].id } }
}

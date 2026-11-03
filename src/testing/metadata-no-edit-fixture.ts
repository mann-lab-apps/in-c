import { partLabelSaveDraftFixture } from './part-label-save-draft-fixture'
export const metadataNoEditFields = ['title', 'composer', 'partTitle'] as const
export const metadataNoEditActions = ['blur', 'enter', 'typed-blur'] as const
export function metadataNoEditFixture(field: typeof metadataNoEditFields[number], action: typeof metadataNoEditActions[number]) {
  const project = partLabelSaveDraftFixture('name-change').project
  project.score.title = '  Stored title  '; project.score.composer = '  Stored composer  '
  const part = project.score.parts[0]!
  project.view = { mode: 'part', partId: part.id }; project.partLayouts = [{ partId: part.id, layout: {} }]
  const label = field === 'title' ? '악보 제목' : field === 'composer' ? '작곡가' : '파트보 제목 입력'
  const value = field === 'title' ? project.score.title : field === 'composer' ? project.score.composer : part.name
  const expected = structuredClone(project), changed = action !== 'blur'
  if (changed) {
    if (field === 'partTitle') expected.partLayouts[0]!.title = part.name
    else expected.score[field] = field === 'title' ? 'Stored title' : 'Stored composer'
  }
  return { project, expected, field, action, label, value, changed }
}

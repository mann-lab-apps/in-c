import { createMidiWarningScore, midiWarningRestOracle } from './midi-warning-fixture'
import { createNativeProject, validateNativeProject } from '../project/schema'

export const partLabelSaveDraftKinds = ['name-change', 'name-trim-equal', 'name-empty-fallback', 'abbreviation-clear', 'abbreviation-change', 'name-cancel'] as const
export type PartLabelSaveDraftKind = typeof partLabelSaveDraftKinds[number]
export function partLabelSaveDraftFixture(kind: PartLabelSaveDraftKind) {
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  project.score.title = 'Part label draft save'
  const part = project.score.parts[0]!
  part.abbreviation = 'Pno.'
  const abbreviation = kind.startsWith('abbreviation')
  const draft = kind === 'name-trim-equal' ? `  ${part.name}  ` : kind === 'name-empty-fallback' || kind === 'abbreviation-clear' ? '' : kind === 'abbreviation-change' ? '피아노' : '새 파트'
  const blocked = kind !== 'name-trim-equal' && kind !== 'name-empty-fallback'
  const confirm = kind !== 'name-cancel'
  const changed = blocked && confirm
  const expected = structuredClone(project)
  if (kind === 'name-change') expected.score.parts[0]!.name = draft
  if (kind === 'abbreviation-change') expected.score.parts[0]!.abbreviation = draft
  if (kind === 'abbreviation-clear') delete expected.score.parts[0]!.abbreviation
  return { project: validateNativeProject(project), expected: validateNativeProject(expected), kind, draft, blocked, confirm, changed, field: abbreviation ? 'abbreviation' as const : 'name' as const, value: abbreviation ? 'Pno.' : part.name, label: abbreviation ? '현재 파트 약어' : '현재 파트 이름' }
}

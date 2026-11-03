import { createMidiWarningScore, midiWarningRestOracle } from './midi-warning-fixture'
import { createNativeProject, validateNativeProject } from '../project/schema'

export const repeatSaveDraftKinds = ['change', 'format-default', 'clamp-high', 'clamp-low', 'empty', 'same', 'cancel'] as const
export type RepeatSaveDraftKind = typeof repeatSaveDraftKinds[number]
export function repeatSaveDraftFixture(kind: RepeatSaveDraftKind) {
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  project.score.title = 'Repeat draft save'
  const draft = kind === 'change' ? '3' : kind === 'format-default' ? '2.0' : kind === 'clamp-high' ? '12' : kind === 'clamp-low' ? '0' : kind === 'empty' ? '' : kind === 'same' ? '2' : '7'
  const changed = ['change', 'format-default', 'clamp-high', 'clamp-low'].includes(kind)
  const confirmedCount = kind === 'change' ? 3 : kind === 'clamp-high' ? 8 : 2
  const expected = structuredClone(project)
  if (changed) expected.score.parts[0]!.staves[0]!.measures[0]!.repeat = { end: true, times: confirmedCount }
  return { project: validateNativeProject(project), expected: validateNativeProject(expected), kind, draft, changed, blocked: kind !== 'same', confirm: kind !== 'cancel', confirmedCount, label: '반복 횟수', measureId: project.score.parts[0]!.staves[0]!.measures[0]!.id }
}

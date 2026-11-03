import { createMidiWarningScore, midiWarningRestOracle } from './midi-warning-fixture'
import { createNativeProject, validateNativeProject } from '../project/schema'

export const tempoSaveDraftKinds = ['change', 'remove', 'clamp-low', 'cancel-high', 'equal', 'empty-control'] as const
export type TempoSaveDraftKind = typeof tempoSaveDraftKinds[number]
export function tempoSaveDraftFixture(kind: TempoSaveDraftKind) {
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  project.score.title = 'Tempo draft save'
  const measures = project.score.parts[0]!.staves[0]!.measures
  const current = { id: 'tempo-save-current', measureId: measures[0]!.id, tick: 0, bpm: 96, beatUnit: 'quarter' as const, dots: 0 }
  const neighbor = { id: 'tempo-save-neighbor', measureId: measures[1]!.id, tick: 0, bpm: 88, beatUnit: 'half' as const, dots: 1 }
  project.score.tempoEvents = kind === 'empty-control' ? [neighbor] : [current, neighbor]
  const draft = kind === 'change' ? '97' : kind === 'remove' || kind === 'empty-control' ? '' : kind === 'clamp-low' ? '0' : kind === 'cancel-high' ? '241' : '96.0'
  const blocked = kind !== 'equal' && kind !== 'empty-control'
  const confirm = kind !== 'cancel-high'
  const changed = blocked && confirm
  const expected = structuredClone(project)
  if (kind === 'remove') expected.score.tempoEvents = [neighbor]
  // The existing update command keeps unrelated entries in order and appends
  // the replacement with its original identity/anchor; do not invent sorting.
  if (kind === 'change' || kind === 'clamp-low') expected.score.tempoEvents = [neighbor, { ...current, bpm: kind === 'change' ? 97 : 40 }]
  return { project: validateNativeProject(project), expected: validateNativeProject(expected), kind, draft, blocked, confirm, changed, value: kind === 'empty-control' ? undefined : 96, label: '위치별 빠르기 BPM' }
}

import { createMidiWarningScore, midiWarningRestOracle } from './midi-warning-fixture'
import { createNativeProject, validateNativeProject } from '../project/schema'
import type { SpanEngraving } from '../score-core'

export const geometrySaveDraftKinds = ['auto-to-zero', 'zero-to-auto', 'auto-height', 'invalid-height', 'invalid-height-zero', 'same-auto', 'same-zero'] as const
export type GeometrySaveDraftKind = typeof geometrySaveDraftKinds[number]
export function geometrySaveDraftFixture(kind: GeometrySaveDraftKind) {
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  project.score.title = 'Geometry draft save'
  const events = project.score.parts[0]!.staves[0]!.measures.map(m => m.voices[0]!.events[0]!)
  const offset = kind === 'auto-to-zero' || kind === 'zero-to-auto' || kind === 'same-zero'
  const initial: SpanEngraving | undefined = kind === 'zero-to-auto' || kind === 'same-zero'
    ? { offsetY: 0, height: 4 } : kind.startsWith('invalid') ? { height: 4 } : undefined
  project.score.hairpins = [{ id: 'geometry-save-span', type: 'crescendo', startEventId: events[0].id, endEventId: events[1].id, ...(initial ? { engraving: initial } : {}) }]
  const field = offset ? 'offsetY' as const : 'height' as const
  const draft = kind === 'auto-to-zero' ? '0' : kind === 'zero-to-auto' || kind === 'same-auto' ? '' : kind === 'auto-height' ? '2.25' : kind === 'same-zero' ? '0.00' : kind === 'invalid-height-zero' ? '0' : '9'
  const blocked = kind !== 'same-auto' && kind !== 'same-zero'
  const confirm = !kind.startsWith('invalid')
  const next: SpanEngraving | undefined = kind === 'auto-to-zero' ? { offsetY: 0 } : kind === 'zero-to-auto' ? { height: 4 } : kind === 'auto-height' ? { height: 2.25 } : initial
  return { project: validateNativeProject(project), kind, field, label: offset ? '표기 세로 이동' : '표기 높이', draft, blocked, confirm, initial, next }
}

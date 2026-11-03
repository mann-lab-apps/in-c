import { createRepeatTieFixture } from './repeat-tie-fixture'
import { serializeMusicXml } from '../musicxml/serialize'

export const conditionalTieCases = ['first-pass', 'second-pass', 'all-passes', 'unconditional'] as const
export type ConditionalTieCase = typeof conditionalTieCases[number]

export function createConditionalTieFixture(kind: ConditionalTieCase) {
  const { score: existingModel, expanded: reference } = createRepeatTieFixture('internal', false)
  existingModel.title = 'Pass-specific tie import contract'
  const condition = kind === 'first-pass' ? '1' : kind === 'second-pass' ? '2' : kind === 'all-passes' ? '1, 2' : undefined
  const original = serializeMusicXml(existingModel)
  const xml = condition ? original.replace(/<tie type="(start|stop)"\s*\/>/g, (_, type) => `<tie type="${type}" time-only="${condition}"/>`) : original
  if (kind === 'first-pass' || kind === 'second-pass') {
    const removed = kind === 'first-pass' ? [2, 3] : [0, 1]
    for (const i of removed) {
      const note = reference.parts[0].staves[0].measures[i].voices[0].events[0]
      if (note.type !== 'note') throw Error('Fixture')
      delete note.ties
    }
  }
  return { xml, existingModel, reference, condition }
}

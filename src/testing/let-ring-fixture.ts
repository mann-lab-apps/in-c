import { createWholeChordTieScore } from './chord-tie-fixture'
import { serializeMusicXml } from '../musicxml/serialize'

export const letRingCases = ['single', 'chord', 'alongside', 'normal'] as const
export type LetRingCase = typeof letRingCases[number]

export function createLetRingFixture(kind: LetRingCase) {
  const existingModel = createWholeChordTieScore(false, kind === 'chord')
  existingModel.title = 'Let-ring notation import contract'
  if (kind === 'single' || kind === 'chord') for (const m of existingModel.parts[0].staves[0].measures) {
    const n = m.voices[0].events[0]; if (n.type === 'note') delete n.ties
  }
  let index = 0
  const xml = serializeMusicXml(existingModel).replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => {
    const i = index++
    if (!(kind === 'single' && i === 0 || kind === 'chord' && i < 2 || kind === 'alongside' && i === 1)) return note
    return note.includes('<notations>') ? note.replace('</notations>', '<tied type="let-ring"/></notations>') : note.replace('</note>', '<notations><tied type="let-ring"/></notations></note>')
  })
  return { xml, existingModel, warnings: kind === 'normal' ? 0 : kind === 'chord' ? 2 : 1 }
}

import { createWholeChordTieScore } from './chord-tie-fixture'
import { serializeMusicXml } from '../musicxml/serialize'

export const importWarningCases = ['mixed', 'many', 'technical', 'unknown'] as const
export type ImportWarningCase = typeof importWarningCases[number]

export function createImportWarningFixture(kind: ImportWarningCase) {
  const existingModel = createWholeChordTieScore(false)
  const staff = existingModel.parts[0].staves[0], original = structuredClone(staff.measures)
  const count = kind === 'many' || kind === 'technical' ? 8 : 2
  staff.measures = Array.from({ length: count }, (_, index) => {
    const m = structuredClone(original[index % 2]); m.id = `warning-measure-${index + 1}`; m.number = index + 1
    m.voices[0].events[0].id = `warning-event-${index + 1}`
    const note = m.voices[0].events[0]
    if (note.type !== 'note') throw Error('Fixture')
    if (kind === 'technical') delete note.ties
    return m
  })
  existingModel.title = `Warning workflow ${kind}`
  let rootIndex = -1
  const xml = serializeMusicXml(existingModel).replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => {
    const member = /<chord\b/.test(note)
    if (!member) rootIndex++
    if (kind !== 'technical' && member) note = note.replace(/\s*<tied\b[^>]*\/>/g, '').replace(/\s*<notations>\s*<\/notations>/g, '')
    if (!member && (kind === 'many' || kind === 'technical' || rootIndex === 0)) {
      const notation = kind === 'unknown' ? '<ornaments><schleifer/></ornaments>' : '<technical><fingering>2</fingering></technical>'
      note = note.includes('<notations>') ? note.replace('</notations>', notation + '</notations>') : note.replace('</note>', '<notations>' + notation + '</notations></note>')
    }
    return note
  })
  return { xml, existingModel, warningCount: kind === 'many' ? 16 : kind === 'technical' ? 8 : 3 }
}

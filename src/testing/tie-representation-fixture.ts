import { createWholeChordTieScore } from './chord-tie-fixture'
import { serializeMusicXml } from '../musicxml/serialize'

export const tieRepresentationCases = ['sound-whole-notation-root', 'sound-whole-notation-upper', 'notation-whole-sound-root', 'notation-whole-sound-upper', 'sound-only', 'notation-only', 'middle-stop'] as const
export type TieRepresentationCase = typeof tieRepresentationCases[number]

export function createTieRepresentationFixture(kind: TieRepresentationCase) {
  const existingModel = createWholeChordTieScore(false)
  if (kind === 'middle-stop') {
    const staff = existingModel.parts[0].staves[0]
    const middle = staff.measures[1].voices[0].events[0]
    if (middle.type !== 'note') throw Error('Fixture')
    middle.ties = { stop: true, start: true }
    const last = structuredClone(staff.measures[1])
    last.id += '-end'; last.number = 3
    const note = last.voices[0].events[0]
    note.id += '-end'; if (note.type !== 'note') throw Error('Fixture')
    note.ties = { stop: true }; staff.measures.push(last)
  }
  let noteIndex = 0
  const xml = serializeMusicXml(existingModel).replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => {
    const index = noteIndex++, member = /<chord\b/.test(note)
    if (kind === 'middle-stop') return index === 3 ? note.replace(/\s*<tied\b[^>]*type="stop"[^>]*\/>/g, '') : note
    const removeNotation = kind === 'sound-only' || kind === 'sound-whole-notation-root' && member || kind === 'sound-whole-notation-upper' && !member
    const removeSound = kind === 'notation-only' || kind === 'notation-whole-sound-root' && member || kind === 'notation-whole-sound-upper' && !member
    if (removeNotation) note = note.replace(/\s*<tied\b[^>]*\/>/g, '')
    if (removeSound) note = note.replace(/\s*<tie\b[^>]*\/>/g, '')
    return note.replace(/\s*<notations>\s*<\/notations>/g, '')
  })
  return { xml, existingModel, warnings: kind === 'middle-stop' ? 1 : kind.endsWith('-only') ? 0 : 2 }
}

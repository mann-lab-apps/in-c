import { createWholeChordTieScore } from './chord-tie-fixture'
import { createNote, createVoice } from '../score-core'
import { serializeMusicXml } from '../musicxml/serialize'

export type PartialChordTieCase = 'root-only' | 'upper-only' | 'whole' | 'parallel-voice'

export function createPartialChordTieFixture(kind: PartialChordTieCase) {
  const canonical = createWholeChordTieScore(false)
  if (kind === 'parallel-voice') for (const [index, measure] of canonical.parts[0].staves[0].measures.entries()) {
    measure.voices.push(createVoice({ id: 'voice-2', events: [createNote({ id: `untied-peer-${index}`, pitch: { step: 'G', octave: 4, alter: 0 }, pitches: [{ step: 'G', octave: 4, alter: 0 }, { step: 'B', octave: 4, alter: 0 }], duration: { value: 'whole', dots: 0 } })] }))
  }
  const originalXml = serializeMusicXml(canonical)
  const xml = originalXml.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => {
    const member = /<chord\b/.test(note)
    if (!(kind === 'root-only' && member || kind === 'upper-only' && !member)) return note
    return note.replace(/\s*<tie\b[^>]*\/>/g, '').replace(/\s*<tied\b[^>]*\/>/g, '')
      .replace(/\s*<notations>\s*<\/notations>/g, '')
  })
  // Existing event-level import policy, not an oracle of partial-tie fidelity.
  const existingModel = structuredClone(canonical)
  if (kind === 'upper-only') for (const measure of existingModel.parts[0].staves[0].measures) {
    const note = measure.voices[0].events[0]; if (note.type === 'note') delete note.ties
  }
  return { xml, existingModel }
}

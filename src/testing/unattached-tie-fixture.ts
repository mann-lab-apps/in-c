import { createWholeChordTieScore } from './chord-tie-fixture'
import { serializeMusicXml } from '../musicxml/serialize'

// MusicXML start then stop on one note is an intentionally standalone visual
// tie, distinct from a sound chain's stop-then-start middle note.
export function unattachedTieXml(kind: 'first' | 'last' | 'chord') {
  const score = createWholeChordTieScore(false, kind === 'chord')
  for (const measure of score.parts[0].staves[0].measures)
    for (const note of measure.voices[0].events) if (note.type === 'note') delete note.ties
  let index = 0
  return serializeMusicXml(score).replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => {
    const target = index++ === (kind === 'last' ? 1 : 0)
    return target ? note.replace('</note>', '<notations><tied type="start"/><tied type="stop"/></notations></note>') : note
  })
}

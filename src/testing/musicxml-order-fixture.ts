import { createNote, type Score } from '../score-core'
import { createNewScore } from '../renderer/src/editor/new-score'
import { parseMusicXml } from '../musicxml/parse'
import richPartXml from '../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'

export const xmlOrderKinds = ['tie', 'dotted-accidental', 'tuplet-staff', 'lower-grace', 'upper-grace', 'system-text', 'transparent-tempo'] as const
export type XmlOrderKind = typeof xmlOrderKinds[number]

export function musicXmlOrderFixture(kind: XmlOrderKind): Score {
  const score = kind === 'tuplet-staff' ? parseMusicXml(richPartXml) : createNewScore({
    title: `MusicXML order ${kind}`, templateId: 'piano-grand-staff', measureCount: 2,
    timeSignature: { beats: 4, beatType: 4 }, keySignature: { fifths: 0 }
  })
  score.title = `MusicXML order ${kind}`
  score.tempo = { bpm: 96, beatUnit: 'quarter', dots: 0, text: 'Andante espressivo' }
  const [upper, lower] = score.parts[0].staves
  const note = (id: string, octave = 4) => createNote({ id, pitch: { step: 'C', octave }, duration: { value: 'whole', dots: 0 } })
  if (kind !== 'tuplet-staff') upper.measures[0].voices[0].events = [note('order-first')]
  if (kind === 'tie') {
    upper.measures[0].voices[0].events = [{ ...note('order-first'), ties: { start: true } }]
    upper.measures[1].voices[0].events = [{ ...note('order-second'), ties: { stop: true } }]
  }
  if (kind === 'dotted-accidental') upper.measures[0].voices[0].events = [
    createNote({ id: 'dotted-sharp', pitch: { step: 'C', alter: 1, octave: 4 }, duration: { value: 'half', dots: 1 } }),
    createNote({ id: 'after-dot', position: { tick: 40320 }, pitch: { step: 'D', octave: 4 }, duration: { value: 'quarter', dots: 0 } })
  ]
  if (kind === 'lower-grace') lower.measures[0].voices[0].events = [{ ...note('lower-grace-main', 3),
    graceNotes: [{ pitch: { step: 'D', alter: 1, octave: 3 }, slash: true }] }]
  if (kind === 'upper-grace') upper.measures[0].voices[0].events = [{ ...note('upper-grace-main'),
    lyrics: [{text:'꾸밈음'}], graceNotes: [{pitch:{step:'D',alter:1,octave:4},slash:true}, {pitch:{step:'E',alter:0,octave:4},slash:false}] }]
  if (kind === 'system-text') score.systemTexts = [{ id: 'order-system', measureId: upper.measures[0].id, text: 'System text' }]
  if (kind === 'transparent-tempo') score.tempo = { bpm: 72, beatUnit: 'half', dots: 1, text: 'Andante espressivo', transparent: true }
  return score
}

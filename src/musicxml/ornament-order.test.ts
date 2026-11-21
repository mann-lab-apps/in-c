import { expect, it } from 'vitest'
import { createNote, createScore, type Ornament } from '../score-core'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

const orders: Ornament[][] = [
  ['mordent', 'trill'], ['turn', 'trill'], ['inverted-mordent', 'mordent'],
  ['turn', 'inverted-mordent', 'mordent', 'trill'],
  ['trill', 'mordent', 'inverted-mordent', 'turn']
]
function fixture(ornaments: Ornament[]) {
  const score = createScore()
  score.parts[0].staves[0].measures[0].voices[0].events = [createNote({
    id: 'ordered-ornaments', pitch: { step: 'C', octave: 4 },
    duration: { value: 'whole', dots: 0 }, ornaments
  })]
  return score
}
const note = (score: ReturnType<typeof fixture>) => score.parts[0].staves[0].measures[0].voices[0].events[0]
it.each(orders.map(order => ({ order })))('preserves visible ornament order $order through XML and repeated export', ({ order }) => {
  const score = fixture(order), before = encodeNativeProject(createNativeProject(score))
  const xml = serializeMusicXml(score), parsed = parseMusicXmlWithReport(xml)
  expect(note(parsed.score)).toMatchObject({ ornaments: order })
  expect(parsed.report.warnings).toEqual([])
  expect(note(parseMusicXmlWithReport(serializeMusicXml(parsed.score)).score)).toMatchObject({ ornaments: order })
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(score))
  expect(encodeNativeProject(createNativeProject(score))).toBe(before)
})
it('retains source order around tremolo and deduplicates the legacy trill alias', () => {
  const xml = serializeMusicXml(fixture(['turn', 'trill', 'mordent']))
    .replace('<trill-mark/>', '<tremolo type="single">1</tremolo><trill-mark/><trill/>')
  const parsed = parseMusicXmlWithReport(xml)
  expect(note(parsed.score)).toMatchObject({ ornaments: ['turn', 'trill', 'mordent'], tremolo: { type: 'single', marks: 1 } })
  // Legacy <trill> is a reader compatibility control, not an XSD-valid example.
})

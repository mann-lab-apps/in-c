import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const art = '<articulations><staccato/></articulations>'
const prefix = 'Unrepresented notation visibility '
const base = 'part[1].measure[1].note[1].notations'
function visibility(groups: string[], value = 'no', target = 0): string {
  let index = 0
  return fixture(groups).replace(/<notations>/g, () => index++ === target ? `<notations print-object="${value}">` : '<notations>')
}
function preservesProjection(xml: string, control: string): void {
  const actual = parseMusicXmlWithReport(xml).score, reference = parseMusicXmlWithReport(control).score
  expect(actual).toEqual(reference)
  expect(encodeNativeProject(createNativeProject(actual))).toBe(encodeNativeProject(createNativeProject(reference)))
  expect(serializeMusicXml(actual)).toBe(serializeMusicXml(reference))
  expect(serializeMidi(actual)).toEqual(serializeMidi(reference))
  expect(createPianoCommands(createPlaybackTimeline(actual), 0, 120, {}))
    .toEqual(createPianoCommands(createPlaybackTimeline(reference), 0, 120, {}))
}

it.each([
  { groups: [art], target: 0, path: `${base}.@print-object` },
  { groups: ['', art], target: 1, path: `${base}[2].@print-object` },
  { groups: [art, '<ornaments><turn/></ornaments>'], target: 1, path: `${base}[2].@print-object` },
  { groups: ['<fermata/>'], target: 0, path: `${base}.@print-object` }
])('reports the lost hidden setting at its owning container without changing music: $path', ({ groups, target, path }) => {
  const xml = visibility(groups, 'no', target), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', path })
  expect(warnings[0].message).toContain(prefix)
  expect(warnings[0].message).toContain('"printObject":"no"')
  preservesProjection(xml, fixture(groups))
})

it('normalizes the existing yes-no token whitespace without changing the source', () => {
  const xml = visibility([art], ' no ')
  expect(parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith(prefix))).toHaveLength(1)
  expect(xml).toContain('print-object=" no "')
  preservesProjection(xml, fixture([art]))
})

it('keeps the actual second-part owner rather than assigning the primary part', () => {
  const first = fixture([art]), target = visibility([art]).match(/<part id="P1">[\s\S]*?<\/part>/)![0].replace('id="P1"', 'id="P2"')
  const xml = first.replace('</part-list>', '<score-part id="P2"><part-name>Piano Two</part-name></score-part></part-list>')
    .replace('</score-partwise>', target + '</score-partwise>')
  expect(parseMusicXmlWithReport(xml).report.warnings.map(w => w.path)).toEqual(['part[2].measure[1].note[1].notations.@print-object'])
  preservesProjection(xml, xml.replace(' print-object="no"', ''))
})

it('keeps the note-level hidden warning separate from the notation setting', () => {
  const xml = visibility([art]).replace('<note>', '<note print-object="no">')
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings.map(w => w.path)).toContain(`${base}.@print-object`)
  expect(warnings.map(w => w.path)).toContain('part[1].measure[1].note[1].@print-object')
  expect(warnings).toHaveLength(2)
  preservesProjection(xml, fixture([art]))
})

it.each([
  fixture([art]),
  visibility([art], 'yes'),
  visibility(['']),
  visibility(['<technical/><articulations/><ornaments/><dynamics/>']),
  visibility(['<footnote>Editorial text</footnote><level>Editorial</level>'])
])('does not invent a notation-visibility loss for defaults or an empty/non-notation container', xml => {
  expect(parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([])
})
